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

Before you begin, ensure you have the following software installed:

| Software | Version | Check              | Download Link                                 |
| -------- | ------- | ------------------ | --------------------------------------------- |
| PHP      | 8.2+    | `php -v`           | https://www.php.net/downloads                 |
| Composer | Latest  | `composer -V`      | https://getcomposer.org/download/             |
| Node.js  | 18+     | `node -v`          | https://nodejs.org/ (LTS version recommended) |
| npm      | 9+      | `npm -v`           | Included with Node.js                         |
| Python   | 3.8+    | `python --version` | https://www.python.org/downloads/             |
| Git      | Latest  | `git --version`    | https://git-scm.com/downloads                 |

**📋 Installation Tips:**

- **PHP**: On Windows, use XAMPP, WAMP, or download PHP binaries directly
- **Composer**: Run the installer and ensure it's in your PATH
- **Node.js**: Use the LTS (Long Term Support) version for stability
- **Python**: During installation, check "Add Python to PATH"

### 1️⃣ Clone Repository

```powershell
git clone https://github.com/bucecto123/LLM4Reqs.git
cd LLM4Reqs
```

---

## 📦 Backend Setup (Laravel/PHP)

### Step 1: Install PHP Dependencies

```powershell
cd backend
composer install
```

**What this does:**

- Installs Laravel framework (v12.0)
- Installs Laravel Reverb for WebSocket support
- Installs Laravel Sanctum for authentication
- Installs PDF parser library
- Installs development tools (PHPUnit, Faker, etc.)

**Expected packages (75+ total):**

- `laravel/framework` - Core Laravel framework
- `laravel/reverb` - WebSocket server
- `pusher/pusher-php-server` - Push notifications
- `smalot/pdfparser` - PDF document parsing
- Plus many more dependencies...

### Step 2: Configure Environment

```powershell
# Copy environment configuration
copy .env.example .env

# Generate application encryption key
php artisan key:generate
```

### Step 3: Create Database

```powershell
# Create database directory if it doesn't exist
mkdir database -ErrorAction SilentlyContinue

# Create SQLite database file
New-Item -Path database\database.sqlite -ItemType File -Force
```

### Step 4: Run Database Migrations

```powershell
# Create database tables and seed with sample data
php artisan migrate --seed
```

**This creates the following tables:**

- `users` - User accounts
- `projects` - User projects
- `documents` - Uploaded documents
- `requirements` - Extracted requirements
- `personas` - 8 predefined personas
- `conversations` - Chat history
- `messages` - Chat messages
- `requirement_conflicts` - Detected conflicts
- And more...

**📝 Backend `.env` is pre-configured with:**

- ✅ SQLite database (no MySQL needed)
- ✅ WebSocket/Reverb settings (port 8080)
- ✅ LLM Service URL (`http://localhost:8000`)
- ✅ CORS configuration for frontend
- ✅ Queue connection for background jobs

**No manual configuration needed!** The defaults work out of the box.

---

## 🎨 Frontend Setup (React/Vite)

### Step 1: Install Node.js Dependencies

```powershell
cd ..\frontend
npm install
```

**What this does:**

- Installs React (v19.1) and React DOM
- Installs React Router for navigation
- Installs Vite for fast development
- Installs TailwindCSS for styling
- Installs Laravel Echo and Pusher for WebSocket
- Installs UI libraries (lucide-react, react-markdown)

**Expected packages (200+ including dependencies):**

- `react` & `react-dom` - Core React library
- `react-router-dom` - Client-side routing
- `vite` - Build tool and dev server
- `tailwindcss` - Utility-first CSS framework
- `laravel-echo` - WebSocket client
- `pusher-js` - Real-time communication
- `react-markdown` - Markdown rendering
- `prismjs` - Syntax highlighting
- Plus many development dependencies...

### Step 2: Configure Environment

```powershell
# Copy environment configuration
copy .env.example .env
```

**📝 Frontend `.env` is pre-configured with:**

- ✅ Backend API URL (`http://localhost:8001`)
- ✅ WebSocket configuration (matches backend)
- ✅ `VITE_REVERB_APP_KEY` automatically matches backend

**No manual configuration needed!** All environment variables are already set.

---

## 🤖 LLM Service Setup (Python/FastAPI)

### Step 1: Create Virtual Environment

```powershell
cd ..\llm

# Create Python virtual environment
python -m venv env

# Activate virtual environment
.\env\Scripts\Activate.ps1
```

**💡 Tip:** You should see `(env)` appear in your terminal prompt when activated.

### Step 2: Install Python Dependencies

```powershell
pip install -r requirements.txt
```

**What this does:**

- Installs FastAPI and Uvicorn (API server)
- Installs GROQ client for AI models
- Installs FAISS for vector search
- Installs Sentence Transformers for embeddings
- Installs PDF processing libraries
- Installs ML libraries (scikit-learn, numpy, pandas)

**Expected packages (30+ core packages, 100+ with dependencies):**

**Core Dependencies:**

- `fastapi` - Modern web framework
- `uvicorn` - ASGI server
- `groq` - GROQ AI client
- `pydantic` - Data validation

**AI/ML Libraries:**

- `sentence-transformers` - Text embeddings
- `faiss-cpu` - Vector similarity search
- `numpy` - Numerical computing
- `pandas` - Data manipulation
- `scikit-learn` - Machine learning
- `hdbscan` - Clustering algorithm

**Document Processing:**

- `PyPDF2` - PDF parsing
- `python-multipart` - File upload support
- `aiofiles` - Async file operations

**Development Tools:**

- `pytest` - Testing framework
- `pytest-asyncio` - Async testing
- `httpx` - HTTP client for testing

**Installation time:** 5-10 minutes depending on your internet speed and CPU.

### Step 3: Configure Environment

```powershell
# Copy environment configuration
copy .env.example .env
```

### Step 4: Get GROQ API Key (Required!)

**🔑 Get Your Free GROQ API Key:**

1. Visit [console.groq.com](https://console.groq.com/)
2. Sign up for a free account (no credit card required)
3. Go to "API Keys" section
4. Click "Create API Key"
5. Copy the generated key

### Step 5: Add Your API Key

Open `llm\.env` in any text editor and update:

```env
GROQ_API_KEY=gsk_your_actual_api_key_here
```

**📝 LLM `.env` is pre-configured with:**

- ✅ Default GROQ model (`openai/gpt-oss-120b`)
- ✅ LLM API key (matches backend: `dev-secret-key-12345`)
- ✅ RAG (Retrieval-Augmented Generation) enabled
- ✅ FAISS vector store configuration

**Only the GROQ_API_KEY needs to be updated!**

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

## 🧪 Verify Successful Installation

### Step-by-Step Verification

#### 1️⃣ Verify Backend Packages

```powershell
cd backend

# Check if all packages are installed
composer show

# Should see 75+ packages including:
# - laravel/framework
# - laravel/reverb
# - laravel/sanctum
# - smalot/pdfparser
# - pusher/pusher-php-server

# Check autoload
composer dump-autoload
```

**Expected output:** No errors, list of all Laravel packages

#### 2️⃣ Verify Frontend Packages

```powershell
cd frontend

# Check if all packages are installed
npm list --depth=0

# Should see:
# - react@19.x
# - react-dom@19.x
# - vite@7.x
# - tailwindcss@4.x
# - laravel-echo@2.x
# - pusher-js@8.x

# Check for missing peer dependencies
npm ls
```

**Expected output:** No missing dependencies, tree structure of packages

#### 3️⃣ Verify LLM Service Packages

```powershell
cd llm

# Activate environment
.\env\Scripts\Activate.ps1

# Check if all packages are installed
pip list

# Should see:
# fastapi
# uvicorn
# groq
# faiss-cpu
# sentence-transformers
# scikit-learn
# pandas
# numpy

# Check specific package
pip show fastapi
```

**Expected output:** List of 30+ packages with versions

### Test Running Services

#### Test Backend API

```powershell
# Start backend (if not running)
cd backend
php artisan serve --port=8001

# In another terminal, test health endpoint
curl http://localhost:8001/api/health

# Or visit in browser:
# http://localhost:8001/api/health
```

**Expected response:**

```json
{
  "status": "healthy",
  "timestamp": "2025-11-13T10:30:00Z"
}
```

#### Test LLM Service

```powershell
# Start LLM service (if not running)
cd llm
.\env\Scripts\Activate.ps1
uvicorn main:app --reload

# In another terminal, test health endpoint
curl http://localhost:8000/health

# Or visit API docs:
# http://localhost:8000/docs
```

**Expected response:**

```json
{
  "status": "healthy"
}
```

#### Test Frontend

```powershell
# Start frontend (if not running)
cd frontend
npm run dev

# Visit in browser:
# http://localhost:5173
```

**Expected result:** Login/Register page loads with no console errors

#### Test WebSocket (Reverb)

```powershell
# Start Reverb (if not running)
cd backend
php artisan reverb:start

# Check if server is running on port 8080
netstat -ano | findstr :8080
```

**Expected output:** Process listening on port 8080

### Run Full System Test Suite

```powershell
cd backend
php artisan test
```

**Expected output:**

```
PASS  Tests\Feature\AuthTest
✓ user can register
✓ user can login

PASS  Tests\Feature\ProjectTest
✓ user can create project
✓ user can view projects

...

Tests:    XX passed (XXX assertions)
Duration: XX.XXs
```

All tests should pass ✅

### Test All Services Together

```powershell
# Use the automated script
.\start-dev.ps1

# This should open 5 terminal windows:
# 1. Backend (port 8001)
# 2. Frontend (port 5173)
# 3. LLM Service (port 8000)
# 4. Reverb WebSocket (port 8080)
# 5. Queue Worker

# Wait 10-15 seconds for all services to start

# Then test full workflow:
# 1. Open http://localhost:5173
# 2. Register/Login
# 3. Create a project
# 4. Upload a document
# 5. Process document (extracts requirements)
# 6. Test chat functionality
```

### Common Verification Issues

❌ **"composer: command not found"**

- Composer not installed or not in PATH
- Install from https://getcomposer.org/

❌ **"npm: command not found"**

- Node.js not installed or not in PATH
- Install from https://nodejs.org/

❌ **"Module 'fastapi' not found"**

- Virtual environment not activated
- Run: `.\env\Scripts\Activate.ps1`

❌ **"Port already in use"**

- Another service using the port
- Kill process: `netstat -ano | findstr :PORT` then `taskkill /PID <PID> /F`

❌ **"Database not found"**

- Migrations not run
- Run: `php artisan migrate --seed`

### Installation Success Checklist

- [ ] PHP 8.2+ installed (`php -v`)
- [ ] Composer installed (`composer -V`)
- [ ] Node.js 18+ installed (`node -v`)
- [ ] Python 3.8+ installed (`python --version`)
- [ ] Backend packages installed (75+ packages)
- [ ] Frontend packages installed (200+ packages)
- [ ] LLM packages installed (30+ packages)
- [ ] Database created and migrated
- [ ] `.env` files configured for all services
- [ ] GROQ API key added to `llm/.env`
- [ ] Backend starts on port 8001
- [ ] Frontend starts on port 5173
- [ ] LLM service starts on port 8000
- [ ] Reverb starts on port 8080
- [ ] Queue worker runs without errors
- [ ] All automated tests pass
- [ ] Can register/login on frontend
- [ ] Can create projects and upload documents

✅ **If all boxes are checked, your installation is complete!**

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

### ❌ Package Installation Issues

#### Backend (Composer) Errors

**Error: "composer: command not found"**

```powershell
# Install Composer from https://getcomposer.org/download/
# Or on Windows, download and run Composer-Setup.exe
```

**Error: "PHP extension ... is missing"**

```powershell
# Enable required extensions in php.ini:
# - extension=pdo_sqlite
# - extension=fileinfo
# - extension=mbstring
# - extension=openssl
# - extension=zip
# - extension=curl

# Find php.ini location:
php --ini

# Edit php.ini and uncomment (remove ;) the extensions above
```

**Error: "Memory limit exceeded"**

```powershell
# Increase PHP memory limit temporarily:
php -d memory_limit=512M composer install

# Or permanently in php.ini:
# memory_limit = 512M
```

#### Frontend (npm) Errors

**Error: "npm: command not found"**

```powershell
# Install Node.js from https://nodejs.org/
# Restart your terminal after installation
# Verify: npm -v
```

**Error: "EACCES permission denied"**

```powershell
# On Windows, run PowerShell as Administrator
# Or clear npm cache:
npm cache clean --force
npm install
```

**Error: "Cannot find module"**

```powershell
# Delete node_modules and reinstall:
cd frontend
Remove-Item -Recurse -Force node_modules
Remove-Item -Force package-lock.json
npm install
```

**Error: "Vite: Port 5173 already in use"**

```powershell
# Find and kill process on port 5173:
netstat -ano | findstr :5173
taskkill /PID <PID> /F

# Or use a different port:
npm run dev -- --port 5174
```

#### LLM Service (pip) Errors

**Error: "pip: command not found"**

```powershell
# Ensure Python is in PATH
# Reinstall Python with "Add to PATH" checked
# Or use: python -m pip install -r requirements.txt
```

**Error: "Microsoft Visual C++ required"**

```powershell
# Some packages need C++ compiler
# Download "Microsoft C++ Build Tools":
# https://visualstudio.microsoft.com/visual-cpp-build-tools/
# Install "Desktop development with C++"
```

**Error: "Failed building wheel for faiss-cpu"**

```powershell
# Try installing prebuilt wheel:
pip install --upgrade pip setuptools wheel
pip install faiss-cpu --only-binary :all:

# Or use conda:
conda install -c conda-forge faiss-cpu
```

**Error: "FAISS not found or ImportError"**

```powershell
# Ensure you activated the virtual environment:
.\env\Scripts\Activate.ps1

# You should see (env) in your prompt
# Then reinstall:
pip install --force-reinstall faiss-cpu
```

**Error: "Torch/Transformers taking too long"**

```powershell
# If you don't need training models, these are optional
# The requirements.txt has them commented out
# The system works without them using GROQ API
```

### ❌ Runtime Errors

#### "GROQ API Key Missing"

**Solution:** Add your API key to `llm/.env`:

```env
GROQ_API_KEY=gsk_your_actual_api_key_here
```

#### Port Already in Use

```powershell
# Find and kill process on specific port:
netstat -ano | findstr :8001    # Backend
netstat -ano | findstr :5173    # Frontend
netstat -ano | findstr :8000    # LLM
netstat -ano | findstr :8080    # Reverb

# Kill the process:
taskkill /PID <PID> /F
```

#### Database Not Found

```powershell
cd backend
php artisan migrate:fresh --seed
```

#### WebSocket Connection Failed

**Check:**

1. Reverb server is running (`php artisan reverb:start`)
2. `REVERB_APP_KEY` matches in both `backend/.env` and `frontend/.env`
3. Port 8080 is not blocked by firewall
4. Both backend and Reverb are running simultaneously

#### CORS Errors

If you see CORS errors in browser console:

```powershell
cd backend
php artisan config:clear
php artisan config:cache
# Restart backend server
```

#### Queue Jobs Not Processing

Make sure queue worker is running:

```powershell
cd backend
php artisan queue:work --tries=3
```

#### Virtual Environment Issues (Python)

**Can't activate env:**

```powershell
# On Windows, if you get execution policy error:
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Then try activating again:
.\env\Scripts\Activate.ps1
```

**Wrong Python version in env:**

```powershell
# Delete and recreate with correct Python:
Remove-Item -Recurse -Force env
python -m venv env
.\env\Scripts\Activate.ps1
pip install -r requirements.txt
```

### 🔍 Verify Installation

After resolving issues, verify each component:

```powershell
# Check Backend packages
cd backend
composer show

# Check Frontend packages
cd frontend
npm list --depth=0

# Check LLM packages
cd llm
.\env\Scripts\Activate.ps1
pip list
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

## � Complete Package Lists

### Backend Dependencies (75+ packages)

**Main Dependencies (composer.json):**

```json
{
  "php": "^8.2",
  "laravel/framework": "^12.0",
  "laravel/reverb": "^1.0",
  "laravel/sanctum": "^4.2",
  "laravel/tinker": "^2.10.1",
  "pusher/pusher-php-server": "^7.2",
  "smalot/pdfparser": "^2.12"
}
```

**Dev Dependencies:**

```json
{
  "fakerphp/faker": "^1.23",
  "laravel/pail": "^1.2.2",
  "laravel/pint": "^1.24",
  "laravel/sail": "^1.41",
  "mockery/mockery": "^1.6",
  "nunomaduro/collision": "^8.6",
  "phpunit/phpunit": "^11.5.3"
}
```

**Key Features:**

- 🔐 Authentication (Sanctum)
- 🌐 WebSocket (Reverb)
- 📄 PDF Parsing (smalot/pdfparser)
- 🧪 Testing (PHPUnit, Mockery)
- 📊 Database (SQLite built-in)

### Frontend Dependencies (200+ packages)

**Main Dependencies (package.json):**

```json
{
  "react": "^19.1.1",
  "react-dom": "^19.1.1",
  "react-router-dom": "^7.9.4",
  "laravel-echo": "^2.2.6",
  "pusher-js": "^8.4.0",
  "react-markdown": "^10.1.0",
  "react-syntax-highlighter": "^15.6.6",
  "lucide-react": "^0.544.0",
  "prismjs": "^1.30.0",
  "remark-gfm": "^4.0.1",
  "rehype-raw": "^7.0.0",
  "remark-breaks": "^3.0.0"
}
```

**Dev Dependencies:**

```json
{
  "@vitejs/plugin-react": "^5.0.3",
  "vite": "^7.1.7",
  "tailwindcss": "^4.1.14",
  "postcss": "^8.5.6",
  "autoprefixer": "^10.4.21",
  "eslint": "^9.36.0"
}
```

**Key Features:**

- ⚛️ React 19 (Latest)
- 🎨 TailwindCSS (Utility-first CSS)
- 🚀 Vite (Lightning-fast HMR)
- 🔌 WebSocket (Laravel Echo + Pusher)
- 📝 Markdown Rendering
- 🎨 Syntax Highlighting
- 🧭 Client-side Routing

### LLM Service Dependencies (30+ core packages)

**Core Requirements (requirements.txt):**

```txt
# API Framework
fastapi
uvicorn
aiofiles
python-multipart

# AI/LLM
groq
sentence-transformers
pydantic

# Vector Search
faiss-cpu
numpy

# Data Processing
pandas
requests
python-dotenv

# PDF Processing
PyPDF2

# Machine Learning
scikit-learn>=1.3.0
hdbscan>=0.8.33

# Utilities
tqdm

# Testing
pytest
pytest-asyncio
httpx
```

**Key Features:**

- 🤖 GROQ AI Integration
- 🔍 FAISS Vector Search
- 📊 Sentence Transformers (Embeddings)
- 📄 PDF Text Extraction
- 🧠 Conflict Detection (ML)
- ⚡ FastAPI (Async API)
- 🧪 Pytest (Testing)

## 🔧 Useful Commands

### Backend (Laravel)

```powershell
# Development
php artisan serve --port=8001     # Start dev server
php artisan reverb:start          # Start WebSocket server
php artisan queue:work --tries=3  # Process background jobs

# Database
php artisan migrate               # Run migrations
php artisan migrate:fresh --seed  # Reset database with seed data
php artisan db:seed               # Seed data only

# Debugging
php artisan route:list            # List all API routes
php artisan config:clear          # Clear config cache
php artisan cache:clear           # Clear application cache
php artisan optimize:clear        # Clear all caches

# Testing
php artisan test                  # Run all tests
php artisan test --filter=UserTest # Run specific test

# Package Management
composer install                  # Install packages
composer update                   # Update packages
composer show                     # List installed packages
composer show laravel/framework   # Show package details
```

### Frontend (React)

```powershell
# Development
npm run dev        # Start dev server (port 5173)
npm run dev -- --port 5174  # Use different port

# Building
npm run build      # Production build
npm run preview    # Preview production build

# Linting
npm run lint       # Run ESLint

# Package Management
npm install                    # Install packages
npm install <package>          # Add new package
npm install <package> --save-dev # Add dev package
npm list --depth=0             # List installed packages
npm outdated                   # Check for updates
npm update                     # Update packages
```

### LLM Service (Python)

```powershell
# Activate virtual environment first!
.\env\Scripts\Activate.ps1

# Development
uvicorn main:app --reload         # Start dev server (port 8000)
uvicorn main:app --port 8001      # Use different port

# FAISS Index
python build_faiss.py             # Build vector search index

# Conflict Detection
python run_domain_agnostic_detection.ps1  # Run conflict detection

# Testing
pytest                            # Run all tests
pytest -v                         # Verbose output
pytest test_file.py               # Run specific test file

# Package Management
pip list                          # List installed packages
pip show fastapi                  # Show package details
pip install <package>             # Install package
pip install --upgrade <package>   # Update package
pip freeze > requirements.txt     # Export installed packages
```

### General Utilities

```powershell
# Check versions
php -v
composer -V
node -v
npm -v
python --version
pip --version

# Check running processes
netstat -ano | findstr :8001  # Backend
netstat -ano | findstr :5173  # Frontend
netstat -ano | findstr :8000  # LLM
netstat -ano | findstr :8080  # Reverb

# Kill process by PID
taskkill /PID <PID> /F

# Check disk space
Get-PSDrive
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

## 📋 Quick Reference Card

### Installation Commands (Copy-Paste Ready)

```powershell
# === FULL INSTALLATION FROM SCRATCH ===

# 1. Clone repository
git clone https://github.com/bucecto123/LLM4Reqs.git
cd LLM4Reqs

# 2. Backend setup
cd backend
composer install
copy .env.example .env
php artisan key:generate
mkdir database -ErrorAction SilentlyContinue
New-Item -Path database\database.sqlite -ItemType File -Force
php artisan migrate --seed

# 3. Frontend setup
cd ..\frontend
npm install
copy .env.example .env

# 4. LLM setup
cd ..\llm
python -m venv env
.\env\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
# ⚠️ IMPORTANT: Edit llm\.env and add your GROQ_API_KEY

# 5. Start all services
cd ..
.\start-dev.ps1
```

### Daily Development Commands

```powershell
# Start all services (easiest method)
.\start-dev.ps1

# OR manually (5 terminals):

# Terminal 1: Backend
cd backend
php artisan serve --port=8001

# Terminal 2: Frontend
cd frontend
npm run dev

# Terminal 3: LLM Service
cd llm
.\env\Scripts\Activate.ps1
uvicorn main:app --reload

# Terminal 4: WebSocket
cd backend
php artisan reverb:start

# Terminal 5: Queue Worker
cd backend
php artisan queue:work --tries=3
```

### Access Points

| Service     | URL                        | Description             |
| ----------- | -------------------------- | ----------------------- |
| Frontend    | http://localhost:5173      | User Interface          |
| Backend API | http://localhost:8001/api  | REST API                |
| LLM Service | http://localhost:8000      | AI Processing           |
| LLM Docs    | http://localhost:8000/docs | API Documentation       |
| WebSocket   | ws://localhost:8080        | Real-time Communication |

### Package Count Summary

| Component | Packages | Installation Time |
| --------- | -------- | ----------------- |
| Backend   | 75+      | 2-3 minutes       |
| Frontend  | 200+     | 3-5 minutes       |
| LLM       | 30+      | 5-10 minutes      |
| **Total** | **305+** | **10-18 minutes** |

### File Sizes After Installation

| Directory               | Size (Approx) | Description              |
| ----------------------- | ------------- | ------------------------ |
| `backend/vendor`        | ~100 MB       | PHP packages             |
| `frontend/node_modules` | ~300 MB       | JavaScript packages      |
| `llm/env`               | ~2 GB         | Python packages + models |
| **Total**               | **~2.4 GB**   | Full installation        |

### Port Usage

| Port | Service            | Command to Check |
| ---- | ------------------ | ---------------- | -------------- |
| 8001 | Backend            | `netstat -ano    | findstr :8001` |
| 5173 | Frontend           | `netstat -ano    | findstr :5173` |
| 8000 | LLM Service        | `netstat -ano    | findstr :8000` |
| 8080 | Reverb (WebSocket) | `netstat -ano    | findstr :8080` |

### Environment Files

| File            | Required Keys                    | Default Works? |
| --------------- | -------------------------------- | -------------- |
| `backend/.env`  | APP_KEY (auto-generated)         | ✅ Yes         |
| `frontend/.env` | All pre-configured               | ✅ Yes         |
| `llm/.env`      | GROQ_API_KEY (must add manually) | ❌ No          |

### Testing Commands

```powershell
# Backend tests
cd backend
php artisan test

# Frontend build test
cd frontend
npm run build

# LLM service test
cd llm
.\env\Scripts\Activate.ps1
pytest

# API health checks
curl http://localhost:8001/api/health
curl http://localhost:8000/health
```

### Troubleshooting Quick Fixes

```powershell
# Clear all caches
cd backend
php artisan optimize:clear

# Reinstall backend
cd backend
Remove-Item -Recurse -Force vendor
composer install

# Reinstall frontend
cd frontend
Remove-Item -Recurse -Force node_modules
Remove-Item -Force package-lock.json
npm install

# Reinstall LLM
cd llm
Remove-Item -Recurse -Force env
python -m venv env
.\env\Scripts\Activate.ps1
pip install -r requirements.txt

# Reset database
cd backend
php artisan migrate:fresh --seed

# Kill all services
taskkill /F /IM php.exe
taskkill /F /IM node.exe
taskkill /F /IM python.exe
```

### Useful Keyboard Shortcuts

| Action            | Shortcut                     |
| ----------------- | ---------------------------- |
| Stop service      | `Ctrl + C`                   |
| Clear terminal    | `cls` or `clear`             |
| Exit Python env   | `deactivate`                 |
| Open new terminal | `Ctrl + Shift + '` (VS Code) |

---

**🚀 You're ready to go! Happy coding!**

**Need help?** Check the troubleshooting section above or review the [COMPLETE_KB_API_GUIDE.md](llm/COMPLETE_KB_API_GUIDE.md) for advanced features.
