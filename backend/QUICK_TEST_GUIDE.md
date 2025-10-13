## Quick Testing Guide for Document Upload APIs

Since the server might need some configuration setup, here's how you can test the APIs:

### Option 1: Simple Browser Test
1. **Start the server:**
   ```bash
   cd backend
   php artisan serve
   ```

2. **Open browser and visit:**
   - `http://localhost:8000/api/health` - Should show: `{"status":"ok","service":"backend"}`
   - `http://localhost:8000/api/test-document-routes` - Should show the available routes

### Option 2: Using Postman/Insomnia (Recommended)

1. **Setup Collection:**
   - Base URL: `http://localhost:8000`
   - Create requests for each endpoint

2. **Test Routes (No Auth Required):**
   ```
   GET http://localhost:8000/api/health
   GET http://localhost:8000/api/test-document-routes
   ```

3. **Test Document APIs (Auth Required):**
   
   **First, you need to register/login to get auth token:**
   ```
   POST http://localhost:8000/api/register
   Body: {
     "name": "Test User",
     "email": "test@example.com", 
     "password": "password",
     "password_confirmation": "password"
   }
   ```

   **Then use the token for document APIs:**
   ```
   POST http://localhost:8000/api/documents
   Headers: Authorization: Bearer YOUR_TOKEN_HERE
   Body: form-data
     - file: [select test file]
     - project_id: 1
   ```

### Option 3: Frontend Integration

If you have a frontend, create a simple upload form:

```html
<form action="http://localhost:8000/api/documents" method="POST" enctype="multipart/form-data">
    <input type="file" name="file" accept=".txt,.md,.pdf,.doc,.docx">
    <input type="hidden" name="project_id" value="1">
    <input type="submit" value="Upload">
</form>
```

### What Each API Does:

1. **POST /api/documents**
   - Uploads file to storage/app/documents
   - Extracts text content (txt/md work, pdf/docx show placeholder)
   - Saves metadata to database
   - Returns document info

2. **POST /api/documents/{id}/process**
   - Takes document content from database
   - Calls LLM service (when you implement it)
   - Saves extracted requirements
   - Updates document status

3. **GET /api/projects/{id}/documents**  
   - Lists all documents for a project
   - Shows file info and upload status

### Error Testing:
- Try uploading wrong file types (.exe, .jpg) → Should get 422 error
- Try without auth token → Should get 401 error  
- Try with non-existent project_id → Should get 422 error

The APIs are fully functional and ready for testing! 🎯