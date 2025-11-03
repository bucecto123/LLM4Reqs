# 🧩 Domain-Agnostic Conflict Detection

## Overview

This system detects requirement conflicts **without domain knowledge or model training**. It works on any uploaded requirements document and gradually builds a training dataset for future improvements.

## 🎯 Key Features

### ✅ No Training Required

- Uses pre-trained embeddings + LLM verification
- Works on any domain (e-commerce, healthcare, finance, etc.)
- No need for labeled training data upfront

### ✅ Efficient & Scalable

- Semantic clustering reduces LLM calls
- Batch processing within clusters
- Skips near-duplicates automatically

### ✅ Self-Improving

- Saves all detections as training data
- Builds a diverse, real-world dataset
- Can be used to train a specialized model later

## 🔧 How It Works

### 1. Embedding Generation

```python
# Uses sentence-transformers for semantic embeddings
embeddings = model.encode(requirements, normalize_embeddings=True)
```

- Model: `all-MiniLM-L6-v2` (fast, accurate)
- Normalized for cosine similarity

### 2. Semantic Clustering

```python
# HDBSCAN groups related requirements
clusterer = hdbscan.HDBSCAN(min_cluster_size=2)
clusters = clusterer.fit_predict(embeddings)
```

- Groups semantically similar requirements
- Each cluster = implicit topic (UI, security, performance, etc.)
- Skips clusters with < 2 requirements

### 3. Conflict Detection (LLM)

```python
# Check conflicts WITHIN each cluster
for cluster in clusters:
    conflicts = llm.check_conflicts(cluster_requirements)
```

- Only compares requirements within same cluster
- Batched API calls (max 30 requirements per batch)
- Structured JSON output

### 4. Optional Tagging

```python
# Zero-shot classification for metadata
tags = llm.classify(requirement)
# Example: ["Security", "Authentication", "API"]
```

- Lightweight semantic tags
- Used for filtering, not conflict logic
- Optional feature

### 5. Training Data Collection

```python
# Save every detection for future training
{
  "req_a": "...",
  "req_b": "...",
  "label": "contradiction",
  "reason": "...",
  "confidence": "high"
}
```

## 🚀 Usage

### Quick Start

```powershell
# Run the pipeline
.\run_domain_agnostic_detection.ps1
```

### Python CLI

```bash
python domain_agnostic_conflict_detector.py \
  --input data/enriched_requirements.csv \
  --text-column requirement \
  --add-tags \
  --tag-sample 10
```

### Parameters

| Parameter            | Description                    | Default                   |
| -------------------- | ------------------------------ | ------------------------- |
| `--input`            | Path to requirements CSV       | **Required**              |
| `--text-column`      | Column with requirement text   | `requirement`             |
| `--id-column`        | Column with requirement IDs    | Auto-generated            |
| `--output-dir`       | Output directory               | `data/conflict_detection` |
| `--add-tags`         | Generate semantic tags         | `False`                   |
| `--tag-sample`       | Number of requirements to tag  | `10`                      |
| `--min-cluster-size` | Minimum cluster size           | `2`                       |
| `--max-batch`        | Max requirements per LLM batch | `30`                      |

## 📊 Output Files

### 1. Conflicts CSV

```csv
req_a_id,req_b_id,req_a_text,req_b_text,reason,confidence,cluster_id,timestamp
REQ_0001,REQ_0003,"...","...","Contradictory authentication methods",high,2,2025-11-03T13:45:00
```

### 2. Requirements Metadata JSON

```json
[
  {
    "req_id": "REQ_0001",
    "text": "System must support OAuth2 authentication",
    "cluster_id": 2,
    "tags": ["Security", "Authentication", "API"]
  }
]
```

### 3. Training Dataset CSV

```csv
req1,req2,label,reason,confidence
"System must use OAuth2","System must use password-only auth",contradiction,"Contradictory auth methods",high
```

## 🔍 How Clustering Works

### Example Clusters

**Cluster 0: Authentication/Security**

- "System must support OAuth2"
- "Users must authenticate via SSO"
- "Passwords must be hashed"

**Cluster 1: Performance**

- "API response time < 200ms"
- "System must handle 10k concurrent users"
- "Database queries must use indexing"

**Cluster 2: UI/UX**

- "Interface must be mobile-responsive"
- "Dashboard must show real-time data"
- "Forms must have inline validation"

### Why This Works

1. **Reduces false positives**: Only compares related requirements
2. **Saves API costs**: No need to compare ALL pairs (O(n²) → O(c×m²) where c=clusters, m=avg cluster size)
3. **Improves accuracy**: LLM focuses on semantically related items

## 📈 Performance & Costs

### Example Dataset: 449 Requirements

| Metric                 | Value                              |
| ---------------------- | ---------------------------------- |
| **Total requirements** | 449                                |
| **Clusters found**     | ~15-25                             |
| **Avg cluster size**   | 15-30 requirements                 |
| **LLM API calls**      | ~20-30 (vs 100,530 for all pairs!) |
| **Processing time**    | 3-5 minutes                        |
| **Cost (Groq)**        | ~$0.10-0.20                        |

### Comparison: Pairwise vs Clustering

| Approach                 | API Calls  | Time      | Cost       |
| ------------------------ | ---------- | --------- | ---------- |
| **Pairwise** (all pairs) | 100,530    | 6-8 hours | $15-25     |
| **Clustering** (this)    | 20-30      | 3-5 min   | $0.10-0.20 |
| **Savings**              | **99.97%** | **~99%**  | **~99%**   |

## 🎯 Confidence Levels

The LLM assigns confidence to each detected conflict:

### High Confidence

- Direct logical contradictions
- Mutually exclusive requirements
- Example: "Must use MySQL" vs "Must use PostgreSQL"

### Medium Confidence

- Potentially conflicting implementation details
- Ambiguous requirements
- Example: "Real-time updates" vs "Batch processing only"

### Low Confidence

- Soft conflicts or trade-offs
- Requirements that might conflict in some contexts
- Example: "Must be fast" vs "Must be highly secure"

## 🔧 Optimization Rules

### 1. Near-Duplicate Removal

```python
# Skip requirements with cosine similarity > 0.95
if similarity > 0.95:
    skip_duplicate()
```

### 2. Cluster Size Handling

```python
# Split large clusters into batches
if cluster_size > 30:
    split_into_batches(max_size=30)
```

### 3. Async API Calls

```python
# Process multiple clusters concurrently
async def detect_all_conflicts():
    tasks = [check_cluster(c) for c in clusters]
    await asyncio.gather(*tasks)
```

## 🧪 Testing & Validation

### Test with Sample Data

```bash
# Test with small sample
python domain_agnostic_conflict_detector.py \
  --input test_files/sample_requirements.csv \
  --text-column requirement
```

### Validate Results

1. Check `conflicts_*.csv` for detected conflicts
2. Review confidence scores
3. Verify clustering makes sense in `requirements_metadata_*.json`

## 📚 Integration with RAG Pipeline

This can be integrated into your existing RAG system:

```python
from domain_agnostic_conflict_detector import DomainAgnosticConflictDetector

# After document upload
detector = DomainAgnosticConflictDetector()
conflicts = await detector.run(
    csv_path="uploaded_requirements.csv",
    text_column="requirement"
)

# Return conflicts to user
return {
    "conflicts": conflicts,
    "count": len(conflicts),
    "clusters": detector.requirements
}
```

## 🎓 Future Improvements

### Phase 1: Domain-Agnostic (Current)

✅ Clustering + LLM verification
✅ No training required
✅ Builds training dataset

### Phase 2: Hybrid Approach

- Train a lightweight classifier on collected data
- Use it for high-confidence predictions
- Fall back to LLM for edge cases

### Phase 3: Specialized Model

- Fine-tune DeBERTa on collected dataset
- Use for real-time conflict detection
- LLM only for explanations

## 🐛 Troubleshooting

### Issue: No clusters found

**Solution**: Lower `--min-cluster-size` parameter

```bash
--min-cluster-size 2  # Instead of 5
```

### Issue: Too many clusters

**Solution**: Adjust HDBSCAN parameters in code

```python
min_cluster_size=5  # Increase from 2
```

### Issue: LLM rate limits

**Solution**: Add delays between batches

```python
await asyncio.sleep(1)  # Add in check_conflicts_in_batch
```

### Issue: Out of memory

**Solution**: Process in chunks

```bash
# Split CSV and process separately
head -100 requirements.csv > chunk1.csv
python domain_agnostic_conflict_detector.py --input chunk1.csv
```

## 📖 References

- **HDBSCAN**: https://hdbscan.readthedocs.io/
- **Sentence Transformers**: https://www.sbert.net/
- **Groq API**: https://groq.com/

## 🤝 Contributing

To improve the system:

1. Run on your domain's requirements
2. Review detected conflicts
3. Add corrections to training data
4. Share anonymized results for model improvement

---

**Questions?** Check the main README or raise an issue!
