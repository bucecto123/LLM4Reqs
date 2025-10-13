# Document Upload API Testing Guide

## Prerequisites
1. Make sure the Laravel backend is running
2. You have authentication set up (user registered/logged in)
3. At least one project exists in the database

## Testing Methods

### Method 1: Using Postman/Insomnia

#### 1. Test File Upload API
**Endpoint:** `POST http://localhost:8000/api/documents`

**Headers:**
```
Authorization: Bearer YOUR_AUTH_TOKEN
Content-Type: multipart/form-data
```

**Body (form-data):**
```
file: [Select a file - .txt, .md, .pdf, .docx, .doc]
project_id: 1
conversation_id: 1 (optional)
```

**Expected Response:**
```json
{
    "success": true,
    "message": "Document uploaded successfully",
    "document": {
        "id": 1,
        "project_id": 1,
        "filename": "randomstring.txt",
        "original_filename": "test.txt",
        "content": "File content here...",
        "file_size": 1234,
        "status": "uploaded"
    }
}
```

#### 2. Test Document Processing API  
**Endpoint:** `POST http://localhost:8000/api/documents/1/process`

**Headers:**
```
Authorization: Bearer YOUR_AUTH_TOKEN
Content-Type: application/json
```

**Expected Response:**
```json
{
    "success": true,
    "total_extracted": 3,
    "requirements": [
        {
            "id": 1,
            "requirement_text": "System must...",
            "requirement_type": "functional",
            "priority": "high"
        }
    ]
}
```

#### 3. Test Project Documents List API
**Endpoint:** `GET http://localhost:8000/api/projects/1/documents`

**Headers:**
```
Authorization: Bearer YOUR_AUTH_TOKEN
```

**Expected Response:**
```json
{
    "success": true,
    "documents": [
        {
            "id": 1,
            "filename": "test.txt",
            "original_filename": "requirements.txt",
            "status": "uploaded",
            "created_at": "2025-10-12T...",
            "user": {
                "id": 1,
                "name": "John Doe"
            }
        }
    ]
}
```

### Method 2: Using cURL Commands

```bash
# 1. Upload a document
curl -X POST http://localhost:8000/api/documents \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@/path/to/test.txt" \
  -F "project_id=1"

# 2. Process a document  
curl -X POST http://localhost:8000/api/documents/1/process \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"

# 3. List project documents
curl -X GET http://localhost:8000/api/projects/1/documents \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Method 3: Using the Test Route
First test if the routes are properly set up:
```bash
curl http://localhost:8000/api/test-document-routes
```

## Common Issues & Solutions

### 1. Authentication Required
**Error:** `401 Unauthorized`
**Solution:** Make sure you include the Bearer token from login

### 2. Validation Errors
**Error:** `422 Unprocessable Entity`
**Solutions:**
- Check file type (only pdf, doc, docx, txt, md allowed)
- Check file size (max 10MB)
- Ensure project_id exists

### 3. File Not Found
**Error:** `404 Not Found`  
**Solution:** Make sure the document ID exists in the database

### 4. Storage Permission
**Error:** `500 Internal Server Error` with storage message
**Solution:** Check that `storage/app/documents` directory exists and is writable

## Next Steps for Full Testing
1. Set up sample projects and users in database
2. Create test files of different types
3. Test with various file sizes
4. Test error scenarios (invalid files, missing auth, etc.)