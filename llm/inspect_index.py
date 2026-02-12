import pickle
import os
import sys

def inspect_index(project_id):
    meta_path = f"faiss_store/{project_id}/faiss_meta.pkl"
    
    if not os.path.exists(meta_path):
        print(f"Metadata file not found: {meta_path}")
        return

    try:
        with open(meta_path, 'rb') as f:
            metadata = pickle.load(f)
        
        print(f"--- Metadata for Project {project_id} ---")
        
        chunks = []
        if isinstance(metadata, list):
            chunks = metadata
            print(f"Format: List (Old format?)")
        elif isinstance(metadata, dict):
            chunks = metadata.get('chunks', [])
            print(f"Format: Dict (Version: {metadata.get('version', 'unknown')})")
            
        print(f"Total Chunks: {len(chunks)}")
        
        print("\n--- First 5 Chunks ---")
        for i, chunk in enumerate(chunks[:5]):
            print(f"Chunk {i}: {chunk}")
            
    except Exception as e:
        print(f"Error reading metadata: {e}")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        project_id = sys.argv[1]
    else:
        project_id = "1"
    inspect_index(project_id)
