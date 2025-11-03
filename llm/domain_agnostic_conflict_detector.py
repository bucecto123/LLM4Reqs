"""
domain_agnostic_conflict_detector.py
Domain-agnostic conflict detection using semantic clustering + LLM verification.
No training required - works on any uploaded requirements document.
"""

import pandas as pd
import numpy as np
import os
import json
from datetime import datetime
from typing import List, Dict, Tuple, Optional
import asyncio
from dataclasses import dataclass, asdict
import warnings
warnings.filterwarnings('ignore')

# Embedding and clustering
from sentence_transformers import SentenceTransformer
import hdbscan
from sklearn.preprocessing import normalize
from sklearn.metrics.pairwise import cosine_similarity

# LLM
from groq import Groq
from dotenv import load_dotenv

# Progress tracking
from tqdm import tqdm


@dataclass
class ConflictPair:
    """Represents a detected conflict between two requirements."""
    req_a_id: str
    req_b_id: str
    req_a_text: str
    req_b_text: str
    reason: str
    confidence: str  # high, medium, low
    cluster_id: int
    timestamp: str


@dataclass
class RequirementMetadata:
    """Metadata for a requirement."""
    req_id: str
    text: str
    embedding: np.ndarray
    cluster_id: int
    tags: List[str] = None
    
    def to_dict(self):
        """Convert to dict, excluding embedding."""
        return {
            'req_id': self.req_id,
            'text': self.text,
            'cluster_id': self.cluster_id,
            'tags': self.tags or []
        }


class DomainAgnosticConflictDetector:
    """
    Detects conflicts in requirements without domain knowledge or fine-tuning.
    Uses semantic clustering + LLM-based verification.
    """
    
    def __init__(
        self,
        embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2",
        llm_model: str = "groq/compound-mini",
        output_dir: str = "data/conflict_detection",
        min_cluster_size: int = 2,
        max_cluster_batch: int = 30,
        similarity_threshold: float = 0.95,
    ):
        """
        Initialize the conflict detector.
        
        Args:
            embedding_model: Sentence transformer model for embeddings
            llm_model: Groq LLM model for conflict verification
            output_dir: Directory to save results and training data
            min_cluster_size: Minimum requirements in a cluster to check
            max_cluster_batch: Maximum requirements per LLM batch
            similarity_threshold: Threshold to skip near-duplicates
        """
        load_dotenv()
        
        self.embedding_model_name = embedding_model
        self.llm_model = llm_model
        self.output_dir = output_dir
        self.min_cluster_size = min_cluster_size
        self.max_cluster_batch = max_cluster_batch
        self.similarity_threshold = similarity_threshold
        
        # Initialize models
        print(f"🔧 Loading embedding model: {embedding_model}")
        self.embedding_model = SentenceTransformer(embedding_model)
        
        print(f"🔧 Initializing LLM client: {llm_model}")
        self.llm_client = Groq(api_key=os.getenv("GROQ_API_KEY"))
        
        # Storage
        self.requirements: List[RequirementMetadata] = []
        self.conflicts: List[ConflictPair] = []
        self.embeddings: np.ndarray = None
        
        # Create output directory
        os.makedirs(output_dir, exist_ok=True)
        
    def load_requirements(self, csv_path: str, text_column: str = "requirement", id_column: str = None):
        """
        Load requirements from CSV.
        
        Args:
            csv_path: Path to CSV file
            text_column: Column containing requirement text
            id_column: Column containing requirement ID (optional)
        """
        print(f"\n📂 Loading requirements from {csv_path}")
        df = pd.read_csv(csv_path)
        
        if text_column not in df.columns:
            raise ValueError(f"Column '{text_column}' not found in CSV")
        
        # Generate IDs if not provided
        if id_column and id_column in df.columns:
            ids = df[id_column].astype(str).tolist()
        else:
            ids = [f"REQ_{i:04d}" for i in range(len(df))]
        
        texts = df[text_column].astype(str).tolist()
        
        print(f"✅ Loaded {len(texts)} requirements")
        return ids, texts
    
    def generate_embeddings(self, texts: List[str]) -> np.ndarray:
        """Generate and normalize embeddings for requirements."""
        print(f"\n🧮 Generating embeddings for {len(texts)} requirements...")
        
        embeddings = self.embedding_model.encode(
            texts,
            show_progress_bar=True,
            normalize_embeddings=True,  # L2 normalization for cosine similarity
        )
        
        print(f"✅ Generated embeddings: shape {embeddings.shape}")
        return embeddings
    
    def cluster_requirements(self, embeddings: np.ndarray) -> np.ndarray:
        """
        Cluster requirements using HDBSCAN.
        
        Args:
            embeddings: Normalized requirement embeddings
            
        Returns:
            Cluster labels (-1 = noise/outliers)
        """
        print(f"\n🔍 Clustering {len(embeddings)} requirements...")
        
        clusterer = hdbscan.HDBSCAN(
            min_cluster_size=self.min_cluster_size,
            min_samples=1,  # More lenient - allows single points to join clusters
            metric='euclidean',
            cluster_selection_method='eom',
            prediction_data=True,
            allow_single_cluster=False
        )
        
        cluster_labels = clusterer.fit_predict(embeddings)
        
        n_clusters = len(set(cluster_labels)) - (1 if -1 in cluster_labels else 0)
        n_noise = list(cluster_labels).count(-1)
        noise_pct = (n_noise / len(embeddings)) * 100
        
        print(f"✅ Found {n_clusters} clusters")
        print(f"   📊 Noise/outliers: {n_noise} requirements ({noise_pct:.1f}%)")
        
        # If too many noise points (>30%), try reassigning them to nearest clusters
        if noise_pct > 30 and n_clusters > 0:
            print(f"   ⚠️  High noise percentage - reassigning outliers to nearest clusters...")
            cluster_labels = self._reassign_noise_points(embeddings, cluster_labels)
            
            n_noise_after = list(cluster_labels).count(-1)
            noise_pct_after = (n_noise_after / len(embeddings)) * 100
            print(f"   ✅ Reduced noise to {n_noise_after} requirements ({noise_pct_after:.1f}%)")
        
        # Print cluster sizes
        cluster_sizes = pd.Series(cluster_labels).value_counts().sort_index()
        print(f"\n📊 Cluster Distribution:")
        for cluster_id, size in cluster_sizes.items():
            if cluster_id != -1:
                print(f"   Cluster {cluster_id}: {size} requirements")
        
        return cluster_labels
    
    def _reassign_noise_points(self, embeddings: np.ndarray, cluster_labels: np.ndarray) -> np.ndarray:
        """
        Reassign noise points (-1) to their nearest cluster.
        
        Args:
            embeddings: Requirement embeddings
            cluster_labels: Current cluster assignments
            
        Returns:
            Updated cluster labels with fewer noise points
        """
        from sklearn.metrics.pairwise import cosine_similarity
        
        # Get noise point indices
        noise_indices = np.where(cluster_labels == -1)[0]
        if len(noise_indices) == 0:
            return cluster_labels
        
        # Get clustered point indices
        clustered_indices = np.where(cluster_labels != -1)[0]
        if len(clustered_indices) == 0:
            return cluster_labels
        
        # Calculate similarity between noise points and clustered points
        noise_embeddings = embeddings[noise_indices]
        clustered_embeddings = embeddings[clustered_indices]
        
        similarities = cosine_similarity(noise_embeddings, clustered_embeddings)
        
        # Assign each noise point to cluster of its nearest neighbor
        # Use higher threshold (0.65) - only reassign if CLEARLY similar
        updated_labels = cluster_labels.copy()
        reassigned_count = 0
        
        for i, noise_idx in enumerate(noise_indices):
            # Find most similar clustered requirement
            most_similar_idx = np.argmax(similarities[i])
            max_similarity = similarities[i, most_similar_idx]
            
            # Only reassign if similarity is strong (> 0.65)
            # Lower similarity means it's truly unique and should remain noise
            if max_similarity > 0.65:
                nearest_cluster = cluster_labels[clustered_indices[most_similar_idx]]
                updated_labels[noise_idx] = nearest_cluster
                reassigned_count += 1
        
        print(f"   📌 Reassigned {reassigned_count}/{len(noise_indices)} outliers (kept {len(noise_indices) - reassigned_count} as truly unique)")
        
        return updated_labels
    
    def remove_near_duplicates(self, req_indices: List[int]) -> List[int]:
        """
        Remove near-duplicate requirements from a cluster.
        
        Args:
            req_indices: List of requirement indices in cluster
            
        Returns:
            Filtered list without near-duplicates
        """
        if len(req_indices) <= 1:
            return req_indices
        
        cluster_embeddings = self.embeddings[req_indices]
        sim_matrix = cosine_similarity(cluster_embeddings)
        
        # Keep track of which requirements to keep
        to_keep = set(range(len(req_indices)))
        
        for i in range(len(req_indices)):
            for j in range(i + 1, len(req_indices)):
                if sim_matrix[i, j] > self.similarity_threshold:
                    # Remove j (keep first occurrence)
                    to_keep.discard(j)
        
        filtered_indices = [req_indices[i] for i in sorted(to_keep)]
        removed = len(req_indices) - len(filtered_indices)
        
        if removed > 0:
            print(f"   ⚠️  Removed {removed} near-duplicate(s)")
        
        return filtered_indices
    
    async def check_conflicts_in_batch(
        self,
        requirements: List[Tuple[str, str]],
        cluster_id: int
    ) -> List[ConflictPair]:
        """
        Use LLM to check for conflicts in a batch of requirements.
        
        Args:
            requirements: List of (req_id, req_text) tuples
            cluster_id: Cluster ID for tracking
            
        Returns:
            List of detected conflicts
        """
        if len(requirements) < 2:
            return []
        
        # Build structured prompt
        req_list = "\n".join([
            f"{i+1}. [{req_id}] {text}"
            for i, (req_id, text) in enumerate(requirements)
        ])
        
        prompt = f"""You are analyzing requirements for logical conflicts.

Requirements to analyze:
{req_list}

Task: Identify any pairs of requirements that CANNOT both be true or would create a logical contradiction.

Return your analysis as a JSON array. For each conflict found, include:
- req_a: ID of first requirement (e.g., "REQ_0001")
- req_b: ID of second requirement
- reason: Brief explanation of the conflict
- confidence: "high", "medium", or "low"

If no conflicts exist, return an empty array: []

Response format:
[
  {{"req_a": "REQ_0001", "req_b": "REQ_0003", "reason": "...", "confidence": "high"}},
  ...
]

JSON output only:"""

        try:
            response = self.llm_client.chat.completions.create(
                model=self.llm_model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3,
                max_tokens=2000,
            )
            
            response_text = response.choices[0].message.content.strip()
            
            # Extract JSON
            if "```json" in response_text:
                response_text = response_text.split("```json")[1].split("```")[0].strip()
            elif "```" in response_text:
                response_text = response_text.split("```")[1].split("```")[0].strip()
            
            conflicts_data = json.loads(response_text)
            
            # Create ConflictPair objects
            conflicts = []
            req_map = {req_id: text for req_id, text in requirements}
            
            for conflict in conflicts_data:
                if all(k in conflict for k in ['req_a', 'req_b', 'reason', 'confidence']):
                    conflicts.append(ConflictPair(
                        req_a_id=conflict['req_a'],
                        req_b_id=conflict['req_b'],
                        req_a_text=req_map.get(conflict['req_a'], ''),
                        req_b_text=req_map.get(conflict['req_b'], ''),
                        reason=conflict['reason'],
                        confidence=conflict['confidence'],
                        cluster_id=cluster_id,
                        timestamp=datetime.now().isoformat()
                    ))
            
            return conflicts
            
        except json.JSONDecodeError as e:
            print(f"   ⚠️  JSON parsing error: {e}")
            print(f"   Response: {response_text[:200]}...")
            return []
        except Exception as e:
            print(f"   ⚠️  Error checking batch: {e}")
            return []
    
    def split_into_batches(self, items: List, batch_size: int) -> List[List]:
        """Split a list into batches."""
        return [items[i:i + batch_size] for i in range(0, len(items), batch_size)]
    
    async def detect_conflicts_in_cluster(
        self,
        cluster_id: int,
        req_indices: List[int]
    ) -> List[ConflictPair]:
        """
        Detect conflicts within a cluster.
        
        Args:
            cluster_id: Cluster ID
            req_indices: Indices of requirements in this cluster
            
        Returns:
            List of detected conflicts
        """
        # Remove near-duplicates
        req_indices = self.remove_near_duplicates(req_indices)
        
        if len(req_indices) < 2:
            print(f"   ⏭️  Skipping cluster {cluster_id}: < 2 unique requirements")
            return []
        
        # Get requirements
        requirements = [
            (self.requirements[i].req_id, self.requirements[i].text)
            for i in req_indices
        ]
        
        print(f"   🔍 Checking cluster {cluster_id}: {len(requirements)} requirements")
        
        # Split into batches if too large
        if len(requirements) <= self.max_cluster_batch:
            return await self.check_conflicts_in_batch(requirements, cluster_id)
        else:
            # Split large cluster into batches
            batches = self.split_into_batches(requirements, self.max_cluster_batch)
            print(f"   📦 Split into {len(batches)} batches")
            
            all_conflicts = []
            for batch_idx, batch in enumerate(batches, 1):
                print(f"      Batch {batch_idx}/{len(batches)}")
                conflicts = await self.check_conflicts_in_batch(batch, cluster_id)
                all_conflicts.extend(conflicts)
            
            return all_conflicts
    
    async def detect_all_conflicts(self):
        """Detect conflicts across all clusters."""
        print(f"\n🔍 Starting conflict detection across clusters...")
        
        cluster_labels = np.array([req.cluster_id for req in self.requirements])
        unique_clusters = sorted(set(cluster_labels))
        
        # Skip noise cluster (-1) - these are truly unique requirements unlikely to conflict
        noise_count = list(cluster_labels).count(-1)
        if noise_count > 0:
            print(f"   ⏭️  Skipping {noise_count} noise/outlier requirements (semantically isolated)")
        
        unique_clusters = [c for c in unique_clusters if c != -1]
        
        all_conflicts = []
        
        for cluster_id in tqdm(unique_clusters, desc="Processing clusters"):
            cluster_indices = np.where(cluster_labels == cluster_id)[0].tolist()
            
            if len(cluster_indices) >= self.min_cluster_size:
                conflicts = await self.detect_conflicts_in_cluster(cluster_id, cluster_indices)
                all_conflicts.extend(conflicts)
            else:
                print(f"   ⏭️  Skipping cluster {cluster_id}: only {len(cluster_indices)} requirement(s)")
        
        self.conflicts = all_conflicts
        print(f"\n✅ Conflict detection complete!")
        print(f"   📊 Found {len(all_conflicts)} conflicts across {len(unique_clusters)} clusters")
        
        return all_conflicts
    
    def generate_tags(self, text: str) -> List[str]:
        """
        Generate semantic tags for a requirement using LLM.
        
        Args:
            text: Requirement text
            
        Returns:
            List of tags
        """
        prompt = f"""Classify this software requirement into relevant categories.

Requirement: "{text}"

Return 1-3 tags from: Security, Performance, UI, UX, Database, API, Authentication, Authorization, Scalability, Reliability, Testing, Documentation, Deployment, Integration, Functionality, Usability, Accessibility, Compatibility, Maintainability

Response format (comma-separated): Security, Performance, API"""

        try:
            response = self.llm_client.chat.completions.create(
                model=self.llm_model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.2,
                max_tokens=50,
            )
            
            tags_text = response.choices[0].message.content.strip()
            tags = [tag.strip() for tag in tags_text.split(',')]
            return tags[:3]  # Limit to 3 tags
            
        except Exception as e:
            print(f"   ⚠️  Error generating tags: {e}")
            return []
    
    def add_tags_to_requirements(self, sample_size: int = 10):
        """
        Add semantic tags to a sample of requirements.
        
        Args:
            sample_size: Number of requirements to tag (for demo/testing)
        """
        print(f"\n🏷️  Generating tags for {sample_size} sample requirements...")
        
        sample_reqs = self.requirements[:sample_size]
        
        for req in tqdm(sample_reqs, desc="Tagging"):
            req.tags = self.generate_tags(req.text)
        
        print(f"✅ Tags generated")
    
    def save_results(self):
        """Save all results to disk."""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # Save conflicts
        if self.conflicts:
            conflicts_df = pd.DataFrame([asdict(c) for c in self.conflicts])
            conflicts_path = f"{self.output_dir}/conflicts_{timestamp}.csv"
            conflicts_df.to_csv(conflicts_path, index=False)
            print(f"\n💾 Saved conflicts to: {conflicts_path}")
        
        # Save requirement metadata
        metadata_path = f"{self.output_dir}/requirements_metadata_{timestamp}.json"
        metadata = [req.to_dict() for req in self.requirements]
        with open(metadata_path, 'w', encoding='utf-8') as f:
            json.dump(metadata, f, indent=2, ensure_ascii=False)
        print(f"💾 Saved metadata to: {metadata_path}")
        
        # Save training dataset (for future fine-tuning)
        if self.conflicts:
            training_data = []
            for conflict in self.conflicts:
                training_data.append({
                    'req1': conflict.req_a_text,
                    'req2': conflict.req_b_text,
                    'label': 'contradiction',
                    'reason': conflict.reason,
                    'confidence': conflict.confidence,
                })
            
            training_path = f"{self.output_dir}/training_data_{timestamp}.csv"
            pd.DataFrame(training_data).to_csv(training_path, index=False)
            print(f"💾 Saved training data to: {training_path}")
    
    def print_summary(self):
        """Print summary of results."""
        print("\n" + "="*60)
        print("📊 CONFLICT DETECTION SUMMARY")
        print("="*60)
        
        print(f"\n📈 Statistics:")
        print(f"   Total requirements: {len(self.requirements)}")
        print(f"   Total conflicts found: {len(self.conflicts)}")
        
        if self.conflicts:
            # Conflicts by cluster
            cluster_counts = pd.Series([c.cluster_id for c in self.conflicts]).value_counts()
            print(f"\n📊 Conflicts by cluster:")
            for cluster_id, count in cluster_counts.items():
                print(f"   Cluster {cluster_id}: {count} conflicts")
            
            # Confidence distribution
            confidence_counts = pd.Series([c.confidence for c in self.conflicts]).value_counts()
            print(f"\n🎯 Confidence distribution:")
            for conf, count in confidence_counts.items():
                print(f"   {conf.capitalize()}: {count} conflicts")
            
            # Sample conflicts
            print(f"\n📋 Sample conflicts:")
            for i, conflict in enumerate(self.conflicts[:3], 1):
                print(f"\n{i}. {conflict.req_a_id} ↔ {conflict.req_b_id} (Confidence: {conflict.confidence})")
                print(f"   A: {conflict.req_a_text[:80]}...")
                print(f"   B: {conflict.req_b_text[:80]}...")
                print(f"   Reason: {conflict.reason}")
    
    async def run(
        self,
        csv_path: str,
        text_column: str = "requirement",
        id_column: str = None,
        add_tags: bool = False,
        tag_sample_size: int = 10
    ):
        """
        Run the complete conflict detection pipeline.
        
        Args:
            csv_path: Path to requirements CSV
            text_column: Column containing requirement text
            id_column: Column containing requirement IDs
            add_tags: Whether to generate semantic tags
            tag_sample_size: Number of requirements to tag
        """
        print("\n🚀 Starting Domain-Agnostic Conflict Detection Pipeline")
        print("="*60)
        
        # Step 1: Load requirements
        ids, texts = self.load_requirements(csv_path, text_column, id_column)
        
        # Step 2: Generate embeddings
        self.embeddings = self.generate_embeddings(texts)
        
        # Step 3: Cluster requirements
        cluster_labels = self.cluster_requirements(self.embeddings)
        
        # Create requirement metadata objects
        for i, (req_id, text, cluster_id) in enumerate(zip(ids, texts, cluster_labels)):
            self.requirements.append(RequirementMetadata(
                req_id=req_id,
                text=text,
                embedding=self.embeddings[i],
                cluster_id=int(cluster_id),
                tags=None
            ))
        
        # Step 4: Detect conflicts
        await self.detect_all_conflicts()
        
        # Step 5: Optional tagging
        if add_tags:
            self.add_tags_to_requirements(tag_sample_size)
        
        # Step 6: Save results
        self.save_results()
        
        # Step 7: Print summary
        self.print_summary()
        
        print("\n✨ Pipeline complete!")


async def main():
    """Example usage."""
    import argparse
    
    parser = argparse.ArgumentParser(description="Domain-agnostic conflict detection")
    parser.add_argument("--input", required=True, help="Path to requirements CSV")
    parser.add_argument("--text-column", default="requirement", help="Column with requirement text")
    parser.add_argument("--id-column", default=None, help="Column with requirement IDs")
    parser.add_argument("--output-dir", default="data/conflict_detection", help="Output directory")
    parser.add_argument("--add-tags", action="store_true", help="Generate semantic tags")
    parser.add_argument("--tag-sample", type=int, default=10, help="Number of requirements to tag")
    parser.add_argument("--min-cluster-size", type=int, default=2, help="Minimum cluster size")
    parser.add_argument("--max-batch", type=int, default=30, help="Max requirements per LLM batch")
    
    args = parser.parse_args()
    
    # Initialize detector
    detector = DomainAgnosticConflictDetector(
        output_dir=args.output_dir,
        min_cluster_size=args.min_cluster_size,
        max_cluster_batch=args.max_batch,
    )
    
    # Run pipeline
    await detector.run(
        csv_path=args.input,
        text_column=args.text_column,
        id_column=args.id_column,
        add_tags=args.add_tags,
        tag_sample_size=args.tag_sample,
    )


if __name__ == "__main__":
    asyncio.run(main())
