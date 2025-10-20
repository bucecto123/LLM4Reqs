import argparse
import os
from typing import List, Dict, Any
from rag import RagManager, load_csv


def build_index_for_project(project_id: str, chunks: List[Dict[str, Any]], 
                            base_dir: str = 'faiss_store', 
                            model_name: str = 'all-MiniLM-L6-v2') -> Dict[str, str]:
    """
    Build a FAISS index for a specific project.
    
    Args:
        project_id: Unique project identifier
        chunks: List of text chunks with metadata
        base_dir: Base directory for all indexes
        model_name: SentenceTransformer model name
        
    Returns:
        Dict with index_path and meta_path
    """
    rag = RagManager(model_name=model_name)
    index_path, meta_path = rag.get_project_paths(base_dir, project_id)
    
    # Create project directory
    os.makedirs(os.path.dirname(index_path), exist_ok=True)
    
    # Build index
    texts = [c['text'] for c in chunks]
    embs = rag.embed_texts(texts)
    rag.build_faiss_index(embs, index_path)
    rag.save_metadata(chunks, meta_path, version=1)
    
    print(f'Project {project_id} index saved to {index_path}')
    print(f'Project {project_id} metadata saved to {meta_path}')
    
    return {'index_path': index_path, 'meta_path': meta_path}


def main(csv_path: str, out_dir: str, model_name: str = 'all-MiniLM-L6-v2', project_id: str = None):
    """
    Build FAISS index from CSV file.
    
    Args:
        csv_path: Path to CSV file with requirements
        out_dir: Output directory for index files
        model_name: SentenceTransformer model name
        project_id: Optional project ID for project-specific indexing
    """
    df = load_csv(csv_path)
    rag = RagManager(model_name=model_name)
    chunks = rag.prepare_chunks(df)
    
    if project_id:
        # Build project-specific index
        build_index_for_project(project_id, chunks, out_dir, model_name)
    else:
        # Build global index (legacy mode)
        os.makedirs(out_dir, exist_ok=True)
        texts = [c['text'] for c in chunks]
        embs = rag.embed_texts(texts)
        
        index_path = os.path.join(out_dir, 'faiss_index.bin')
        meta_path = os.path.join(out_dir, 'faiss_meta.pkl')
        
        rag.build_faiss_index(embs, index_path)
        rag.save_metadata(chunks, meta_path)
        
        print(f'Index saved to {index_path}')
        print(f'Metadata saved to {meta_path}')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Build FAISS index for requirements')
    parser.add_argument('--csv', required=True, help='Path to enriched_requirements.csv')
    parser.add_argument('--out', default='faiss_store', help='Output directory for index + metadata')
    parser.add_argument('--model', default='all-MiniLM-L6-v2', help='SentenceTransformer model')
    parser.add_argument('--project-id', help='Project ID for project-specific index')
    args = parser.parse_args()
    main(args.csv, args.out, model_name=args.model, project_id=args.project_id)
