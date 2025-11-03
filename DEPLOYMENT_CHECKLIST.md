# Deployment Checklist - PDF Processing Fixes

## Pre-Deployment

- [ ] Review all changes in the following files:
  - `llm/main.py` - JSON recovery and increased token limits
  - `backend/app/Jobs/ProcessDocumentJob.php` - Retry logic and content limits
  - `backend/app/Http/Controllers/Api/DocumentController.php` - Enhanced PDF extraction
- [ ] Run verification test:
  ```bash
  python test_pdf_fixes.py
  ```
- [ ] Check for PHP syntax errors:
  ```bash
  php backend/artisan about
  ```

## Deployment Steps

### 1. Backend (Laravel)

```bash
# Navigate to backend directory
cd backend

# No composer packages to install (existing pdfparser library)
# Just verify it's installed
composer show smalot/pdfparser

# Clear Laravel caches
php artisan config:clear
php artisan cache:clear
php artisan queue:restart  # IMPORTANT: Restart queue workers
```

### 2. LLM Service (Python)

```bash
# Navigate to LLM directory
cd llm

# No new dependencies needed
# Restart the service
# If using systemd:
# sudo systemctl restart llm-service

# If running manually:
# Kill existing process and restart:
# python main.py
```

## Post-Deployment Verification

### 1. Test with Sample PDFs

- [ ] Upload a small PDF (< 5 pages)
  - Expected: Should process successfully
  - Log: "PDF text extracted successfully"
- [ ] Upload a medium PDF (10-20 pages)
  - Expected: Should process, may show truncation log
  - Log: "ProcessDocumentJob: Content truncated"
- [ ] Upload a large PDF (30+ pages)
  - Expected: May trigger retry logic
  - Log: "Retry successful with shorter content"
- [ ] Upload a scanned/image-based PDF
  - Expected: Graceful failure with informative message
  - Result: "PDF processed but no readable text found. The PDF may contain only images or scanned content."

### 2. Monitor Logs

```powershell
# Check for successful extractions
Get-Content backend/storage/logs/laravel.log -Tail 50 | Select-String "LLM extraction complete"

# Check for retry activations
Get-Content backend/storage/logs/laravel.log -Tail 50 | Select-String "Retry successful"

# Check for JSON recovery
Get-Content backend/storage/logs/laravel.log -Tail 50 | Select-String "JSON recovery"

# Check for any failures
Get-Content backend/storage/logs/laravel.log -Tail 50 | Select-String "ERROR"
```

### 3. Verify Queue Processing

```bash
# Check queue workers are running
php artisan queue:work --once

# Monitor queue in real-time
php artisan queue:listen
```

### 4. Test API Endpoints Directly

```bash
# Test LLM health
curl http://localhost:8000/health

# Test extraction endpoint (requires API key)
curl -X POST http://localhost:8000/api/extract \
  -H "X-API-Key: dev-secret-key-12345" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "The system must be secure. Users should be able to login.",
    "document_type": "requirements"
  }'
```

## Monitoring Metrics

After deployment, track these metrics over the next 24-48 hours:

| Metric                      | Before | Target | Actual |
| --------------------------- | ------ | ------ | ------ |
| PDF processing success rate | ~60%   | >90%   | \_\_\_ |
| JSON parsing failures       | High   | <5%    | \_\_\_ |
| Retry activations           | N/A    | <20%   | \_\_\_ |
| Average processing time     | \_\_\_ | <30s   | \_\_\_ |

## Rollback Plan

If issues occur:

1. **Quick Rollback**:

   ```bash
   git checkout HEAD~1 llm/main.py
   git checkout HEAD~1 backend/app/Jobs/ProcessDocumentJob.php
   git checkout HEAD~1 backend/app/Http/Controllers/Api/DocumentController.php
   ```

2. **Restart services**:

   ```bash
   cd backend && php artisan queue:restart
   cd llm && systemctl restart llm-service  # or restart manually
   ```

3. **Monitor logs** to confirm rollback success

## Common Issues & Solutions

### Issue: Queue workers not picking up changes

**Solution**:

```bash
php artisan queue:restart
```

### Issue: LLM service returning old responses

**Solution**:

```bash
# Restart LLM service completely
# Clear any caching if implemented
```

### Issue: PDFs still failing with "parse error"

**Solution**:

- Check max_tokens is actually 6000 in deployed code
- Verify \_attempt_json_recovery function is present
- Check LLM service logs for actual error

### Issue: No retry attempts logged

**Solution**:

- Verify str_contains function exists (PHP 8.0+)
- Check queue workers are processing jobs
- Look for "LLM service error" in logs

## Success Criteria

✅ Deployment is successful when:

1. PDF processing success rate > 90%
2. No critical errors in logs
3. Queue workers processing jobs normally
4. Test PDFs extract requirements successfully
5. Retry logic activates when needed (logged)
6. JSON recovery works for truncated responses (logged)

## Contact Information

If issues arise during deployment:

- Check logs first: `backend/storage/logs/laravel.log`
- Review this document: `PDF_PROCESSING_FIXES.md`
- Test with verification script: `python test_pdf_fixes.py`

## Notes

- **Queue workers must be restarted** - This is critical!
- Changes are backwards compatible
- No database migrations required
- No new dependencies required
- Configuration changes are minimal

---

**Date**: November 3, 2025  
**Version**: 1.0  
**Changes**: PDF processing enhancements, JSON recovery, retry logic
