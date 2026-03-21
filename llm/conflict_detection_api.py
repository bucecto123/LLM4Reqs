"""
conflict_detection_api.py
Thin test helper — imports models and logic from main.py.

Real routing uses main.py's /api/conflicts/detect endpoint.
This module exists only for standalone testing of the conflict detection
logic without starting the full application.
"""

# Re-export shared types from main for use in tests
try:
    from main import (
        ConflictDetectionRequest,
        ConflictDetectionResponse,
        ConflictResolutionRequest,
        ConflictResolutionResponse,
        Conflict,
        _detect_conflicts_semantic,
        _detect_conflicts_simple,
        CONFLICT_DETECTION_AVAILABLE,
    )

    __all__ = [
        "ConflictDetectionRequest",
        "ConflictDetectionResponse",
        "ConflictResolutionRequest",
        "ConflictResolutionResponse",
        "Conflict",
        "_detect_conflicts_semantic",
        "_detect_conflicts_simple",
        "CONFLICT_DETECTION_AVAILABLE",
    ]
except ImportError as e:
    raise ImportError(
        f"Could not import from main.py: {e}. "
        "Ensure main.py is in the same directory and dependencies are installed."
    )
