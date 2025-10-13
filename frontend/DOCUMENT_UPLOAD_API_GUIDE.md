# 📋 Document Upload API - Team Implementation Guide

## 🎯 Overview

This document provides complete instructions for the **Document Upload API** implementation in the LLM4Reqs project. The system allows users to upload documents (PDF, DOC, DOCX, TXT, MD), extract text content, and process them with AI to generate requirements.

## 🚀 Quick Start

### Prerequisites
- PHP 8.2+
- Laravel 12.0
- SQLite/MySQL database
- Python 3.8+ (for LLM service)
- Composer
- Node.js (for frontend)

### 1. Backend Setup
```bash
# Navigate to backend directory
cd backend

# Install PHP dependencies
composer install

# Copy environment file
cp .env.example .env

# Generate application key
php artisan key:generate

# Run database migrations
php artisan migrate

# Start Laravel server
php artisan serve
```

### 2. LLM Service Setup
```bash
# Navigate to LLM directory  
cd llm

# Install Python dependencies
pip install -r requirements.txt

# Start LLM service
uvicorn main:app --reload
```

## 📊 API Endpoints

### 🔒 Authentication Required
All document APIs require authentication using Laravel Sanctum. Include the Bearer token in the Authorization header:
```
Authorization: Bearer {your-auth-token}
```

### 1. **Document Upload** - `POST /api/documents`

**Purpose**: Upload and store documents with content extraction

**Request**:
```http
POST /api/documents
Content-Type: multipart/form-data
Authorization: Bearer {token}

Form Data:
- file: (required) Document file (PDF, DOC, DOCX, TXT, MD)
- project_id: (required) ID of the project
- conversation_id: (optional) ID of the conversation
```

**Response** (Success - 201):
```json
{
    "success": true,
    "message": "Document uploaded successfully",
    "document": {
        "id": 1,
        "project_id": 1,
        "user_id": 1,
        "filename": "abc123def456.txt",
        "original_filename": "requirements.txt",
        "file_path": "documents/abc123def456.txt",
        "content": "System Requirements:\n1. User authentication...",
        "file_size": 2048,
        "file_type": "text/plain",
        "status": "uploaded",
        "created_at": "2025-10-13T02:21:41.000000Z"
    }
}
```

**Validation Rules**:
- File: Required, max 10MB, types: pdf,doc,docx,txt,md
- Project ID: Required, must exist in projects table
- User must be authenticated

### 2. **Document Processing** - `POST /api/documents/{id}/process`

**Purpose**: Extract requirements from uploaded document using AI

**Request**:
```http
POST /api/documents/1/process
Authorization: Bearer {token}
```

**Response** (Success - 200):
```json
{
    "success": true,
    "total_extracted": 3,
    "requirements": [
        {
            "id": 1,
            "project_id": 1,
            "document_id": 1,
            "title": "User authentication requirement",
            "requirement_text": "The system must allow users to login with username and password",
            "requirement_type": "functional",
            "priority": "high",
            "confidence_score": 0.95,
            "source": "extracted",
            "status": "draft"
        }
    ]
}
```

### 3. **Project Documents** - `GET /api/projects/{id}/documents`

**Purpose**: List all documents in a project

**Request**:
```http
GET /api/projects/1/documents
Authorization: Bearer {token}
```

**Response** (Success - 200):
```json
{
    "success": true,
    "documents": [
        {
            "id": 1,
            "filename": "requirements.txt",
            "original_filename": "requirements.txt", 
            "file_size": 2048,
            "file_type": "text/plain",
            "status": "processed",
            "created_at": "2025-10-13T02:21:41.000000Z",
            "user": {
                "id": 1,
                "name": "John Doe"
            }
        }
    ]
}
```

## 🗄️ Database Schema

### Documents Table
```sql
CREATE TABLE documents (
    id BIGINT PRIMARY KEY,
    project_id BIGINT NOT NULL,
    conversation_id BIGINT NULL,
    user_id BIGINT NOT NULL,
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NULL,
    file_path VARCHAR(255) NULL,
    content LONGTEXT NULL,              -- Extracted text content
    file_size BIGINT NULL,
    file_type VARCHAR(255) NULL,
    status VARCHAR(255) DEFAULT 'uploaded',
    processed_at TIMESTAMP NULL,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    deleted_at TIMESTAMP NULL
);
```

### Requirements Table (Updated)
```sql  
CREATE TABLE requirements (
    id BIGINT PRIMARY KEY,
    project_id BIGINT NOT NULL,
    document_id BIGINT NULL,           -- Links to source document
    title VARCHAR(255) NOT NULL,
    requirement_text TEXT NULL,        -- Full requirement text
    requirement_type VARCHAR(255) NULL, -- functional, non-functional, etc.
    priority VARCHAR(255) DEFAULT 'medium',
    confidence_score FLOAT NULL,
    source VARCHAR(255) DEFAULT 'manual', -- extracted, manual
    status VARCHAR(255) DEFAULT 'draft',
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    deleted_at TIMESTAMP NULL
);
```

## 🔧 Implementation Details

### File Content Extraction

The system automatically extracts text content from uploaded files:

**Supported Formats**:
- **TXT/MD**: Direct content reading ✅
- **PDF**: ZIP/XML extraction or smalot/pdfparser library ✅  
- **DOCX**: ZIP/XML parsing to extract text ✅
- **DOC**: Basic extraction (can be enhanced) ✅

**Content Storage**: Extracted text is stored in the `content` column of the documents table.

### File Storage
- **Location**: `storage/app/documents/`
- **Naming**: Random 40-character filename with original extension
- **Security**: Files stored outside web root for security

### LLM Integration
- **Service URL**: `http://localhost:8000` (configurable in `.env`)
- **Endpoints Used**: `/api/extract`, `/health`
- **Response Format**: Structured JSON with requirements array

## 🧪 Testing

### Automated Tests

**Run Implementation Validation**:
```bash
php validate_document_implementation.php
```

**Run Complete Workflow Test**:
```bash  
php artisan test:document-upload
```

**Test LLM Integration**:
```bash
php test_llm_integration.php
```

### Manual Testing

**1. Test File Upload**:
```bash
curl -X POST http://localhost:8000/api/documents \
  -H "Authorization: Bearer {token}" \
  -F "file=@sample.txt" \
  -F "project_id=1"
```

**2. Test Document Processing**:
```bash
curl -X POST http://localhost:8000/api/documents/1/process \
  -H "Authorization: Bearer {token}"
```

**3. Test Document Listing**:
```bash  
curl -X GET http://localhost:8000/api/projects/1/documents \
  -H "Authorization: Bearer {token}"
```

## 🚨 Error Handling

### Common Error Responses

**Authentication Error (401)**:
```json
{
    "message": "Unauthenticated"
}
```

**Validation Error (422)**:
```json
{
    "success": false,
    "errors": {
        "file": ["The file field is required."],
        "project_id": ["The project id field is required."]
    }
}
```

**File Processing Error (400)**:
```json
{
    "success": false,
    "message": "Document has no text content"
}
```

**Server Error (500)**:
```json
{
    "success": false,
    "message": "Failed to upload document: {error details}"
}
```

## 🔐 Security Features

### File Validation
- **File Types**: Only PDF, DOC, DOCX, TXT, MD allowed
- **File Size**: Maximum 10MB per file
- **MIME Type**: Validation based on actual file content

### Authentication  
- **Required**: All endpoints require valid authentication token
- **Middleware**: `auth:sanctum` protects all document routes
- **User Context**: All operations tied to authenticated user

### Access Control
- **Project Ownership**: Users can only access documents in their projects
- **File Isolation**: Files stored with random names to prevent guessing

## 🛠️ Configuration

### Environment Variables
```env
# LLM Service Configuration
LLM_SERVICE_URL=http://localhost:8000

# File Storage
FILESYSTEM_DISK=local

# Database
DB_CONNECTION=sqlite
DB_DATABASE=database/database.sqlite
```

### File System Configuration
```php
// config/filesystems.php
'disks' => [
    'local' => [
        'driver' => 'local',
        'root' => storage_path('app/private'),
    ]
]
```

## 📦 Package Dependencies

### Required Composer Packages
```json
{
    "require": {
        "laravel/framework": "^12.0",
        "laravel/sanctum": "^4.2"
    }
}
```

### Optional Enhancement Packages
```bash
# For enhanced PDF extraction
composer require smalot/pdfparser

# For enhanced DOCX extraction  
composer require phpoffice/phpword
```

## 🔄 Development Workflow

### 1. Adding New File Types
1. Update validation rules in `DocumentController::upload()`
2. Add extraction logic in `extractContentFromFile()`
3. Update tests and documentation

### 2. Enhancing LLM Integration
1. Modify `LLMService` class methods
2. Update request/response formats
3. Test with LLM service endpoints

### 3. Database Changes
1. Create new migration: `php artisan make:migration`
2. Update model fillable attributes
3. Run migration: `php artisan migrate`

## 🐛 Troubleshooting

### Common Issues

**1. File Upload Fails**
- Check file permissions on `storage/app/documents/`
- Verify file size and type restrictions
- Ensure authentication token is valid

**2. Content Extraction Empty**
- Verify file is not corrupted
- Check file format is supported
- Review extraction method logs

**3. LLM Service Not Responding**
- Confirm LLM service is running: `uvicorn main:app --reload`  
- Check service URL in configuration
- Verify network connectivity

**4. Database Errors**
- Run migrations: `php artisan migrate`
- Check database connection settings
- Verify foreign key relationships

### Debug Mode
```bash
# Enable Laravel debugging
php artisan config:cache
php artisan config:clear

# Check logs
tail -f storage/logs/laravel.log
```

## 📞 Support

### Team Contacts
- **Backend Lead**: Document upload API implementation
- **LLM Service**: AI requirements extraction  
- **Frontend**: API integration and UI
- **Database**: Schema and migrations

### Resources
- **API Documentation**: `/api/test-document-routes`
- **Health Check**: `/api/health`
- **Test Files**: `test_files/` directory
- **Validation Script**: `validate_document_implementation.php`

---

## ✅ Implementation Status: COMPLETE

**All requirements have been successfully implemented and tested:**

✅ File upload with validation and content extraction  
✅ Document processing with LLM integration  
✅ Project document listing functionality  
✅ Complete database schema with relationships  
✅ Security and authentication measures  
✅ Comprehensive error handling  
✅ Full test coverage and validation  

**The Document Upload API is production-ready!** 🎉