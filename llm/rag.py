import os
import json
import pickle
from typing import List, Dict, Any, Tuple

import pandas as pd
import numpy as np

try:
    from sentence_transformers import SentenceTransformer
except Exception:
    SentenceTransformer = None

try:
    import faiss
except Exception:
    faiss = None


class RagManager:
    def __init__(self, model_name: str = 'all-MiniLM-L6-v2'):
        if SentenceTransformer is None:
            raise RuntimeError('sentence-transformers not installed. pip install sentence-transformers')
        if faiss is None:
            raise RuntimeError('faiss not installed. pip install faiss-cpu')

        self.model = SentenceTransformer(model_name)

    def prepare_chunks(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        """Turn each row into a single text chunk and return list of dicts with id,text,meta."""
        rows = []
        for i, r in df.iterrows():
            parts = []
            req = str(r.get('requirement', '')).strip()
            if req:
                parts.append(f"Requirement: {req}")

            # enriched fields
            for col, label in [
                ('enriched_domain_tags', 'Domain'),
                ('enriched_stakeholder', 'Stakeholders'),
                ('enriched_complexity_level', 'Complexity'),
                ('enriched_action_type', 'Action'),
            ]:
                val = r.get(col, None)
                if pd.isna(val) or val is None:
                    continue
                # if it's a list-like stored as string, try to clean
                txt = val
                if isinstance(val, (list, tuple)):
                    txt = ', '.join(map(str, val))
                else:
                    txt = str(val)
                    # try to remove bracket notation
                    if txt.startswith('[') and txt.endswith(']'):
                        try:
                            parsed = json.loads(txt.replace("'", '"'))
                            if isinstance(parsed, list):
                                txt = ', '.join(parsed)
                        except Exception:
                            txt = txt.strip('[]')
                if txt:
                    parts.append(f"{label}: {txt}")

            content = "\n".join(parts)
            rows.append({
                'id': int(i),
                'text': content,
                'meta': {
                    'original_row': r.to_dict(),
                }
            })
        return rows

    def embed_texts(self, texts: List[str]) -> np.ndarray:
        """Return numpy array of embeddings."""
        embs = self.model.encode(texts, show_progress_bar=True, convert_to_numpy=True)
        # ensure 2D
        if embs.ndim == 1:
            embs = np.expand_dims(embs, 0)
        return embs.astype('float32')

    def build_faiss_index(self, embeddings: np.ndarray, index_path: str) -> Any:
        d = embeddings.shape[1]
        index = faiss.IndexFlatIP(d)
        # normalize for cosine similarity
        faiss.normalize_L2(embeddings)
        index.add(embeddings)
        faiss.write_index(index, index_path)
        return index

    def save_metadata(self, chunks: List[Dict[str, Any]], meta_path: str):
        with open(meta_path, 'wb') as f:
            pickle.dump(chunks, f)

    def load_index_and_meta(self, index_path: str, meta_path: str) -> Tuple[Any, List[Dict[str, Any]]]:
        index = faiss.read_index(index_path)
        with open(meta_path, 'rb') as f:
            chunks = pickle.load(f)
        return index, chunks

    def query(self, query_text: str, index, chunks: List[Dict[str, Any]], top_k: int = 5) -> List[Dict[str, Any]]:
        q_emb = self.embed_texts([query_text])
        faiss.normalize_L2(q_emb)
        D, I = index.search(q_emb, top_k)
        results = []
        for score, idx in zip(D[0], I[0]):
            if idx < 0 or idx >= len(chunks):
                continue
            item = chunks[int(idx)]
            results.append({'id': item['id'], 'text': item['text'], 'meta': item['meta'], 'score': float(score)})
        return results


def load_csv(path: str) -> pd.DataFrame:
    return pd.read_csv(path)


def save_index_artifacts(index_path: str, meta_path: str, chunks: List[Dict[str, Any]], embs: np.ndarray):
    # chunks should be saved already; embed matrix saved inside FAISS index
    pass


if __name__ == '__main__':
    print('Use build_faiss.py to build/run the RAG pipeline')
