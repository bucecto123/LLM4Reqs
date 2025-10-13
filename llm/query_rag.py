import os
import argparse
import pickle
from rag import RagManager


def load_index_and_meta(index_path: str, meta_path: str, model_name: str = 'all-MiniLM-L6-v2'):
    rag = RagManager(model_name=model_name)
    index, chunks = rag.load_index_and_meta(index_path, meta_path)
    return rag, index, chunks


def build_prompt(retrieved: list, user_query: str) -> str:
    lines = [
        "You are a helpful software requirements analyst.",
        "Use the following relevant requirements to answer the question:\n",
    ]
    for i, item in enumerate(retrieved, start=1):
        lines.append(f"{i}. {item['text']}")
    lines.append('\nQuestion: ' + user_query)
    return '\n'.join(lines)


def main(args):
    rag, index, chunks = load_index_and_meta(args.index, args.meta, model_name=args.model)
    results = rag.query(args.query, index, chunks, top_k=args.top_k)

    print('Retrieved:')
    for r in results:
        print(f"- id={r['id']} score={r['score']:.4f}\n  {r['text']}\n")

    prompt = build_prompt(results, args.query)
    print('\n--- LLM Prompt ---\n')
    print(prompt)

    if os.getenv("GROQ_API_KEY"):
        print('\nGROQ_API_KEY detected. You can call your LLM with this prompt via the local FastAPI service or Groq client.')
    else:
        print('\nNo GROQ_API_KEY found. Export GROQ_API_KEY to call the Groq API or use your local LLM.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--index', default='llm/faiss_store/faiss_index.bin', help='Path to faiss index')
    parser.add_argument('--meta', default='llm/faiss_store/faiss_meta.pkl', help='Path to metadata pickle')
    parser.add_argument('--query', required=True, help='User query')
    parser.add_argument('--top-k', type=int, default=5, help='Number of neighbors')
    parser.add_argument('--model', default='all-MiniLM-L6-v2', help='SentenceTransformer model name')
    args = parser.parse_args()
    main(args)
