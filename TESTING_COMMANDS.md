# Backend Integration Testing Commands

## Prerequisites

```powershell
# 1. Start LLM Service
cd llm
.\env\Scripts\activate
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# 2. Start Laravel Backend (new terminal)
cd backend
php artisan serve --host=127.0.0.1 --port=8001

# 3. Run migrations (if not done)
php artisan migrate
```

## Test Variables Setup

```powershell
# Set your auth token (get from login endpoint)
$token = "YOUR_SANCTUM_TOKEN_HERE"
$baseUrl = "http://localhost:8001/api"
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
    "Accept" = "application/json"
}
```

## 1. Test Health Endpoints

```powershell
# Test Backend Health
Invoke-RestMethod -Uri "http://localhost:8001/api/health"

# Test LLM Health
Invoke-RestMethod -Uri "http://localhost:8000/health"
```

## 2. Test KB Status (Before Build)

```powershell
# Should return status: 'not_built'
Invoke-RestMethod -Uri "$baseUrl/projects/1/kb/status" `
  -Headers $headers
```

## 3. Test KB Build

```powershell
# Trigger KB build
$buildResponse = Invoke-RestMethod -Uri "$baseUrl/projects/1/kb/build" `
  -Method POST `
  -Headers $headers

Write-Output "Build Job ID: $($buildResponse.job_id)"
Write-Output "Status: $($buildResponse.message)"
```

## 4. Monitor KB Build Status

```powershell
# Check status every 5 seconds
do {
    $status = Invoke-RestMethod -Uri "$baseUrl/projects/1/kb/status" `
      -Headers $headers
    
    Write-Output "KB Status: $($status.kb.status) - Version: $($status.kb.version)"
    
    if ($status.kb.status -eq "ready") {
        Write-Output "✅ KB Build Complete!"
        Write-Output "Documents Count: $($status.kb.documents_count)"
        Write-Output "Last Built: $($status.kb.last_built_at)"
        break
    } elseif ($status.kb.status -eq "failed") {
        Write-Output "❌ KB Build Failed!"
        Write-Output "Error: $($status.kb.last_error)"
        break
    }
    
    Start-Sleep -Seconds 5
} while ($true)
```

## 5. Test KB Query (Direct to LLM)

```powershell
# Query LLM service directly to verify KB
Invoke-RestMethod -Uri "http://localhost:8000/kb/query" `
  -Method POST `
  -Headers @{"X-API-Key" = "dev-secret-key-12345"; "Content-Type" = "application/json"} `
  -Body '{"project_id":"1","query":"authentication requirements","top_k":3}' | ConvertTo-Json -Depth 10
```

## 6. Test Requirements Endpoint

```powershell
# Get all requirements
$requirements = Invoke-RestMethod -Uri "$baseUrl/projects/1/requirements" `
  -Headers $headers

Write-Output "Total Requirements: $($requirements.total)"
Write-Output "First Requirement:"
$requirements.data[0] | ConvertTo-Json -Depth 5

# Filter by type
$functional = Invoke-RestMethod -Uri "$baseUrl/projects/1/requirements?type=functional&per_page=10" `
  -Headers $headers

Write-Output "Functional Requirements: $($functional.total)"
```

## 7. Test Conflicts Endpoint

```powershell
# Get requirement conflicts
$conflicts = Invoke-RestMethod -Uri "$baseUrl/projects/1/conflicts" `
  -Headers $headers

Write-Output "Total Conflicts: $($conflicts.total)"
if ($conflicts.data.Count -gt 0) {
    Write-Output "First Conflict:"
    $conflicts.data[0] | ConvertTo-Json -Depth 5
}
```

## 8. Test Conversation with RAG

```powershell
# Create conversation for project
$conversation = Invoke-RestMethod -Uri "$baseUrl/conversations" `
  -Method POST `
  -Headers $headers `
  -Body '{"project_id":1,"title":"Test RAG Integration"}' | ConvertFrom-Json

Write-Output "Conversation ID: $($conversation.id)"

# Send message (will use KB context if ready)
$message = Invoke-RestMethod -Uri "$baseUrl/conversations/$($conversation.id)/messages" `
  -Method POST `
  -Headers $headers `
  -Body '{"role":"user","content":"What are the main authentication requirements?"}' | ConvertFrom-Json

Write-Output "`n=== User Message ==="
Write-Output $message.user_message.content

Write-Output "`n=== AI Response (with KB context) ==="
Write-Output $message.ai_message.content
Write-Output "`nTokens Used: $($message.ai_message.tokens_used)"
```

## 9. Test Incremental Reindex

```powershell
# Reindex all documents
$reindex = Invoke-RestMethod -Uri "$baseUrl/projects/1/kb/reindex" `
  -Method POST `
  -Headers $headers

Write-Output "Reindex Result:"
$reindex | ConvertTo-Json -Depth 5

# Reindex specific documents
$reindexSpecific = Invoke-RestMethod -Uri "$baseUrl/projects/1/kb/reindex" `
  -Method POST `
  -Headers $headers `
  -Body '{"document_ids":[1,2,3]}'

Write-Output "Specific Reindex Result:"
$reindexSpecific | ConvertTo-Json -Depth 5
```

## 10. Test Error Handling

```powershell
# Try to reindex before KB is built (should fail gracefully)
try {
    # First, ensure KB is not built for project 999
    Invoke-RestMethod -Uri "$baseUrl/projects/999/kb/reindex" `
      -Method POST `
      -Headers $headers
} catch {
    Write-Output "Expected Error: $_"
}

# Try to build KB twice (should get conflict response)
$build1 = Invoke-RestMethod -Uri "$baseUrl/projects/1/kb/build" `
  -Method POST `
  -Headers $headers

try {
    $build2 = Invoke-RestMethod -Uri "$baseUrl/projects/1/kb/build" `
      -Method POST `
      -Headers $headers
} catch {
    Write-Output "Expected Conflict Error: $_"
}
```

## 11. Check Logs

```powershell
# View Laravel logs
Get-Content backend/storage/logs/laravel.log -Tail 50

# Search for KB-related logs
Select-String -Path "backend/storage/logs/laravel.log" -Pattern "KB|knowledge" -Context 2,2
```

## 12. Test Complete Workflow

```powershell
# Complete workflow test
function Test-KBWorkflow {
    param($projectId)
    
    Write-Output "🚀 Starting KB Workflow Test for Project $projectId"
    
    # 1. Check initial status
    Write-Output "`n1️⃣ Checking initial KB status..."
    $status1 = Invoke-RestMethod -Uri "$baseUrl/projects/$projectId/kb/status" -Headers $headers
    Write-Output "   Status: $($status1.kb.status)"
    
    # 2. Build KB
    Write-Output "`n2️⃣ Building KB..."
    $build = Invoke-RestMethod -Uri "$baseUrl/projects/$projectId/kb/build" -Method POST -Headers $headers
    Write-Output "   Job ID: $($build.job_id)"
    
    # 3. Wait for completion
    Write-Output "`n3️⃣ Waiting for KB build to complete..."
    $maxWait = 60
    $waited = 0
    while ($waited -lt $maxWait) {
        Start-Sleep -Seconds 5
        $waited += 5
        $status2 = Invoke-RestMethod -Uri "$baseUrl/projects/$projectId/kb/status" -Headers $headers
        Write-Output "   [$waited s] Status: $($status2.kb.status)"
        
        if ($status2.kb.status -eq "ready") {
            Write-Output "   ✅ KB Ready! Chunks: $($status2.kb.documents_count)"
            break
        } elseif ($status2.kb.status -eq "failed") {
            Write-Output "   ❌ KB Build Failed: $($status2.kb.last_error)"
            return
        }
    }
    
    # 4. Test conversation with RAG
    Write-Output "`n4️⃣ Testing conversation with RAG..."
    $conv = Invoke-RestMethod -Uri "$baseUrl/conversations" `
      -Method POST -Headers $headers `
      -Body "{`"project_id`":$projectId,`"title`":`"Workflow Test`"}"
    
    $msg = Invoke-RestMethod -Uri "$baseUrl/conversations/$($conv.id)/messages" `
      -Method POST -Headers $headers `
      -Body '{"role":"user","content":"Summarize the key requirements"}'
    
    Write-Output "   AI Response Length: $($msg.ai_message.content.Length) chars"
    Write-Output "   First 200 chars: $($msg.ai_message.content.Substring(0, [Math]::Min(200, $msg.ai_message.content.Length)))"
    
    Write-Output "`n✅ Workflow test complete!"
}

# Run the test
Test-KBWorkflow -projectId 1
```

## Expected Results

### ✅ Success Indicators

1. **Health checks:** Both services return `{"status":"ok"}`
2. **KB Status:** Progresses from `not_built` → `queued` → `building` → `ready`
3. **KB Build:** Returns job_id and 202 status
4. **Requirements:** Returns paginated data with filters working
5. **Conversation:** AI uses KB context (check logs for "KB context added")
6. **Reindex:** Returns new version number and chunk counts

### ❌ Failure Indicators

1. **403 Forbidden:** API key mismatch between backend and LLM
2. **404 Not Found:** KB not built before querying
3. **409 Conflict:** Trying to build KB that's already building
4. **500 Server Error:** Check logs for exceptions

## Debugging Tips

```powershell
# Check queue jobs
cd backend
php artisan queue:work --once --verbose

# Clear cache if needed
php artisan cache:clear
php artisan config:clear

# Check database
php artisan tinker
> \App\Models\KnowledgeBase::all();
> \App\Models\Requirement::count();
> \App\Models\Project::with('knowledgeBase')->find(1);

# Check LLM service logs
# (Check terminal running uvicorn)
```

## Performance Benchmarks

Record these for comparison:

```powershell
# KB Build Time
Measure-Command {
    Invoke-RestMethod -Uri "$baseUrl/projects/1/kb/build" -Method POST -Headers $headers
    # Wait for completion...
}

# KB Query Time
Measure-Command {
    # Conversation with RAG
    # Measure full request/response time
}

# Compare with non-RAG conversation
# Should see token reduction of 80-90%
```

---

**All tests should pass if integration is correct!** ✅
