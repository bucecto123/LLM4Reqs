import os
import json
import pickle
from typing import List, Dict, Any, Tuple, Optional
from datetime import datetime
import threading

import pandas as pd
import numpy as np
import hashlib
import logging

try:
    from sentence_transformers import SentenceTransformer
except Exception:
    SentenceTransformer = None

try:
    import faiss
except Exception:
    faiss = None

# Thread lock for safe concurrent access to FAISS indexes
_index_locks = {}
_locks_lock = threading.Lock()


def get_project_lock(project_id: str) -> threading.Lock:
    """Get or create a lock for a specific project."""
    with _locks_lock:
        if project_id not in _index_locks:
            _index_locks[project_id] = threading.Lock()
        return _index_locks[project_id]


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
        os.makedirs(os.path.dirname(index_path), exist_ok=True)
        faiss.write_index(index, index_path)
        return index

    def save_metadata(self, chunks: List[Dict[str, Any]], meta_path: str, version: int = 1):
        """Save chunks metadata with version info."""
        os.makedirs(os.path.dirname(meta_path), exist_ok=True)
        metadata = {
            'version': version,
            'chunks': chunks,
            'last_updated': datetime.utcnow().isoformat(),
            'total_chunks': len(chunks)
        }
        with open(meta_path, 'wb') as f:
            pickle.dump(metadata, f)

    def load_index_and_meta(self, index_path: str, meta_path: str) -> Tuple[Any, List[Dict[str, Any]]]:
        """Load index and metadata. Returns (index, chunks)."""
        if not os.path.exists(index_path) or not os.path.exists(meta_path):
            raise FileNotFoundError(f"Index or metadata file not found: {index_path}, {meta_path}")
        
        index = faiss.read_index(index_path)
        with open(meta_path, 'rb') as f:
            metadata = pickle.load(f)
        
        # Handle both old format (list) and new format (dict with version)
        if isinstance(metadata, list):
            chunks = metadata
        else:
            chunks = metadata.get('chunks', [])
        
        return index, chunks

    def incremental_add(self, index_path: str, meta_path: str, new_chunks: List[Dict[str, Any]], 
                        project_id: Optional[str] = None) -> Tuple[Any, List[Dict[str, Any]]]:
        """
        Add new chunks to an existing index incrementally.
        
        Args:
            index_path: Path to existing FAISS index
            meta_path: Path to existing metadata file
            new_chunks: New chunks to add
            project_id: Optional project ID for locking
            
        Returns:
            Updated (index, chunks)
        """
        lock = get_project_lock(project_id or "default")
        
        with lock:
            # Load existing index and metadata
            try:
                index, existing_chunks = self.load_index_and_meta(index_path, meta_path)
            except FileNotFoundError:
                # If no existing index, create new one
                return self._build_new_index(index_path, meta_path, new_chunks)
            
            # Build fast lookup sets to deduplicate by stable metadata (requirement_id) and by text hash
            logger = logging.getLogger(__name__)

            existing_req_ids = set()
            existing_text_hashes = set()
            for c in existing_chunks:
                try:
                    meta = c.get('meta', {}) or {}
                    rid = meta.get('requirement_id') or meta.get('req_id') or meta.get('requirement')
                    if rid is not None:
                        existing_req_ids.add(str(rid))
                    # compute text hash
                    th = hashlib.sha256((c.get('text') or '').encode('utf-8')).hexdigest()
                    existing_text_hashes.add(th)
                except Exception:
                    continue

            # Filter out duplicates from new_chunks
            chunks_to_add = []
            for chunk in new_chunks:
                try:
                    meta = chunk.get('meta', {}) or {}
                    rid = meta.get('requirement_id') or meta.get('req_id') or meta.get('requirement')
                    text = chunk.get('text') or ''
                    th = hashlib.sha256(text.encode('utf-8')).hexdigest()

                    if rid is not None and str(rid) in existing_req_ids:
                        logger.info(f"Skipping duplicate chunk with requirement_id={rid}")
                        continue
                    if th in existing_text_hashes:
                        logger.info("Skipping duplicate chunk based on text hash")
                        continue

                    chunks_to_add.append(chunk)
                except Exception:
                    # If any error occurs in checking, conservatively add the chunk
                    chunks_to_add.append(chunk)

            if not chunks_to_add:
                logger.info('No new unique chunks to add; skipping incremental update')
                return index, existing_chunks

            # Generate embeddings only for chunks we're actually adding
            new_texts = [c['text'] for c in chunks_to_add]
            new_embeddings = self.embed_texts(new_texts)

            # Normalize and add to index
            faiss.normalize_L2(new_embeddings)
            index.add(new_embeddings)

            # Update chunk IDs to avoid conflicts
            max_existing_id = max([c.get('id', 0) for c in existing_chunks], default=-1)
            for i, chunk in enumerate(chunks_to_add):
                chunk['id'] = max_existing_id + i + 1

            # Merge chunks
            updated_chunks = existing_chunks + chunks_to_add
            
            # Save updated index and metadata
            faiss.write_index(index, index_path)

            # Load old metadata to get version
            with open(meta_path, 'rb') as f:
                old_metadata = pickle.load(f)
            old_version = old_metadata.get('version', 1) if isinstance(old_metadata, dict) else 1

            new_version = old_version + 1
            self.save_metadata(updated_chunks, meta_path, version=new_version)

            added_count = len(chunks_to_add)
            skipped_count = len(new_chunks) - added_count

            return index, updated_chunks, added_count, skipped_count, new_version

    def _build_new_index(self, index_path: str, meta_path: str, chunks: List[Dict[str, Any]]) -> Tuple[Any, List[Dict[str, Any]]]:
        """Build a new index from scratch."""
        texts = [c['text'] for c in chunks]
        embeddings = self.embed_texts(texts)
        index = self.build_faiss_index(embeddings, index_path)
        self.save_metadata(chunks, meta_path, version=1)
        added_count = len(chunks)
        skipped_count = 0
        return index, chunks, added_count, skipped_count, 1

    def get_project_paths(self, base_dir: str, project_id: str) -> Tuple[str, str]:
        """Get the index and metadata paths for a project."""
        project_dir = os.path.join(base_dir, str(project_id))
        index_path = os.path.join(project_dir, 'faiss_index.bin')
        meta_path = os.path.join(project_dir, 'faiss_meta.pkl')
        return index_path, meta_path

    def get_kb_status(self, index_path: str, meta_path: str) -> Dict[str, Any]:
        """Get knowledge base status information."""
        status = {
            'exists': False,
            'version': 0,
            'last_built_at': None,
            'total_chunks': 0,
            'error': None
        }
        
        try:
            if os.path.exists(index_path) and os.path.exists(meta_path):
                status['exists'] = True
                
                with open(meta_path, 'rb') as f:
                    metadata = pickle.load(f)
                
                if isinstance(metadata, dict):
                    status['version'] = metadata.get('version', 1)
                    status['last_built_at'] = metadata.get('last_updated')
                    status['total_chunks'] = metadata.get('total_chunks', len(metadata.get('chunks', [])))
                else:
                    # Old format
                    status['version'] = 1
                    status['total_chunks'] = len(metadata)
                    status['last_built_at'] = datetime.fromtimestamp(
                        os.path.getmtime(meta_path)
                    ).isoformat()
        except Exception as e:
            status['error'] = str(e)
        
        return status

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
