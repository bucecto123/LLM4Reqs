# Conflict Detection Integration Guide

## 🔄 Complete Workflow

```
User Upload → Document Processing → Requirement Extraction → Conflict Detection → Display Results
```

## 🎯 Frontend Implementation

### 1. Add Conflict Detection Button

After requirements are extracted, show a button to detect conflicts:

```typescript
// In your project/requirements component
import { useState } from "react";
import axios from "axios";

const RequirementsView = ({ projectId }) => {
  const [detecting, setDetecting] = useState(false);
  const [jobId, setJobId] = useState(null);
  const [conflicts, setConflicts] = useState([]);

  const detectConflicts = async () => {
    setDetecting(true);

    try {
      // Start conflict detection
      const response = await axios.post(
        `/api/projects/${projectId}/conflicts/detect`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const { job_id } = response.data;
      setJobId(job_id);

      // Poll for completion
      pollConflictStatus(job_id);
    } catch (error) {
      console.error("Failed to start conflict detection:", error);
      setDetecting(false);
    }
  };

  const pollConflictStatus = async (jobId) => {
    const maxAttempts = 60;
    let attempts = 0;

    const poll = setInterval(async () => {
      try {
        const response = await axios.get(`/api/conflicts/status/${jobId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const { status, conflicts: detectedConflicts } = response.data.data;

        if (status === "completed") {
          clearInterval(poll);

          // Process and save conflicts
          await axios.post(
            `/api/conflicts/process/${jobId}`,
            { project_id: projectId },
            { headers: { Authorization: `Bearer ${token}` } }
          );

          // Load conflicts
          loadConflicts();
          setDetecting(false);
        }

        if (status === "failed") {
          clearInterval(poll);
          setDetecting(false);
          alert("Conflict detection failed");
        }

        attempts++;
        if (attempts >= maxAttempts) {
          clearInterval(poll);
          setDetecting(false);
          alert("Conflict detection timed out");
        }
      } catch (error) {
        clearInterval(poll);
        setDetecting(false);
        console.error("Failed to poll status:", error);
      }
    }, 2000); // Poll every 2 seconds
  };

  const loadConflicts = async () => {
    try {
      const response = await axios.get(`/api/projects/${projectId}/conflicts`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setConflicts(response.data.data);
    } catch (error) {
      console.error("Failed to load conflicts:", error);
    }
  };

  return (
    <div>
      <button
        onClick={detectConflicts}
        disabled={detecting}
        className="btn btn-primary"
      >
        {detecting ? "Detecting Conflicts..." : "Detect Conflicts"}
      </button>

      {conflicts.length > 0 && <ConflictsDisplay conflicts={conflicts} />}
    </div>
  );
};
```

### 2. Display Conflicts Component

```typescript
const ConflictsDisplay = ({ conflicts }) => {
  const [selectedConflict, setSelectedConflict] = useState(null);

  const getSeverityColor = (severity) => {
    const colors = {
      high: "bg-red-100 border-red-500",
      medium: "bg-yellow-100 border-yellow-500",
      low: "bg-blue-100 border-blue-500",
    };
    return colors[severity] || colors.medium;
  };

  const getConfidenceBadge = (confidence) => {
    const badges = {
      high: "badge-error",
      medium: "badge-warning",
      low: "badge-info",
    };
    return badges[confidence] || badges.medium;
  };

  return (
    <div className="conflicts-section mt-4">
      <h3 className="text-xl font-bold mb-4">
        Detected Conflicts ({conflicts.length})
      </h3>

      <div className="space-y-4">
        {conflicts.map((conflict) => (
          <div
            key={conflict.id}
            className={`border-l-4 p-4 rounded ${getSeverityColor(
              conflict.severity
            )}`}
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex gap-2 mb-2">
                  <span
                    className={`badge ${getConfidenceBadge(
                      conflict.confidence
                    )}`}
                  >
                    {conflict.confidence} confidence
                  </span>
                  <span className="badge badge-neutral">
                    Cluster {conflict.cluster_id}
                  </span>
                </div>

                <p className="text-sm font-semibold mb-2">
                  {conflict.conflict_description}
                </p>

                <div className="grid grid-cols-2 gap-4 mt-3">
                  <div className="bg-white p-3 rounded">
                    <p className="text-xs text-gray-500 mb-1">
                      Requirement #{conflict.requirement_id_1}
                    </p>
                    <p className="text-sm">
                      {conflict.requirement1?.requirement_text}
                    </p>
                  </div>

                  <div className="bg-white p-3 rounded">
                    <p className="text-xs text-gray-500 mb-1">
                      Requirement #{conflict.requirement_id_2}
                    </p>
                    <p className="text-sm">
                      {conflict.requirement2?.requirement_text}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 ml-4">
                {conflict.resolution_status === "pending" && (
                  <button
                    onClick={() => setSelectedConflict(conflict)}
                    className="btn btn-sm btn-primary"
                  >
                    Resolve
                  </button>
                )}

                {conflict.resolution_status === "resolved" && (
                  <span className="badge badge-success">Resolved</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedConflict && (
        <ResolveConflictModal
          conflict={selectedConflict}
          onClose={() => setSelectedConflict(null)}
          onResolved={() => {
            setSelectedConflict(null);
            // Reload conflicts
          }}
        />
      )}
    </div>
  );
};
```

### 3. Resolve Conflict Modal

```typescript
const ResolveConflictModal = ({ conflict, onClose, onResolved }) => {
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [resolving, setResolving] = useState(false);

  const handleResolve = async () => {
    if (!resolutionNotes.trim()) {
      alert("Please enter resolution notes");
      return;
    }

    setResolving(true);

    try {
      await axios.put(
        `/api/conflicts/${conflict.id}/resolve`,
        { resolution_notes: resolutionNotes },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      onResolved();
    } catch (error) {
      console.error("Failed to resolve conflict:", error);
      alert("Failed to resolve conflict");
    } finally {
      setResolving(false);
    }
  };

  return (
    <div className="modal modal-open">
      <div className="modal-box">
        <h3 className="font-bold text-lg mb-4">Resolve Conflict</h3>

        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2">Conflict Description:</p>
          <p className="text-sm bg-gray-100 p-2 rounded">
            {conflict.conflict_description}
          </p>
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text">Resolution Notes</span>
          </label>
          <textarea
            className="textarea textarea-bordered h-24"
            placeholder="Explain how this conflict was resolved..."
            value={resolutionNotes}
            onChange={(e) => setResolutionNotes(e.target.value)}
          />
        </div>

        <div className="modal-action">
          <button
            onClick={onClose}
            className="btn btn-ghost"
            disabled={resolving}
          >
            Cancel
          </button>
          <button
            onClick={handleResolve}
            className="btn btn-primary"
            disabled={resolving}
          >
            {resolving ? "Resolving..." : "Mark as Resolved"}
          </button>
        </div>
      </div>
    </div>
  );
};
```

## 📊 Backend Workflow

### Document Processing Flow

Update your `DocumentController` to trigger conflict detection:

```php
// In DocumentController.php
public function processDocument(int $id)
{
    $document = Document::findOrFail($id);

    // ... existing document processing code ...

    // After requirements are saved, trigger conflict detection
    if ($document->project_id) {
        try {
            $conflictService = app(ConflictDetectionService::class);
            $result = $conflictService->detectConflictsForProject($document->project_id);

            // Optionally: Store job ID for tracking
            $document->update([
                'conflict_detection_job_id' => $result['job_id']
            ]);

        } catch (\Exception $e) {
            // Log but don't fail the whole process
            Log::warning("Conflict detection failed for project {$document->project_id}", [
                'error' => $e->getMessage()
            ]);
        }
    }

    return response()->json([
        'message' => 'Document processed successfully',
        'requirements_count' => $requirements->count()
    ]);
}
```

## 🗄️ Database Migration

Run the migration to add new fields:

```bash
php artisan migrate
```

## 🧪 Testing the Integration

### 1. Test from Frontend

```typescript
// Test conflict detection
const testConflictDetection = async () => {
  const projectId = 1;

  // 1. Detect conflicts
  const detectResponse = await axios.post(
    `http://localhost:8001/api/projects/${projectId}/conflicts/detect`
  );

  console.log("Job started:", detectResponse.data);

  // 2. Check status
  const jobId = detectResponse.data.job_id;
  const statusResponse = await axios.get(
    `http://localhost:8001/api/conflicts/status/${jobId}`
  );

  console.log("Status:", statusResponse.data);

  // 3. Get conflicts
  const conflictsResponse = await axios.get(
    `http://localhost:8001/api/projects/${projectId}/conflicts`
  );

  console.log("Conflicts:", conflictsResponse.data);
};
```

### 2. Test from Backend

```bash
# Test detect endpoint
curl -X POST http://localhost:8001/api/projects/1/conflicts/detect \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test status endpoint
curl http://localhost:8001/api/conflicts/status/1_20251103_140000 \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test get conflicts
curl http://localhost:8001/api/projects/1/conflicts \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 🔍 Expected Response Format

### Conflict Detection Start

```json
{
  "success": true,
  "job_id": "1_20251103_140530",
  "status": "pending",
  "message": "Conflict detection started for 50 requirements"
}
```

### Job Status (Running)

```json
{
  "success": true,
  "data": {
    "job_id": "1_20251103_140530",
    "status": "running",
    "progress": "Detecting conflicts...",
    "conflicts": null,
    "metadata": null
  }
}
```

### Job Status (Completed)

```json
{
  "success": true,
  "data": {
    "job_id": "1_20251103_140530",
    "status": "completed",
    "conflicts": [
      {
        "req_id_1": "123",
        "req_id_2": "456",
        "req_text_1": "System must use OAuth2",
        "req_text_2": "System must use basic authentication",
        "reason": "Contradictory authentication methods",
        "confidence": "high",
        "cluster_id": 2
      }
    ],
    "metadata": {
      "total_requirements": 50,
      "clusters_found": 8,
      "noise_points": 5,
      "conflicts_found": 3
    }
  }
}
```

### Get Project Conflicts

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "requirement_id_1": 123,
      "requirement_id_2": 456,
      "conflict_description": "Contradictory authentication methods",
      "confidence": "high",
      "cluster_id": 2,
      "severity": "high",
      "resolution_status": "pending",
      "detected_at": "2025-11-03T14:05:45.000000Z",
      "requirement1": {
        "id": 123,
        "requirement_text": "System must use OAuth2"
      },
      "requirement2": {
        "id": 456,
        "requirement_text": "System must use basic authentication"
      }
    }
  ],
  "total": 3
}
```

## 🚀 Next Steps

1. **Run the migration**:

   ```bash
   cd backend
   php artisan migrate
   ```

2. **Test the LLM API**:

   ```bash
   cd llm
   uvicorn main:app --reload
   ```

3. **Test conflict detection**:

   - Upload a document
   - Process requirements
   - Click "Detect Conflicts"
   - View results

4. **Customize the UI** to match your design system

---

**Need help?** Check the logs:

- LLM: Terminal running `uvicorn main:app`
- Backend: `backend/storage/logs/laravel.log`
- Frontend: Browser console
