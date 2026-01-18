"""
Tests for domain-agnostic conflict detection functionality.
"""
import pytest
from unittest.mock import patch, MagicMock
import pandas as pd
import numpy as np
from domain_agnostic_conflict_detector import (
    DomainAgnosticConflictDetector,
    ConflictPair,
    RequirementMetadata
)


class TestConflictDetectorInitialization:
    """Test conflict detector initialization."""

    def test_init_default_params(self):
        """Test initialization with default parameters."""
        detector = DomainAgnosticConflictDetector()

        assert detector.embedding_model_name == "sentence-transformers/all-MiniLM-L6-v2"
        assert detector.llm_model == "groq/compound-mini"
        assert detector.output_dir == "data/conflict_detection"
        assert detector.min_cluster_size == 2
        assert detector.max_cluster_batch == 30
        assert detector.similarity_threshold == 0.95

    def test_init_custom_params(self):
        """Test initialization with custom parameters."""
        detector = DomainAgnosticConflictDetector(
            embedding_model="custom-model",
            llm_model="custom-llm",
            output_dir="custom_output",
            min_cluster_size=3,
            max_cluster_batch=50,
            similarity_threshold=0.90
        )

        assert detector.embedding_model_name == "custom-model"
        assert detector.llm_model == "custom-llm"
        assert detector.output_dir == "custom_output"
        assert detector.min_cluster_size == 3
        assert detector.max_cluster_batch == 50
        assert detector.similarity_threshold == 0.90


class TestRequirementLoading:
    """Test requirement loading functionality."""

    def test_load_requirements_with_ids(self, sample_requirements_csv):
        """Test loading requirements with custom ID column."""
        detector = DomainAgnosticConflictDetector()

        # Create CSV with ID column
        data = {
            'req_id': ['REQ_001', 'REQ_002', 'REQ_003'],
            'requirement': [
                'Users must login',
                'System must be fast',
                'Data must be secure'
            ]
        }
        df = pd.DataFrame(data)
        df.to_csv(sample_requirements_csv, index=False)

        ids, texts = detector.load_requirements(
            sample_requirements_csv,
            text_column='requirement',
            id_column='req_id'
        )

        assert len(ids) == 3
        assert len(texts) == 3
        assert ids == ['REQ_001', 'REQ_002', 'REQ_003']
        assert 'Users must login' in texts

    def test_load_requirements_auto_ids(self, sample_requirements_csv):
        """Test loading requirements with auto-generated IDs."""
        detector = DomainAgnosticConflictDetector()

        ids, texts = detector.load_requirements(sample_requirements_csv)

        assert len(ids) == 5  # From fixture
        assert len(texts) == 5
        assert ids[0] == 'REQ_0000'
        assert ids[1] == 'REQ_0001'


class TestEmbeddingGeneration:
    """Test embedding generation."""

    @patch('domain_agnostic_conflict_detector.SentenceTransformer')
    def test_generate_embeddings(self, mock_transformer):
        """Test embedding generation."""
        # Mock the transformer
        mock_instance = MagicMock()
        mock_instance.encode.return_value = np.random.rand(3, 384)
        mock_transformer.return_value = mock_instance

        detector = DomainAgnosticConflictDetector()
        texts = ['req1', 'req2', 'req3']

        embeddings = detector.generate_embeddings(texts)

        assert embeddings.shape == (3, 384)
        mock_instance.encode.assert_called_once_with(
            texts,
            show_progress_bar=True,
            normalize_embeddings=True
        )


class TestClustering:
    """Test requirement clustering."""

    @patch('domain_agnostic_conflict_detector.hdbscan.HDBSCAN')
    def test_cluster_requirements(self, mock_hdbscan):
        """Test HDBSCAN clustering."""
        # Mock HDBSCAN
        mock_instance = MagicMock()
        mock_instance.fit_predict.return_value = np.array([0, 0, 1, -1, -1])
        mock_hdbscan.return_value = mock_instance

        detector = DomainAgnosticConflictDetector()
        embeddings = np.random.rand(5, 384)

        cluster_labels = detector.cluster_requirements(embeddings)

        assert len(cluster_labels) == 5
        assert cluster_labels[0] == 0
        assert cluster_labels[1] == 0
        assert cluster_labels[2] == 1
        assert cluster_labels[3] == -1  # Noise

    def test_remove_near_duplicates(self):
        """Test near-duplicate removal."""
        detector = DomainAgnosticConflictDetector()
        detector.embeddings = np.array([
            [1.0, 0.0],  # req 0
            [0.99, 0.01],  # req 1 (near duplicate of 0)
            [0.0, 1.0],  # req 2
            [0.01, 0.99]  # req 3 (near duplicate of 2)
        ])

        indices = [0, 1, 2, 3]
        filtered = detector.remove_near_duplicates(indices)

        # Should keep one from each similar pair
        assert len(filtered) == 2
        assert 0 in filtered or 1 in filtered
        assert 2 in filtered or 3 in filtered


class TestConflictDetection:
    """Test conflict detection logic."""

    @patch('domain_agnostic_conflict_detector.ChatGroq')
    def test_check_conflicts_in_batch(self, mock_chatgroq):
        """Test conflict checking in a batch."""
        # Mock LLM response
        mock_instance = MagicMock()
        mock_response = MagicMock()
        mock_response.content = '''[
            {
                "req_a": "REQ_0000",
                "req_b": "REQ_0001",
                "reason": "Contradictory performance requirements",
                "confidence": "high"
            }
        ]'''
        mock_instance.invoke.return_value = mock_response
        mock_chatgroq.return_value = mock_instance

        detector = DomainAgnosticConflictDetector()
        requirements = [
            ("REQ_0000", "Must work offline"),
            ("REQ_0001", "Requires real-time sync")
        ]

        conflicts = detector.check_conflicts_in_batch(requirements, cluster_id=0)

        assert len(conflicts) == 1
        assert conflicts[0].req_a_id == "REQ_0000"
        assert conflicts[0].req_b_id == "REQ_0001"
        assert "Contradictory" in conflicts[0].reason

    @patch('domain_agnostic_conflict_detector.ChatGroq')
    def test_generate_tags(self, mock_chatgroq):
        """Test semantic tag generation."""
        mock_instance = MagicMock()
        mock_response = MagicMock()
        mock_response.content = "Security, Performance, API"
        mock_instance.invoke.return_value = mock_response
        mock_chatgroq.return_value = mock_instance

        detector = DomainAgnosticConflictDetector()
        tags = detector.generate_tags("Users must authenticate securely")

        assert len(tags) <= 3
        assert "Security" in tags

    def test_add_tags_to_requirements(self):
        """Test adding tags to requirements."""
        detector = DomainAgnosticConflictDetector()
        detector.requirements = [
            RequirementMetadata(req_id="REQ_0000", text="test req", embedding=np.array([1.0]), cluster_id=0),
            RequirementMetadata(req_id="REQ_0001", text="test req 2", embedding=np.array([1.0]), cluster_id=0)
        ]

        # Mock the generate_tags method
        detector.generate_tags = MagicMock(return_value=["Security", "API"])

        detector.add_tags_to_requirements(sample_size=2)

        assert detector.requirements[0].tags == ["Security", "API"]
        assert detector.requirements[1].tags == ["Security", "API"]


class TestIntegration:
    """Integration tests for the complete pipeline."""

    @patch('domain_agnostic_conflict_detector.SentenceTransformer')
    @patch('domain_agnostic_conflict_detector.hdbscan.HDBSCAN')
    @patch('domain_agnostic_conflict_detector.ChatGroq')
    def test_run_pipeline(self, mock_chatgroq, mock_hdbscan, mock_transformer, sample_requirements_csv):
        """Test the complete conflict detection pipeline."""
        # Mock dependencies
        mock_transformer_instance = MagicMock()
        mock_transformer_instance.encode.return_value = np.random.rand(5, 384)
        mock_transformer.return_value = mock_transformer_instance

        mock_hdbscan_instance = MagicMock()
        mock_hdbscan_instance.fit_predict.return_value = np.array([0, 0, 1, 1, -1])
        mock_hdbscan.return_value = mock_hdbscan_instance

        mock_llm_instance = MagicMock()
        mock_response = MagicMock()
        mock_response.content = '[]'  # No conflicts
        mock_llm_instance.invoke.return_value = mock_response
        mock_chatgroq.return_value = mock_llm_instance

        detector = DomainAgnosticConflictDetector()

        # This would normally be async, but we'll test the components
        ids, texts = detector.load_requirements(sample_requirements_csv)
        embeddings = detector.generate_embeddings(texts)
        cluster_labels = detector.cluster_requirements(embeddings)

        assert len(ids) == 5
        assert embeddings.shape[0] == 5
        assert len(cluster_labels) == 5

        # Check that requirements were created
        assert len(detector.requirements) == 0  # Not set yet in this test

    def test_conflict_pair_creation(self):
        """Test ConflictPair dataclass."""
        conflict = ConflictPair(
            req_a_id="REQ_0001",
            req_b_id="REQ_0002",
            req_a_text="Must be fast",
            req_b_text="Must be cheap",
            reason="Speed vs cost tradeoff",
            confidence="high",
            cluster_id=1,
            timestamp="2024-01-01T00:00:00"
        )

        assert conflict.req_a_id == "REQ_0001"
        assert conflict.confidence == "high"
        assert conflict.cluster_id == 1

    def test_requirement_metadata(self):
        """Test RequirementMetadata dataclass."""
        embedding = np.array([0.1, 0.2, 0.3])
        req = RequirementMetadata(
            req_id="REQ_0001",
            text="Sample requirement",
            embedding=embedding,
            cluster_id=2,
            tags=["Security", "API"]
        )

        assert req.req_id == "REQ_0001"
        assert req.cluster_id == 2
        assert len(req.tags) == 2

        # Test to_dict (should exclude embedding)
        data = req.to_dict()
        assert "req_id" in data
        assert "text" in data
        assert "embedding" not in data
        assert data["tags"] == ["Security", "API"]