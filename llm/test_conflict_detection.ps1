# Test Conflict Detection on test 1.docx
# Extracts requirements from Word doc and runs conflict detection

Write-Host "🧪 Conflict Detection Test - test 1.docx" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Check if virtual environment exists
if (-Not (Test-Path ".venv")) {
    Write-Host "❌ Virtual environment not found!" -ForegroundColor Red
    Write-Host "   Please create one first: python -m venv .venv" -ForegroundColor Yellow
    exit 1
}

# Activate virtual environment
Write-Host "🔧 Activating virtual environment..." -ForegroundColor Yellow
.\.venv\Scripts\Activate.ps1

# Check if .env exists
if (-Not (Test-Path ".env")) {
    Write-Host "❌ .env file not found!" -ForegroundColor Red
    Write-Host "   Please create .env with your GROQ_API_KEY" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Environment ready" -ForegroundColor Green
Write-Host ""

# Step 1: Install python-docx if needed
Write-Host "📦 Checking dependencies..." -ForegroundColor Yellow
python -c "import docx" 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "   Installing python-docx..." -ForegroundColor Yellow
    pip install python-docx --quiet
}
Write-Host "✅ Dependencies ready" -ForegroundColor Green
Write-Host ""

# Step 2: Extract requirements from Word document
Write-Host "📄 Step 1: Extracting requirements from test 1.docx" -ForegroundColor Cyan
Write-Host "---------------------------------------------------" -ForegroundColor Cyan
python extract_docx_to_csv.py

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "❌ Extraction failed!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host ""

# Step 3: Run conflict detection
Write-Host "🔍 Step 2: Running conflict detection" -ForegroundColor Cyan
Write-Host "--------------------------------------" -ForegroundColor Cyan

$csvPath = "data/test1_requirements.csv"

if (-Not (Test-Path $csvPath)) {
    Write-Host "❌ CSV file not found: $csvPath" -ForegroundColor Red
    exit 1
}

Write-Host "Input: $csvPath" -ForegroundColor White
Write-Host ""

python domain_agnostic_conflict_detector.py `
    --input $csvPath `
    --text-column requirement `
    --id-column id `
    --output-dir data/conflict_detection/test1 `
    --min-cluster-size 2 `
    --max-batch 30

Write-Host ""
Write-Host ""

# Step 4: Display results
Write-Host "📊 Step 3: Results Summary" -ForegroundColor Cyan
Write-Host "--------------------------" -ForegroundColor Cyan

$outputDir = "data/conflict_detection/test1"
if (Test-Path $outputDir) {
    $files = Get-ChildItem $outputDir -File | Sort-Object LastWriteTime -Descending
    
    Write-Host "Output files:" -ForegroundColor Green
    foreach ($file in $files) {
        Write-Host "  📄 $($file.Name)" -ForegroundColor White
    }
    
    # Show latest conflicts file
    $conflictFile = $files | Where-Object { $_.Name -like "conflicts_*.csv" } | Select-Object -First 1
    if ($conflictFile) {
        Write-Host ""
        Write-Host "Latest conflicts file: $($conflictFile.Name)" -ForegroundColor Yellow
        Write-Host ""
        
        # Read and display conflicts
        $conflicts = Import-Csv $conflictFile.FullName
        if ($conflicts.Count -gt 0) {
            Write-Host "Found $($conflicts.Count) conflict(s):" -ForegroundColor Yellow
            Write-Host ""
            
            foreach ($i in 0..([Math]::Min(2, $conflicts.Count - 1))) {
                $c = $conflicts[$i]
                Write-Host "Conflict $($i + 1):" -ForegroundColor Cyan
                Write-Host "  $($c.req_a_id) ↔ $($c.req_b_id)" -ForegroundColor White
                Write-Host "  Reason: $($c.reason)" -ForegroundColor Gray
                Write-Host "  Confidence: $($c.confidence)" -ForegroundColor Gray
                Write-Host ""
            }
            
            if ($conflicts.Count -gt 3) {
                Write-Host "  ... and $($conflicts.Count - 3) more conflict(s)" -ForegroundColor Gray
            }
        } else {
            Write-Host "✅ No conflicts detected!" -ForegroundColor Green
        }
    }
} else {
    Write-Host "⚠️  Output directory not found" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "✨ Test complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Review results in: $outputDir" -ForegroundColor White
Write-Host "  2. Check conflicts CSV for detailed analysis" -ForegroundColor White
Write-Host "  3. Review requirements_metadata JSON for clustering info" -ForegroundColor White
