import sys
from rag import RagManager

def debug_rag(project_id, query_text):
    print(f"--- Debugging Query: '{query_text}' for Project {project_id} ---")
    
    rag = RagManager()
    index_path, meta_path = rag.get_project_paths("faiss_store/", project_id)
    
    try:
        index, chunks = rag.load_index_and_meta(index_path, meta_path)
    except Exception as e:
        print(f"Error loading index: {e}")
        return

    print("Retrieving Top 5 Chunks:")
    results = rag.query(query_text, index, chunks, top_k=5)
    
    for i, res in enumerate(results):
        print(f"\n[Rank {i+1}] Score: {res['score']:.4f}")
        print(f"ID: {res['id']}")
        print(f"Text Preview: {res['text'][:100]}...")
        # Check if actual requirement text matches
        if str(res['id']) in query_text:
            print("MATCH: ID found in query text!")

if __name__ == "__main__":
    if len(sys.argv) > 2:
        project_id = sys.argv[1]
        query = sys.argv[2]
    else:
        project_id = "1"
        query = "requirement #1"
        
    debug_rag(project_id, query)
