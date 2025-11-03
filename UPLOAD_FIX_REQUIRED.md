# URGENT FIX: Upload Size Limit Issue

## Problem Identified

The Baillifard PDF (2.3 MB) is **too large** for the current PHP upload limits:

- Current `upload_max_filesize`: **2M**
- Current `post_max_size`: **8M**
- Baillifard PDF size: **2.3 MB** ❌

The file is being rejected **before** it reaches Laravel, which is why you see:

```
"has_file":false
Document upload validation failed
```

## Solution

### Step 1: Fix PHP Upload Limits (REQUIRED)

Run this command in **Administrator PowerShell**:

```powershell
.\fix-php-upload-limits.ps1
```

Or manually edit `C:\Program Files\php-8.3.3-Win32-vs16-x64\php.ini`:

Find and change:

```ini
upload_max_filesize = 2M    →  upload_max_filesize = 20M
post_max_size = 8M          →  post_max_size = 25M
```

### Step 2: Restart Laravel Backend

Stop the current backend process and restart:

```powershell
cd backend
php artisan serve --port=8001
```

### Step 3: Verify the Fix

Check PHP limits:

```powershell
php -i | Select-String -Pattern "upload_max_filesize|post_max_size"
```

Should now show:

```
upload_max_filesize => 20M => 20M
post_max_size => 25M => 25M
```

### Step 4: Upload the Baillifard PDF

Now try uploading through your frontend. The upload should work!

## What to Expect After Upload

Once the upload works, you'll see in the logs:

1. ✅ File upload successful
2. ✅ PDF text extraction (may take a few seconds for 2.3 MB file)
3. ✅ Content truncation (if needed)
4. ✅ LLM extraction (with our new fixes)
5. ✅ Requirements saved

With our PDF processing fixes:

- If the response is truncated, JSON recovery will salvage complete requirements
- If parsing fails, it will retry with shorter content
- Maximum of 10,000 characters will be sent to LLM initially
- Retry uses 6,000 characters if needed

## Quick Test Commands

After fixing and restarting:

```powershell
# Monitor logs in real-time
.\monitor-logs.ps1

# Or check last entries
.\check-error.ps1
```

## Troubleshooting

If upload still fails after fixing PHP limits:

1. **Verify PHP.ini changes took effect:**

   ```powershell
   php -r "echo ini_get('upload_max_filesize');"
   php -r "echo ini_get('post_max_size');"
   ```

2. **Check Laravel validation limit** (in DocumentController.php):

   ```php
   'file' => 'required|file|max:10240|mimes:pdf,doc,docx,txt,md'
   ```

   The `max:10240` means 10 MB limit (10,240 KB) - this is fine ✅

3. **Check nginx/Apache limits** (if using):

   - nginx: `client_max_body_size`
   - Apache: `LimitRequestBody`

4. **Frontend file size check**:
   - Check if frontend has any file size validation

## Summary

The issue was **NOT** with our PDF processing fixes (those are working fine).

The issue was **PHP upload size limits** preventing the file from being uploaded at all.

Once you:

1. ✅ Fix PHP limits (upload_max_filesize = 20M)
2. ✅ Restart Laravel backend
3. ✅ Upload the Baillifard PDF

Everything should work! 🎉
