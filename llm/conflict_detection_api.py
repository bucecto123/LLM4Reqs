"""
conflict_detection_api.py
FastAPI endpoints for domain-agnostic conflict detection.
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import List, Dict, Optional
import pandas as pd
import os
import asyncio
from datetime import datetime
import json

from domain_agnostic_conflict_detector import DomainAgnosticConflictDetector

router = APIRouter(prefix="/api/conflicts", tags=["Conflict Detection"])

# In-memory job tracking (use Redis in production)
_conflict_jobs: Dict[str, Dict] = {}
_conflict_jobs_lock = asyncio.Lock()


class ConflictDetectionRequest(BaseModel):
    """Request to detect conflicts in requirements."""
    project_id: int
    requirements: List[Dict[str, str]]  # [{"id": "1", "text": "..."}]
    min_cluster_size: Optional[int] = 2
    max_batch_size: Optional[int] = 30


class ConflictDetectionResponse(BaseModel):
    """Response with conflict detection job ID."""
    job_id: str
    status: str
    message: str


class ConflictResult(BaseModel):
    """Individual conflict result."""
    req_id_1: str
    req_id_2: str
    req_text_1: str
    req_text_2: str
    reason: str
    confidence: str
    cluster_id: int


class ConflictStatusResponse(BaseModel):
    """Status of conflict detection job."""
    job_id: str
    status: str  # pending, running, completed, failed
    progress: Optional[str]
    conflicts: Optional[List[ConflictResult]]
    error: Optional[str]
    metadata: Optional[Dict]


async def run_conflict_detection(
    job_id: str,
    project_id: int,
    requirements: List[Dict[str, str]],
    min_cluster_size: int,
    max_batch_size: int
):
    """Background task to run conflict detection."""
    async with _conflict_jobs_lock:
        _conflict_jobs[job_id]["status"] = "running"
        _conflict_jobs[job_id]["progress"] = "Initializing detector..."
    
    try:
        # Create temporary CSV from requirements
        temp_dir = f"data/temp/{project_id}"
        os.makedirs(temp_dir, exist_ok=True)
        temp_csv = f"{temp_dir}/requirements_{job_id}.csv"
        
        # Convert requirements to DataFrame
        df = pd.DataFrame(requirements)
        df.to_csv(temp_csv, index=False)
        
        # Initialize detector
        detector = DomainAgnosticConflictDetector(
            output_dir=f"data/conflict_detection/{project_id}",
            min_cluster_size=min_cluster_size,
            max_cluster_batch=max_batch_size,
        )
        
        async with _conflict_jobs_lock:
            _conflict_jobs[job_id]["progress"] = "Detecting conflicts..."
        
        # Run detection
        await detector.run(
            csv_path=temp_csv,
            text_column="text",
            id_column="id",
            add_tags=False
        )
        
        # Convert conflicts to response format
        conflicts = []
        for conflict in detector.conflicts:
            conflicts.append({
                "req_id_1": conflict.req_a_id,
                "req_id_2": conflict.req_b_id,
                "req_text_1": conflict.req_a_text,
                "req_text_2": conflict.req_b_text,
                "reason": conflict.reason,
                "confidence": conflict.confidence,
                "cluster_id": conflict.cluster_id
            })
        
        # Get metadata
        cluster_labels = [req.cluster_id for req in detector.requirements]
        n_clusters = len(set(cluster_labels)) - (1 if -1 in cluster_labels else 0)
        n_noise = cluster_labels.count(-1)
        
        metadata = {
            "total_requirements": len(requirements),
            "clusters_found": n_clusters,
            "noise_points": n_noise,
            "conflicts_found": len(conflicts),
            "timestamp": datetime.now().isoformat()
        }
        
        # Update job status
        async with _conflict_jobs_lock:
            _conflict_jobs[job_id]["status"] = "completed"
            _conflict_jobs[job_id]["conflicts"] = conflicts
            _conflict_jobs[job_id]["metadata"] = metadata
            _conflict_jobs[job_id]["progress"] = None
        
        # Cleanup temp file
        if os.path.exists(temp_csv):
            os.remove(temp_csv)
            
    except Exception as e:
        async with _conflict_jobs_lock:
            _conflict_jobs[job_id]["status"] = "failed"
            _conflict_jobs[job_id]["error"] = str(e)
            _conflict_jobs[job_id]["progress"] = None


@router.post("/detect", response_model=ConflictDetectionResponse)
async def detect_conflicts(
    request: ConflictDetectionRequest,
    background_tasks: BackgroundTasks
):
    """
    Start conflict detection for a project's requirements.
    
    This is an async operation that returns immediately with a job ID.
    Poll /api/conflicts/status/{job_id} to check progress.
    """
    # Validate requirements
    if not request.requirements:
        raise HTTPException(status_code=400, detail="No requirements provided")
    
    # Ensure requirements have 'id' and 'text' fields
    for req in request.requirements:
        if 'id' not in req or 'text' not in req:
            raise HTTPException(
                status_code=400,
                detail="Each requirement must have 'id' and 'text' fields"
            )
    
    # Generate job ID
    job_id = f"{request.project_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    
    # Initialize job
    async with _conflict_jobs_lock:
        _conflict_jobs[job_id] = {
            "project_id": request.project_id,
            "status": "pending",
            "progress": None,
            "conflicts": None,
            "metadata": None,
            "error": None,
            "created_at": datetime.now().isoformat()
        }
    
    # Start background task
    background_tasks.add_task(
        run_conflict_detection,
        job_id,
        request.project_id,
        request.requirements,
        request.min_cluster_size,
        request.max_batch_size
    )
    
    return ConflictDetectionResponse(
        job_id=job_id,
        status="pending",
        message=f"Conflict detection started for {len(request.requirements)} requirements"
    )


@router.get("/status/{job_id}", response_model=ConflictStatusResponse)
async def get_conflict_status(job_id: str):
    """Get the status of a conflict detection job."""
    async with _conflict_jobs_lock:
        if job_id not in _conflict_jobs:
            raise HTTPException(status_code=404, detail="Job not found")
        
        job = _conflict_jobs[job_id]
    
    return ConflictStatusResponse(
        job_id=job_id,
        status=job["status"],
        progress=job.get("progress"),
        conflicts=job.get("conflicts"),
        error=job.get("error"),
        metadata=job.get("metadata")
    )


@router.delete("/status/{job_id}")
async def clear_conflict_job(job_id: str):
    """Clear a completed conflict detection job."""
    async with _conflict_jobs_lock:
        if job_id not in _conflict_jobs:
            raise HTTPException(status_code=404, detail="Job not found")
        
        del _conflict_jobs[job_id]
    
    return {"message": "Job cleared successfully"}
