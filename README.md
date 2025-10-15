# 🚀 LLM4Reqs - Getting Started Guide

Welcome to **LLM4Reqs**! This guide will help you set up and run the AI-powered requirements extraction system on your local machine.

## 📋 What is LLM4Reqs?

LLM4Reqs is an intelligent system that uses Large Language Models (LLMs) to automatically analyze documents and extract software requirements. Upload your documents, and let AI do the heavy lifting!

### What Can It Do?

- 📄 **Upload Documents** - Supports PDF, Word (DOC/DOCX), Text, and Markdown files
- 🤖 **AI Extraction** - Automatically identifies and extracts requirements from documents
- 💬 **Interactive Chat** - Ask questions and get AI-powered responses
- 👥 **Team Collaboration** - Multiple users can work on projects together
- 🔒 **Secure** - Token-based authentication keeps your data safe

---

## 🎯 System Overview

The project has 3 main parts:

1. **Backend** (Laravel/PHP) - Handles API, database, and file storage
2. **Frontend** (React) - User interface you interact with
3. **LLM Service** (Python/FastAPI) - AI brain for requirement extraction

All three need to be running for the full system to work!

---

## ✅ Before You Start - Prerequisites

Make sure you have these installed on your computer:

| Software     | Version            | Check Command      | Download Link                                   |
| ------------ | ------------------ | ------------------ | ----------------------------------------------- |
| **PHP**      | 8.2 or higher      | `php -v`           | [php.net](https://www.php.net/downloads)        |
| **Composer** | Latest             | `composer -V`      | [getcomposer.org](https://getcomposer.org/)     |
| **Node.js**  | 18 or higher       | `node -v`          | [nodejs.org](https://nodejs.org/)               |
| **npm**      | Comes with Node.js | `npm -v`           | (included with Node.js)                         |
| **Python**   | 3.8 or higher      | `python --version` | [python.org](https://www.python.org/downloads/) |
| **Git**      | Latest             | `git --version`    | [git-scm.com](https://git-scm.com/)             |

### Quick Check (Run in PowerShell)

```powershell
# Check all prerequisites at once
php -v; composer -V; node -v; npm -v; python --version; git --version
```

---

## 🚀 Installation Steps

### Step 1: Get the Code

```powershell
# Clone the repository (if you haven't already)
git clone https://github.com/your-org/LLM4Reqs.git
cd LLM4Reqs
```

---

### Step 2: Setup Backend (Laravel API)

**Time: ~3 minutes**

```powershell
# 1. Navigate to backend folder
cd backend

# 2. Install PHP dependencies
composer install

# 3. Create environment configuration file
copy .env.example .env

# 4. Generate application encryption key
php artisan key:generate

# 5. Create SQLite database file
mkdir database -ErrorAction SilentlyContinue
New-Item -Path database\database.sqlite -ItemType File -Force

# 6. Run database setup (creates all tables)
php artisan migrate --seed

# Done! Backend is ready.
```

#### 📝 Important: Configure Your Database

Open `backend\.env` file and make sure these lines are set:

```env
DB_CONNECTION=sqlite
DB_DATABASE=backend\database\database.sqlite
```

> **Note:** Update the path to match your actual project location!

#### Optional: Use MySQL Instead of SQLite

If you prefer MySQL, update `.env` like this:

```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=llm4reqs
DB_USERNAME=root
DB_PASSWORD=your_password
```

Then create the database: `CREATE DATABASE llm4reqs;`

---

### Step 3: Setup Frontend (React UI)

**Time: ~2 minutes**

```powershell
# 1. Navigate to frontend folder (from project root)
cd ..\frontend

# 2. Install JavaScript dependencies
npm install

# Done! Frontend is ready.
```

---

### Step 4: Setup LLM Service (AI Engine)

**Time: ~2 minutes**

```powershell
# 1. Navigate to LLM folder (from project root)
cd ..\llm

# 2. Create Python virtual environment
python -m venv env

# 3. Activate virtual environment
.\env\Scripts\Activate.ps1

# 4. Install Python packages
pip install -r requirements.txt

# Done! LLM service is ready.
```

#### 🔑 Get Your API Key (Required for AI Features)

The system uses GROQ API for AI processing. You need a free API key:

1. Visit [console.groq.com](https://console.groq.com/)
2. Sign up for a free account
3. Go to API Keys section
4. Create a new API key
5. Copy the key

**Set your API key (choose one method):**

**Option A - Temporary (this session only):**

```powershell
$env:GROQ_API_KEY = "your_actual_api_key_here"
$env:GROQ_MODEL = "llama-3.3-70b-versatile" (or change this to any available model on groq.com)
```

**Option B - Permanent (create `.env` file in `llm/` folder):**

```env
GROQ_API_KEY=your_actual_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile (or change this to any available model on groq.com)
```

---

## 🎮 Running the Application

You need to run all three services in **separate terminal windows**.

### Terminal 1: Start Backend

```powershell
cd backend
php artisan serve --host=127.0.0.1 --port=8001
```

✅ **You should see:** `Server running on [http://127.0.0.1:8001]`

> **Keep this terminal open!**

### Terminal 2: Start Frontend

```powershell
cd frontend
npm run dev
```

✅ **You should see:** `Local: http://localhost:5173/`

> **Keep this terminal open!**

### Terminal 3: Start LLM Service

```powershell
cd llm
.\env\Scripts\Activate.ps1
uvicorn main:app --reload --host 127.0.0.1 --port=8000
```

✅ **You should see:** `Application startup complete`

> **Keep this terminal open!**

---

## 🎉 Access the Application

Once all three services are running:

- **Frontend (Main App):** http://localhost:5173
- **Backend API:** http://localhost:8001/api
- **LLM Service API Docs:** http://localhost:8000/docs

### First Time Using the App?

1. Open http://localhost:5173 in your browser
2. Click "Register" to create a new account
3. Fill in your name, email, and password
4. Login with your credentials
5. Start creating projects and uploading documents!

---

## 🧪 Verify Everything Works

Run these health checks to make sure all services are running:

```powershell
# Test backend (should return: {"status":"ok","service":"backend"})
curl http://localhost:8001/api/health

# Test LLM service (should return: {"status":"healthy"})
curl http://localhost:8000/health
```

### Run Full System Test

```powershell
cd backend
php artisan test
```

All tests should pass ✅

---

## 📖 How to Use the System

### 1. Create Your First Project

1. Login to the web interface
2. Click "New Project"
3. Enter project name and description
4. Click "Create"

### 2. Upload a Document

1. Open your project
2. Click "Upload Document"
3. Select a file (PDF, Word, Text, or Markdown)
4. Click "Upload"

The system will automatically extract the text content!

### 3. Extract Requirements (AI Magic!)

1. After uploading, click "Process Document"
2. The AI will analyze your document
3. Requirements are automatically extracted and listed
4. Review, edit, and organize your requirements

### 4. Chat with AI

1. Click "Chat" in the navigation
2. Type your question or request
3. Get AI-powered responses about requirements

---

## 🔧 Configuration Files Explained

### Backend Configuration (`backend/.env`)

```env
# Application Settings
APP_NAME=LLM4Reqs
APP_ENV=local
APP_DEBUG=true
APP_URL=http://localhost:8001

# Database (SQLite - easiest for local development)
DB_CONNECTION=sqlite
DB_DATABASE=full_path_to_database.sqlite

# LLM Service Connection
LLM_SERVICE_URL=http://localhost:8000

# Frontend Access (for CORS)
SANCTUM_STATEFUL_DOMAINS=localhost:5173
CORS_ALLOWED_ORIGINS=http://localhost:5173
```

### Frontend Configuration (`frontend/vite.config.js`)

The frontend is pre-configured to connect to the backend at `http://localhost:8001/api`.

### LLM Service Configuration (`llm/.env`)

```env
GROQ_API_KEY=your_api_key_here
GROQ_MODEL=gemma2-9b-it
```

---

## 🚨 Troubleshooting Common Issues

### ❌ "Could not open input file: artisan"

**Problem:** You're not in the `backend/` directory.

**Solution:**

```powershell
cd backend
php artisan serve
```

---

### ❌ "SQLSTATE[HY000]: General error: 1 no such table"

**Problem:** Database migrations haven't been run.

**Solution:**

```powershell
cd backend
php artisan migrate --seed
```

---

### ❌ "Port 8001 already in use"

**Problem:** Another application is using port 8001.

**Solution:** Use a different port:

```powershell
php artisan serve --port=8002
```

Then update `frontend/vite.config.js` to proxy to port 8002.

---

### ❌ "LLM service not accessible" or "Connection refused"

**Problem:** LLM service isn't running.

**Solution:** Start it in a separate terminal:

```powershell
cd llm
.\env\Scripts\Activate.ps1
uvicorn main:app --reload --host 127.0.0.1 --port=8000
```

---

### ❌ "npm ERR! code ENOENT"

**Problem:** Node modules not installed.

**Solution:**

```powershell
cd frontend
npm install
```

---

### ❌ "composer: command not found"

**Problem:** Composer is not installed or not in PATH.

**Solution:** Download and install Composer from [getcomposer.org](https://getcomposer.org/)

---

### ❌ File Upload Fails

**Possible Causes & Solutions:**

1. **File too large** - Maximum size is 10MB
2. **Wrong file type** - Only PDF, DOC, DOCX, TXT, MD are supported
3. **Not logged in** - Make sure you're authenticated
4. **Storage permission** - Check `backend/storage/app/` folder permissions

**Check logs:**

```powershell
cd backend
Get-Content storage\logs\laravel.log -Tail 50
```

---

### ❌ CORS Errors in Browser Console

**Problem:** Frontend can't connect to backend due to CORS policy.

**Solution:** Check `backend/.env` has these lines:

```env
SANCTUM_STATEFUL_DOMAINS=localhost:5173
CORS_ALLOWED_ORIGINS=http://localhost:5173
```

Then restart backend:

```powershell
cd backend
php artisan config:clear
php artisan serve --host=127.0.0.1 --port=8001
```

---

## 📊 API Quick Reference

All API endpoints require authentication (except register/login/health).

### Authentication

```powershell
# Register new user
curl -X POST http://localhost:8001/api/register -H "Content-Type: application/json" -d '{"name":"John","email":"john@example.com","password":"password123","password_confirmation":"password123"}'

# Login
curl -X POST http://localhost:8001/api/login -H "Content-Type: application/json" -d '{"email":"john@example.com","password":"password123"}'

# Returns: {"user":{...},"token":"your-auth-token"}
```

### Documents

```powershell
# Upload document
curl -X POST http://localhost:8001/api/documents -H "Authorization: Bearer YOUR_TOKEN" -F "file=@document.pdf" -F "project_id=1"

# Process document (extract requirements)
curl -X POST http://localhost:8001/api/documents/1/process -H "Authorization: Bearer YOUR_TOKEN"

# List project documents
curl -X GET http://localhost:8001/api/projects/1/documents -H "Authorization: Bearer YOUR_TOKEN"
```

### Chat

```powershell
# Send message to AI
curl -X POST http://localhost:8001/api/chat -H "Authorization: Bearer YOUR_TOKEN" -H "Content-Type: application/json" -d '{"text":"Hello, can you help me with requirements?"}'
```

---

## 📁 Project Structure

```
LLM4Reqs/
│
├── backend/              # Laravel PHP Application
│   ├── app/
│   │   ├── Http/Controllers/  # API endpoints
│   │   ├── Models/            # Database models
│   │   └── Services/          # Business logic
│   ├── database/
│   │   ├── migrations/        # Database schema
│   │   └── database.sqlite    # SQLite database file
│   ├── routes/api.php         # API route definitions
│   └── .env                   # Configuration file
│
├── frontend/            # React Application
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   ├── pages/            # Page components
│   │   └── main.jsx          # App entry point
│   └── vite.config.js        # Frontend configuration
│
├── llm/                 # Python AI Service
│   ├── main.py               # FastAPI application
│   ├── rag.py                # RAG implementation
│   ├── requirements.txt      # Python dependencies
│   └── .env                  # API keys
│
└── Setup.md             # This file!
```

---

## 🎓 Learning Resources

New to these technologies? Here are some helpful links:

- **Laravel (Backend):** [laravel.com/docs](https://laravel.com/docs)
- **React (Frontend):** [react.dev](https://react.dev)
- **FastAPI (LLM Service):** [fastapi.tiangolo.com](https://fastapi.tiangolo.com)
- **Vite (Build Tool):** [vitejs.dev](https://vitejs.dev)

---

## 🔄 Daily Development Workflow

### Starting Your Development Session

```powershell
# Terminal 1: Backend
cd backend
php artisan serve --host=127.0.0.1 --port=8001

# Terminal 2: Frontend
cd frontend
npm run dev

# Terminal 3: LLM Service
cd llm
.\env\Scripts\Activate.ps1
uvicorn main:app --reload --host 127.0.0.1 --port=8000
```

### Stopping Everything

Just press `Ctrl+C` in each terminal window.

### Resetting the Database

```powershell
cd backend
php artisan migrate:fresh --seed
```

⚠️ **Warning:** This deletes all data and recreates tables with sample data!

---

## 📝 Quick Commands Cheat Sheet

### Backend Commands

```powershell
php artisan serve              # Start server
php artisan migrate            # Run new migrations
php artisan migrate:fresh      # Reset database
php artisan test               # Run tests
php artisan route:list         # List all API routes
php artisan config:clear       # Clear cached config
composer install               # Install dependencies
composer dump-autoload         # Reload autoloader
```

### Frontend Commands

```powershell
npm run dev                    # Start dev server
npm run build                  # Build for production
npm run preview                # Preview production build
npm install                    # Install dependencies
npm run lint                   # Run code linter
```

### LLM Service Commands

```powershell
uvicorn main:app --reload      # Start service
pip install -r requirements.txt  # Install dependencies
python -m pytest               # Run tests
```

---

## 🎯 Next Steps

Now that you have everything set up:

1. ✅ **Explore the UI** - Create projects, upload documents
2. ✅ **Test AI Features** - Process documents and extract requirements
3. ✅ **Read the API Docs** - Visit http://localhost:8000/docs
4. ✅ **Check the Code** - Explore the project structure
5. ✅ **Make Changes** - Start building new features!

---

## 🆘 Need Help?

- **Technical Issues:** Check the troubleshooting section above
- **API Documentation:** See the complete API reference section
- **Code Questions:** Review the project structure and key files
- **Error Logs:** Check `backend/storage/logs/laravel.log`

---

## 📜 License

This project is part of COS40005 - Computing Technology Project A.

The Laravel framework is licensed under the [MIT license](https://opensource.org/licenses/MIT).

---

**Last Updated:** October 15, 2025  
**Version:** 1.0  
**Status:** Production Ready ✅

---

## 🎊 You're All Set!

Congratulations! Your LLM4Reqs system is ready to use. Start building amazing AI-powered requirement extraction tools! 🚀
