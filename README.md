# 🚀 LLM4Reqs - AI-Powered Requirements Extraction

**LLM4Reqs** is an intelligent system that uses Large Language Models to automatically analyze documents and extract software requirements. It features persona-based requirement generation, conflict detection, and real-time collaboration.

## ✨ Features

- 📄 **Document Upload** - PDF, Word (DOC/DOCX), Text, and Markdown
- 🤖 **AI Extraction** - Automated requirement identification and extraction
- 👥 **Persona-Based Analysis** - 8 predefined personas (End User, Product Manager, Developer, etc.)
- ⚔️ **Conflict Detection** - Domain-agnostic conflict detection using RAG
- � **Real-time Chat** - WebSocket-powered streaming responses
- 🔒 **Secure** - Token-based authentication

## 🎯 Architecture

| Component        | Technology        | Port | Purpose            |
| ---------------- | ----------------- | ---- | ------------------ |
| **Backend**      | Laravel/PHP       | 8001 | REST API, Database |
| **Frontend**     | React/Vite        | 5173 | User Interface     |
| **LLM Service**  | Python/FastAPI    | 8000 | AI Processing      |
| **Reverb**       | Laravel WebSocket | 8080 | Real-time Updates  |
| **Queue Worker** | Laravel Queue     | -    | Background Jobs    |

---

## ⚡ Quick Start

### Prerequisites

| Software | Version | Check              |
| -------- | ------- | ------------------ |
| PHP      | 8.2+    | `php -v`           |
| Composer | Latest  | `composer -V`      |
| Node.js  | 18+     | `node -v`          |
| Python   | 3.8+    | `python --version` |

### 1️⃣ Clone Repository

```powershell
git clone https://github.com/bucecto123/LLM4Reqs.git
cd LLM4Reqs
```

### 2️⃣ Backend Setup

```powershell
cd backend
composer install

# Copy environment configuration
copy .env.example .env

# Generate application key
php artisan key:generate

# Create database
mkdir database -ErrorAction SilentlyContinue
New-Item -Path database\database.sqlite -ItemType File -Force

# Run migrations and seed data
php artisan migrate --seed
```

**📝 The `.env.example` file is already pre-configured with:**

- ✅ WebSocket/Reverb settings
- ✅ LLM Service URL and API key
- ✅ CORS configuration
- ✅ Queue connection

**No manual configuration needed!** Just copy and run. The defaults work out of the box.

### 3️⃣ Frontend Setup

```powershell
cd ..\frontend
npm install

# Copy environment configuration
copy .env.example .env
```

**📝 The `.env.example` file is already pre-configured with:**

- ✅ Backend API URL
- ✅ WebSocket configuration (matches backend)

**No manual configuration needed!** The REVERB_APP_KEY automatically matches the backend.

### 4️⃣ LLM Service Setup

```powershell
cd ..\llm
python -m venv env
.\env\Scripts\Activate.ps1
pip install -r requirements.txt

# Copy environment configuration
copy .env.example .env
```

**🔑 Get Your Free GROQ API Key:**

1. Visit [console.groq.com](https://console.groq.com/)
2. Sign up for a free account
3. Create an API key
4. Open `llm/.env` and paste your key:
   ```env
   GROQ_API_KEY=your_actual_api_key_here
   ```

**📝 The `.env.example` already includes:**

- ✅ Default GROQ model (llama-3.3-70b-versatile)
- ✅ LLM API key (matches backend)
- ✅ RAG configuration

**Only update the GROQ_API_KEY with your actual key!**

### 5️⃣ Start All Services

**Option A - Automated (Recommended):**

```powershell
.\start-dev.ps1
```

**Option B - Manual (5 separate terminals):**

```powershell
# Terminal 1: LLM Service
cd llm
.\env\Scripts\Activate.ps1
uvicorn main:app --reload

# Terminal 2: Frontend
cd frontend
npm run dev

# Terminal 3: Backend
cd backend
php -d upload_max_filesize=20M -d post_max_size=25M artisan serve --port=8001

# Terminal 4: Reverb WebSocket
cd backend
php artisan reverb:start

# Terminal 5: Queue Worker
cd backend
php artisan queue:work --tries=3
```

---

## � Access Points

Once all services are running:

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:8001/api
- **LLM Docs:** http://localhost:8000/docs
- **Reverb WebSocket:** ws://localhost:8080

### First Time Setup

1. Navigate to http://localhost:5173
2. Click **Register** → Create account
3. **Login** with credentials
4. Create a project and upload documents!

---

## 🧪 Verify Installation

```powershell
# Test Backend
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

## ⚙️ Environment Configuration

All three components use `.env` files for configuration. We provide `.env.example` templates with sensible defaults.

### Quick Setup

```powershell
# Backend
cd backend
copy .env.example .env

# Frontend
cd frontend
copy .env.example .env

# LLM Service
cd llm
copy .env.example .env
# Then add your GROQ_API_KEY
```

### Important Configuration Notes

**Backend (`backend/.env`)**

- Uses SQLite by default (no MySQL setup required)
- Reverb WebSocket pre-configured on port 8080
- CORS already set for `localhost:5173`

**Frontend (`frontend/.env`)**

- `VITE_REVERB_APP_KEY` must match backend's `REVERB_APP_KEY`
- All Vite env vars must start with `VITE_`

**LLM Service (`llm/.env`)**

- **Required:** Add your GROQ API key
- `LLM_API_KEY` must match backend's `LLM_API_KEY`

---

## 🚨 Common Issues & Solutions

### ❌ "GROQ API Key Missing"

**Solution:** Add your API key to `llm/.env`:

```env
GROQ_API_KEY=your_actual_api_key_here
```

### ❌ Port Already in Use

```powershell
# Find and kill process on port 8001 (Backend)
netstat -ano | findstr :8001
taskkill /PID <PID> /F

# For other ports: 5173 (Frontend), 8000 (LLM), 8080 (Reverb)
```

### ❌ Database Not Found

```powershell
cd backend
php artisan migrate:fresh --seed
```

### ❌ WebSocket Connection Failed

**Check:**

1. Reverb server is running (`php artisan reverb:start`)
2. `REVERB_APP_KEY` matches in both `backend/.env` and `frontend/.env`
3. Port 8080 is not blocked by firewall

### ❌ CORS Errors

If you see CORS errors in browser console:

```powershell
cd backend
php artisan config:clear
# Restart backend server
```

### ❌ Missing Packages

```powershell
# Backend
cd backend
composer install

# Frontend
cd frontend
npm install

# LLM
cd llm
python -m venv env
.\env\Scripts\Activate.ps1
pip install -r requirements.txt
```

### ❌ Queue Jobs Not Processing

Make sure queue worker is running:

```powershell
cd backend
php artisan queue:work --tries=3
```

---

## 📚 Key Features Explained

### 1. Persona-Based Analysis

8 predefined personas (End User, Product Manager, Developer, QA, Business Analyst, System Architect, Security Expert, System Administrator) provide different perspectives on requirements.

**API Example:**

```powershell
# Get all personas
curl http://localhost:8001/api/personas -H "Authorization: Bearer YOUR_TOKEN"

# Generate requirements with persona
curl -X POST http://localhost:8001/api/personas/1/generate -H "Authorization: Bearer YOUR_TOKEN"
```

### 2. Conflict Detection

Domain-agnostic conflict detection using RAG (Retrieval-Augmented Generation) identifies contradictions and inconsistencies.

**Run Detection:**

```powershell
cd backend
php artisan queue:work  # Start queue worker
# Upload documents and trigger conflict detection via UI
```

### 3. Real-time WebSocket Updates

Progress updates stream in real-time via Reverb WebSocket server.

**Test WebSocket:**

```javascript
// Browser console
const ws = new WebSocket("ws://localhost:8080");
ws.onmessage = (e) => console.log("Received:", e.data);
```

---

## 📁 Project Structure

```
LLM4Reqs/
├── backend/              # Laravel API
│   ├── app/
│   │   ├── Events/       # WebSocket events
│   │   ├── Jobs/         # Background jobs (KB build, conflict detection)
│   │   ├── Models/       # Eloquent models
│   │   └── Services/     # Business logic
│   ├── database/migrations/
│   └── routes/api.php
│
├── frontend/             # React UI
│   ├── src/
│   │   ├── components/   # UI components
│   │   ├── pages/        # DashBoard, Projects, ProjectDetail
│   │   └── services/     # API clients
│   └── vite.config.js
│
├── llm/                  # Python AI Service
│   ├── main.py           # FastAPI app
│   ├── rag.py            # RAG implementation
│   ├── persona_manager.py
│   ├── conflict_detection_api.py
│   └── domain_agnostic_conflict_detector.py
│
└── start-dev.ps1         # Automated startup script
```

---

## 🔧 Useful Commands

### Backend (Laravel)

```powershell
php artisan route:list            # List all routes
php artisan migrate:fresh --seed  # Reset database
php artisan queue:work            # Process jobs
php artisan reverb:start          # Start WebSocket server
php artisan config:clear          # Clear config cache
```

### Frontend (React)

```powershell
npm run dev        # Development server
npm run build      # Production build
npm run preview    # Preview production build
```

### LLM Service (Python)

```powershell
uvicorn main:app --reload         # Development server
python build_faiss.py             # Build FAISS index
python run_domain_agnostic_detection.ps1  # Run conflict detection
```

---

## 📜 License

This project is part of **COS40005 - Computing Technology Project A**.

Laravel framework is licensed under the [MIT license](https://opensource.org/licenses/MIT).

---

## 🎯 Quick Tips

- ⚡ **Use `start-dev.ps1`** - Starts all 5 services in separate windows
- 📋 **Copy `.env.example` files** - Pre-configured with working defaults
- 🔑 **Only GROQ_API_KEY needed** - Everything else works out of the box
- 📝 **Check logs:** `backend/storage/logs/laravel.log`
- 📚 **API Documentation:** http://localhost:8000/docs (FastAPI Swagger UI)
- 💾 **Database:** SQLite at `backend/database/database.sqlite` (no MySQL needed)
- 🔌 **WebSocket Port:** 8080 (configurable in `.env`)
- 🔄 **Reset everything:** `php artisan migrate:fresh --seed`

---

**🚀 You're ready to go! Happy coding!**
