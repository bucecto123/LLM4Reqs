# Domain-Agnostic Conflict Detection Pipeline
# Detects conflicts without training or domain knowledge

Write-Host "Domain-Agnostic Conflict Detection Pipeline" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

# Check if virtual environment exists
if (-Not (Test-Path ".venv")) {
    Write-Host "Virtual environment not found!" -ForegroundColor Red
    Write-Host "   Please create one first: python -m venv .venv" -ForegroundColor Yellow
    exit 1
}

# Activate virtual environment
Write-Host "Activating virtual environment..." -ForegroundColor Yellow
.\.venv\Scripts\Activate.ps1

# Check if .env exists
if (-Not (Test-Path ".env")) {
    Write-Host ".env file not found!" -ForegroundColor Red
    Write-Host "   Please create .env with your GROQ_API_KEY" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "This pipeline will:" -ForegroundColor Green
Write-Host "  1. Load requirements from enriched_requirements.csv" -ForegroundColor White
Write-Host "  2. Generate semantic embeddings" -ForegroundColor White
Write-Host "  3. Cluster related requirements" -ForegroundColor White
Write-Host "  4. Use LLM to detect conflicts within clusters" -ForegroundColor White
Write-Host "  5. Save results and build training dataset" -ForegroundColor White
Write-Host ""

# Ask for optional tagging
$addTags = Read-Host "Generate semantic tags? (yes/no, default: no)"
if ([string]::IsNullOrWhiteSpace($addTags)) { $addTags = "no" }

$tagArg = ""
if ($addTags -eq "yes") {
    $tagSample = Read-Host "How many requirements to tag? (default: 10)"
    if ([string]::IsNullOrWhiteSpace($tagSample)) { $tagSample = 10 }
    $tagArg = "--add-tags --tag-sample $tagSample"
}

Write-Host ""
Write-Host "Starting conflict detection..." -ForegroundColor Green
Write-Host ""

# Run the detector
$command = "python domain_agnostic_conflict_detector.py --input data/enriched_requirements.csv --text-column requirement $tagArg"
Invoke-Expression $command

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Conflict detection failed!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "Pipeline Complete!" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Results saved to: data/conflict_detection/" -ForegroundColor Yellow
Write-Host "  - conflicts_*.csv: Detected conflicts" -ForegroundColor White
Write-Host "  - requirements_metadata_*.json: Clustered requirements" -ForegroundColor White
Write-Host "  - training_data_*.csv: Dataset for future fine-tuning" -ForegroundColor White
Write-Host ""
