import argparse
import os
from rag import RagManager, load_csv


def main(csv_path: str, out_dir: str, model_name: str = 'all-MiniLM-L6-v2'):
    os.makedirs(out_dir, exist_ok=True)
    df = load_csv(csv_path)
    rag = RagManager(model_name=model_name)

    chunks = rag.prepare_chunks(df)
    texts = [c['text'] for c in chunks]
    embs = rag.embed_texts(texts)

    index_path = os.path.join(out_dir, 'faiss_index.bin')
    meta_path = os.path.join(out_dir, 'faiss_meta.pkl')

    rag.build_faiss_index(embs, index_path)
    rag.save_metadata(chunks, meta_path)

    print(f'Index saved to {index_path}')
    print(f'Metadata saved to {meta_path}')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--csv', required=True, help='Path to enriched_requirements.csv')
    parser.add_argument('--out', default='faiss_store', help='Output directory for index + metadata')
    parser.add_argument('--model', default='all-MiniLM-L6-v2', help='SentenceTransformer model')
    args = parser.parse_args()
    main(args.csv, args.out, model_name=args.model)
