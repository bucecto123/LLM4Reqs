"""
Extract requirements from Word document and convert to CSV for conflict detection.
"""
import pandas as pd
from docx import Document
import re
import sys
import os

def extract_requirements_from_docx(docx_path):
    """
    Extract requirements from a Word document.
    Assumes each paragraph is a requirement or uses numbered lists.
    """
    print(f"📄 Reading document: {docx_path}")
    doc = Document(docx_path)
    
    requirements = []
    req_id = 1
    
    for para in doc.paragraphs:
        text = para.text.strip()
        
        # Skip empty paragraphs
        if not text:
            continue
        
        # Skip headings (too short or all caps)
        if len(text) < 20 or text.isupper():
            print(f"   ⏭️  Skipping heading: {text[:50]}...")
            continue
        
        # Clean up the text
        # Remove numbered list markers (1. 2. 1) 2) etc.)
        cleaned_text = re.sub(r'^\d+[\.\)]\s*', '', text)
        
        # Skip if still too short after cleaning
        if len(cleaned_text) < 15:
            continue
        
        requirements.append({
            'id': f'REQ_{req_id:04d}',
            'requirement': cleaned_text
        })
        req_id += 1
    
    print(f"✅ Extracted {len(requirements)} requirements")
    return requirements

def save_to_csv(requirements, output_path):
    """Save requirements to CSV."""
    df = pd.DataFrame(requirements)
    df.to_csv(output_path, index=False, encoding='utf-8')
    print(f"💾 Saved to: {output_path}")
    
    # Print preview
    print(f"\n📋 Preview (first 3 requirements):")
    for i, row in df.head(3).iterrows():
        print(f"\n{row['id']}:")
        print(f"  {row['requirement'][:100]}...")

if __name__ == "__main__":
    # Input and output paths
    docx_path = "../conflict/test 1.docx"
    output_path = "data/test1_requirements.csv"
    
    # Create data directory if needed
    os.makedirs("data", exist_ok=True)
    
    # Extract and save
    print("\n🚀 Extracting requirements from Word document")
    print("="*60)
    
    requirements = extract_requirements_from_docx(docx_path)
    
    if requirements:
        save_to_csv(requirements, output_path)
        print(f"\n✨ Complete! Ready for conflict detection.")
        print(f"\nNext step:")
        print(f"  python domain_agnostic_conflict_detector.py \\")
        print(f"    --input {output_path} \\")
        print(f"    --text-column requirement \\")
        print(f"    --id-column id")
    else:
        print("❌ No requirements found in document")
