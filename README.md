# 🚀 LLM4Reqs - AI-Powered Requirements Extraction

**LLM4Reqs** is an intelligent system that uses Large Language Models to automatically analyze documents and extract software requirements. It features persona-based requirement generation, conflict detection, and interactive AI chat.

---

## 🎯 Quick Start for New Users

**First time here?** Get up and running in 3 simple steps:

### Step 1: Install (15 minutes, one-time setup)

```powershell
git clone https://github.com/bucecto123/LLM4Reqs.git
cd LLM4Reqs
.\setup-all.ps1
```

### Step 2: Get Free API Key (2 minutes)

1. Visit [console.groq.com](https://console.groq.com/) and sign up (free)
2. Create an API key
3. Add it to `llm\.env`: `GROQ_API_KEY=your_key_here`

### Step 3: Start & Use (1 command)

```powershell
.\start-dev.ps1
```

Then open **http://localhost:5173** in your browser!

**Already installed?** Just run `.\start-dev.ps1` and go to step 3!

---

## 🆕 What's New (March 2026)

This update brings **5 major performance & UX improvements** — the app is significantly faster, more responsive, and more observable than before.

### ⚡ Performance Optimizations

| Change | Impact |
|---|---|
| **API Performance Monitoring** | Every API call (frontend → backend → LLM service) is now instrumented with timing. Open DevTools console — you'll see `🚀` (<500ms), `⚡` (<1s), or `🐌` (>1s) grades for every request |
| **DevTools Performance Overlay** | Press `Ctrl+Shift+P` anywhere in the app to open a live panel showing recent API calls with timing, success/failure status, and cache hit rate |
| **Backend Request Timing Middleware** | Laravel now logs `X-Response-Time` header + structured timing data (`method`, `uri`, `duration_ms`, `status`) for every request to `storage/logs/laravel.log` |
| **Slow Query Logging** | Database queries taking >100ms are automatically logged to Laravel's log with the SQL, bindings, and duration |
| **N+1 Query Fix** | Conversation loading now eager-loads messages and documents in a single query instead of N+1 separate queries |

### 💾 Smart LocalStorage Caching

Data now loads **instantly** from localStorage cache, then refreshes silently in the background:

| Resource | Cache TTL | What you'll notice |
|---|---|---|
| Projects list | 5 minutes | Projects appear immediately on page load |
| Conversations list | 2 minutes | Conversation list shows instantly; no blank flash |
| LLM Models list | 1 hour | Model selector loads without a network request |
| Requirements | Per-filter cache | Requirements appear instantly when you switch filters |
| Conflicts | 5 minutes | Conflict panel shows cached results immediately |

**Cache busting is automatic** — when you create, update, or delete a conversation, project, or requirement, the cache is invalidated immediately so you never see stale data.

### 🎨 Animations & Responsive Feel

| Component | Improvement |
|---|---|
| **Skeleton loaders** | Shimmer gradient animation replaces pulsing grey blocks — looks much more polished |
| **Thinking indicator** | 🐟 now has a CSS wave wiggle, bubble trail, and thinking dots animation |
| **Message bubbles** | Spring-eased entrance animation with GPU acceleration |
| **Activity feed** | New items slide in from the right with stagger |
| **Conversation list** | Items slide in from the left when loaded |
| **Requirements list** | Rows fade up with stagger on load |
| **Toast notifications** | Error and success messages now slide in as toasts (top-right) instead of console-only |
| **Accessibility** | Animations respect `prefers-reduced-motion` — users who prefer reduced motion see no animations |

### 🔧 Docker Production Build

All three Docker containers have been converted from dev-mode to production:

| Container | Before | After |
|---|---|---|
| **frontend** | `npm run dev` (live reload, source mount) | **Multi-stage nginx build** — served as static assets, gzip compressed, 1-year cache on hashed assets |
| **backend** | `php artisan serve` (single-threaded) | **PHP-FPM + nginx** — OPcache enabled, realpath cache tuned, `--no-dev` Composer, hardened security headers |
| **llm** | `uvicorn --reload` + bind mount | **Built once, no reload** — stable production uvicorn |

### 🔐 Bug Fixes

- **`sharingService.js` & `graphService.js`** — Fixed import bug where these files were calling `api.js` (bare fetch, no JWT auth) instead of `auth.js` (JWT + auto-refresh). Collaborator and story graph requests now carry proper authentication.

---

## 📖 How to Use (Step-by-Step)

### 1️⃣ Sign Up & Login

- Open http://localhost:5173
- Click "Sign Up" and create your account
- You'll be logged in automatically

### 2️⃣ Create Your First Project

- Click **"+ New Project"** button
- Enter a name (e.g., "Mobile Banking App")
- Add a brief description
- Click "Create"

### 3️⃣ Upload Documents

- Open your project
- Go to **"Documents"** section
- Drag & drop or click to upload files
- Supported: PDF, Word (.doc/.docx), Text (.txt), Markdown (.md)

### 4️⃣ Extract Requirements (AI Magic! ✨)

- Click **"Process Document"** on your uploaded file
- Watch the AI analyze your document in real-time
- Requirements are automatically extracted and categorized
- Review and edit as needed

### 5️⃣ Use AI Personas (8 Different Perspectives)

- Go to **"Personas"** tab in your project
- Choose from 8 expert personas:
  - 👤 End User - Usability & UX focus
  - 📊 Product Manager - Business value
  - 💻 Developer - Technical implementation
  - 🧪 QA Tester - Testing & quality
  - 📈 Business Analyst - Business processes
  - 🏗️ System Architect - Architecture & scale
  - 🔒 Security Expert - Security & compliance
  - ⚙️ System Admin - Operations & maintenance
- Click any persona to generate requirements from their viewpoint

### 6️⃣ Detect Conflicts

- Click **"Detect Conflicts"** in your project
- AI finds contradictions and inconsistencies
- Review conflicts with detailed explanations
- Resolve by editing requirements

### 7️⃣ Chat with AI

- Click **"Chat"** in navigation
- Select your project
- Ask questions like:
  - "What are the security requirements?"
  - "Summarize authentication features"
  - "Are there any missing mobile requirements?"
- Get instant AI responses with context from your documents

---

## 🎓 Example: Your First Project in 5 Minutes

Let's create a simple e-commerce project:

```
1. Sign up and login ✅

2. Create Project:
   Name: "Online Store"
   Description: "E-commerce website with cart and checkout"

3. Upload a document:
   Create a text file with requirements like:
   "Users should be able to browse products,
   add items to cart, and checkout with payment"

4. Click "Process Document" ✅
   → AI extracts 10-20 requirements automatically

5. Try Personas:
   Click "Security Expert" persona
   → Get security-focused requirements

6. Chat:
   Ask: "What payment features do we need?"
   → Get AI suggestions

7. Done! 🎉 You now have a structured requirements document
```

**That's it!** You've just used AI to analyze requirements in minutes.

### 📑 Table of Contents

**🆕 New Users - Start Here:**

- [Quick Start (3 Steps)](#-quick-start-for-new-users) ⭐ **Start here!**
- [How to Use (Step-by-Step)](#-how-to-use-step-by-step)
- [Example: First Project in 5 Minutes](#-example-your-first-project-in-5-minutes)
- [What Can It Do?](#-what-can-llm4reqs-do)
- [FAQ](#-faq-frequently-asked-questions)

**⚙️ Setup & Installation:**

- [Prerequisites](#-prerequisites-check-these-first)
- [Automated Installation](#-automated-installation-recommended)
- [Manual Installation](#-manual-installation-step-by-step)
- [Starting the Application](#-starting-the-application)

**📚 Advanced Usage:**

- [Usage Tips & Best Practices](#-usage-tips--best-practices)
- [Common Tasks](#-common-tasks--quick-reference)
- [Example Workflows](#-example-workflow)

**🛠️ Technical Documentation:**

- [Architecture](#-architecture)
- [Project Structure](#-project-structure)
- [API Documentation](#-complete-package-lists)
- [Troubleshooting](#-common-issues--solutions)
- [Useful Commands](#-useful-commands)

---

## ✨ What Can LLM4Reqs Do?

### Core Features

**📄 Document Upload & Processing**

- Upload PDF, Word (DOC/DOCX), Text, and Markdown files
- Automatic text extraction and parsing
- Support for multiple documents per project
- Example: Upload your product spec and get structured requirements instantly

**🤖 AI-Powered Requirement Extraction**

- Automatically identifies software requirements from documents
- Categorizes into Functional, Non-Functional, and User Stories
- Extracts key details like priority, dependencies, and acceptance criteria
- Example: Paste "Users need secure login" → AI extracts full authentication requirements

**👥 8 Expert AI Personas**
Get requirements from different professional perspectives:

- 👤 **End User** - "How easy is it to use?"
- 📊 **Product Manager** - "What's the business value?"
- 💻 **Developer** - "Can we build this?"
- 🧪 **QA Tester** - "How do we test it?"
- 📈 **Business Analyst** - "Does it fit the workflow?"
- 🏗️ **System Architect** - "Will it scale?"
- 🔒 **Security Expert** - "Is it secure?"
- ⚙️ **System Admin** - "Can we maintain it?"

**⚔️ Smart Conflict Detection**

- AI finds contradictions between requirements
- Domain-agnostic (works for any project type)
- Uses RAG (Retrieval-Augmented Generation) for accuracy
- Example: Detects "must respond in 2 seconds" vs "requires 5-second API call"

**💬 Interactive AI Chat**

- Ask questions about your requirements
- Get instant answers with document context
- Brainstorm missing requirements
- Example: "What security requirements are we missing?"

**📊 Project Management**

- Organize multiple projects
- Track requirements across documents
- Tag and prioritize requirements
- Export requirements as PDF/CSV/JSON

**🔒 Secure & Private**

- All data stored locally on your machine
- Token-based authentication
- No cloud storage required
- Your documents never leave your computer

---

## 🎯 Architecture

| Component        | Technology        | Port | Purpose            |
| ---------------- | ----------------- | ---- | ------------------ |
| **Backend**      | Laravel/PHP       | 8001 | REST API, Database |
| **Frontend**     | React/Vite        | 5173 | User Interface     |
| **LLM Service**  | Python/FastAPI    | 8000 | AI Processing      |
| **Reverb**       | Laravel WebSocket | 8080 | Real-time Updates  |
| **Queue Worker** | Laravel Queue     | -    | Background Jobs    |

---

## 📥 Installation Guide

### ✅ Prerequisites (Check These First)

Before installing, verify you have these tools installed. **Don't worry if you don't have them** - we'll show you where to get them!

| Software     | Version Needed | How to Check                  | Where to Download                                      |
| ------------ | -------------- | ----------------------------- | ------------------------------------------------------ |
| **PHP**      | 8.2 or higher  | Open terminal, type: `php -v` | [Download PHP](https://www.php.net/downloads)          |
| **Composer** | Latest         | Type: `composer -V`           | [Download Composer](https://getcomposer.org/download/) |
| **Node.js**  | 18 or higher   | Type: `node -v`               | [Download Node.js](https://nodejs.org/) (choose LTS)   |
| **Python**   | 3.8 or higher  | Type: `python --version`      | [Download Python](https://www.python.org/downloads/)   |
| **Git**      | Any recent     | Type: `git --version`         | [Download Git](https://git-scm.com/downloads)          |

**💡 Quick Check: Do I have everything?**

Open your terminal/PowerShell and run these commands:

```powershell
php -v && composer -V && node -v && python --version && git --version
```

If you see version numbers for all, you're ready to install! ✅

**🔧 Installation Tips:**

- **Windows users**: Use XAMPP, WAMP for PHP, or download PHP directly
- **Python**: During install, CHECK the box "Add Python to PATH"
- **Node.js**: Choose the LTS (Long Term Support) version
- **Composer**: Make sure it's accessible from command line (in PATH)

### 🚀 Automated Installation (Recommended)

The fastest way to get started:

```powershell
# 1. Clone repository
git clone https://github.com/bucecto123/LLM4Reqs.git
cd LLM4Reqs

# 2. Run automated setup (installs everything!)
.\setup-all.ps1

# 3. Get your FREE GROQ API key from https://console.groq.com/
# 4. Edit llm\.env and add: GROQ_API_KEY=your_key_here

# 5. Start all services
.\start-dev.ps1
```

**That's it!** Open http://localhost:5173 in your browser.

### 📝 Manual Installation (Step-by-Step)

If you prefer to install each component manually, follow the detailed steps below.

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

---

## 🎬 Starting the Application

### ✨ Easy Method (One Command)

```powershell
# From the project root directory
.\start-dev.ps1
```

This automatically opens **5 terminal windows** for:

1. Backend API (Laravel)
2. Frontend (React)
3. LLM Service (Python/FastAPI)
4. WebSocket Server (Reverb)
5. Background Queue Worker

**Wait 10-15 seconds** for all services to start, then open your browser to **http://localhost:5173**

### 🔧 Manual Method (5 Terminals)

If you prefer manual control, open 5 separate terminals:

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
php artisan serve --port=8001

# Terminal 4: Reverb WebSocket
cd backend
php artisan reverb:start

# Terminal 5: Queue Worker
cd backend
php artisan queue:work --tries=3
```

### 🐳 Docker (Compose)

Run everything with Docker Compose from the project root:

```powershell
# Start all services in the background
docker compose up -d

# Stop all services
docker compose down

# Stop services and remove volumes (resets DB data)
docker compose down -v

# Tail logs
docker compose logs -f
```

**When you update code:**

- **App code changes** (backend/frontend/llm): no rebuild needed; containers see changes via bind mounts.
- **Dependency changes** (composer.json / package.json / requirements.txt):

```powershell
docker compose build
docker compose up -d
```

- **Database schema changes:**

```powershell
docker compose exec backend php artisan migrate
```

- **.env changes:** restart the affected service:

```powershell
docker compose restart backend
```

### 🌐 Access Points

Once running, you can access:

| Service         | URL                        | What it does                     |
| --------------- | -------------------------- | -------------------------------- |
| **Frontend**    | http://localhost:5173      | Main web interface (start here!) |
| **Backend API** | http://localhost:8001/api  | REST API for data                |
| **LLM Service** | http://localhost:8000      | AI processing engine             |
| **API Docs**    | http://localhost:8000/docs | Interactive API documentation    |
| **WebSocket**   | ws://localhost:8080        | Real-time updates                |

---

## 💼 Real-World Use Cases

### For Product Managers

**Scenario:** You have a 50-page product spec document.

✅ **With LLM4Reqs:**

1. Upload the PDF (30 seconds)
2. AI extracts 100+ requirements automatically (2 minutes)
3. Run conflict detection to find inconsistencies (1 minute)
4. Use personas to ensure all perspectives covered (3 minutes)
5. Export organized requirements (30 seconds)

**Total Time:** ~7 minutes ⚡ (vs. days of manual work!)

### For Developers

**Scenario:** Client sends vague requirements via email.

✅ **With LLM4Reqs:**

1. Copy-paste email into a text file and upload
2. AI extracts and structures requirements
3. Use Developer persona to identify technical gaps
4. Chat: "What are the technical dependencies?"
5. Get clear, actionable requirements

### For Business Analysts

**Scenario:** Multiple stakeholders with conflicting needs.

✅ **With LLM4Reqs:**

1. Upload documents from each stakeholder
2. Extract requirements from all sources
3. Run conflict detection
4. AI highlights contradictions with explanations
5. Resolve conflicts with stakeholders

### For Students

**Scenario:** Requirements engineering course project.

✅ **With LLM4Reqs:**

1. Upload project documents
2. Learn by comparing AI-extracted vs manual requirements
3. Experiment with different personas
4. Understand conflict detection patterns
5. Export professional documentation

---

## 🎨 What the Interface Looks Like

### Dashboard View

When you first login, you'll see your project dashboard:

```
┌─────────────────────────────────────────────────────────────┐
│  🏠 LLM4Reqs                    [Projects] [Chat] [Profile]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📊 My Projects                            [+ New Project] │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  📁 Mobile Banking App        Last updated: 2 hrs ago │ │
│  │  Status: Active • 12 requirements • 3 documents       │ │
│  │  [Open Project] [Chat] [Export]                       │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  📁 E-Commerce Platform      Last updated: 1 day ago  │ │
│  │  Status: Active • 28 requirements • 5 documents       │ │
│  │  [Open Project] [Chat] [Export]                       │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Inside a Project

Click any project to see detailed requirements management:

```
┌─────────────────────────────────────────────────────────────┐
│  📁 Mobile Banking App                          [Export ⬇]  │
├─────────────────────────────────────────────────────────────┤
│  [📄 Documents] [📋 Requirements] [👥 Personas] [⚔️ Conflicts] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📄 Documents (3)                       [+ Upload Document] │
│                                                             │
│  ✅ Product_Requirements.pdf         [Process] [View]       │
│     Status: Processed • 45 requirements extracted           │
│                                                             │
│  ✅ User_Stories.docx                [Process] [View]       │
│     Status: Processed • 28 requirements extracted           │
│                                                             │
│  📄 Technical_Specs.md               [Process] [View]       │
│     Status: Ready to process                               │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  📋 Requirements (73)               [Detect Conflicts]      │
│                                                             │
│  🟢 REQ-001: User Authentication                           │
│     "Users must be able to login securely using email      │
│      and password with two-factor authentication"          │
│     Type: Functional • Priority: High                       │
│     Tags: Security, Authentication, Core                    │
│     [Edit] [Delete] [View Details]                         │
│                                                             │
│  🟢 REQ-002: Biometric Login                               │
│     "System shall support fingerprint and face ID"          │
│     Type: Functional • Priority: Medium                     │
│     Tags: Biometric, Security, iOS, Android                 │
│     [Edit] [Delete] [View Details]                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### AI Chat Interface

Ask questions and get intelligent answers:

```
┌─────────────────────────────────────────────────────────────┐
│  💬 AI Chat Assistant                    Project: Banking App│
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  👤 You:                                                    │
│  What security requirements do we have for user data?       │
│                                                             │
│  🤖 AI Assistant:                                           │
│  Based on your project documents, here are the security     │
│  requirements:                                              │
│                                                             │
│  1. User Authentication (REQ-001)                           │
│     - Email/password with 2FA                               │
│     - Session timeout after 15 minutes                      │
│                                                             │
│  2. Data Encryption (REQ-015)                               │
│     - All data encrypted at rest using AES-256              │
│     - TLS 1.3 for data in transit                           │
│                                                             │
│  3. Biometric Security (REQ-002)                            │
│     - Fingerprint and Face ID support                       │
│                                                             │
│  Would you like me to check for any missing security        │
│  requirements?                                              │
│                                                             │
│  [Type your question...]                          [Send →]  │
└─────────────────────────────────────────────────────────────┘
```

---

## 💡 Usage Tips & Best Practices

### 📝 Document Tips for Better Results

**✅ DO:**

- Use clear headings and structure (helps AI understand context)
- Include specific details and numbers ("response time < 200ms")
- Upload multiple related documents (specs, user stories, mockups)
- Use consistent terminology throughout documents

**❌ AVOID:**

- Extremely long documents without structure (break into sections)
- Vague statements ("should be fast" → specify "< 200ms")
- Mixing multiple unrelated topics in one document
- Using lots of jargon without definitions

**💡 Pro Tip:** The more structured your input, the better the AI extraction!

### 🎯 Requirement Management Best Practices

**Review AI Output (Always!)**

- AI is very good, but not perfect
- Check for accuracy and completeness
- Edit requirements to match your exact needs
- Think of AI as a smart assistant, not a replacement

**Organize Effectively**

- Use tags: `MVP`, `v2.0`, `Critical`, `Backend`, `Frontend`
- Set clear priorities: High/Medium/Low
- Group related requirements together
- Add notes for context and rationale

**Track Changes**

- Document why requirements changed
- Keep old versions for reference
- Note stakeholder decisions
- Track approval status

### 👥 Using Personas Effectively

**Recommended Workflow:**

1. **Start with Product Manager** → Get business-focused requirements
2. **Then Business Analyst** → Understand workflows and processes
3. **Add Developer perspective** → Check technical feasibility
4. **Include System Architect** → Ensure scalability and architecture
5. **Check Security Expert** → Identify security needs (critical!)
6. **Don't skip QA Tester** → Get testability requirements
7. **Consider End User** → Validate usability
8. **Finally System Admin** → Check operational requirements

**💡 Pro Tip:** Not all personas needed for every project. Choose 3-4 most relevant!

### ⚔️ Conflict Detection Strategy

**When to Run:**

- ✅ After uploading multiple documents
- ✅ Before finalizing requirements
- ✅ When merging requirements from different sources
- ✅ During stakeholder review meetings

**How to Use Results:**

- Read conflict explanations carefully
- Involve stakeholders in resolution
- Document resolution decisions
- Re-run detection after major changes

**Common Conflicts:**

- Performance vs. Feature complexity
- Cost vs. Quality requirements
- Security vs. Usability
- Timeline vs. Scope

### 💬 Getting the Most from AI Chat

**Good Questions:**

```
✅ "List all requirements related to user authentication"
✅ "What security requirements are we missing?"
✅ "Summarize the performance requirements"
✅ "Are there conflicts between REQ-001 and REQ-015?"
```

**Less Effective Questions:**

```
❌ "Tell me about login"  (too vague)
❌ "What's good?"  (no context)
❌ "Help"  (be specific)
```

**💡 Pro Tips:**

- Reference specific requirement IDs
- Mention document names for context
- Ask follow-up questions to dig deeper
- Use chat to brainstorm missing requirements
- Ask "What if?" scenarios

### 👤 Quick Start Guides by Role

#### 🎨 Product Managers - Feature Planning

**Your Goal:** Organize feature requests and ensure nothing is missed.

**Quick Workflow:**

```
1. Upload: Product specs, stakeholder emails, meeting notes
2. Process: Let AI extract all feature requirements
3. Personas: Use Product Manager + Business Analyst
4. Chat: "What features are missing from the MVP?"
5. Export: Share organized requirements with team
```

**Time Saved:** Hours of manual organization → 10 minutes ⚡

#### 💻 Developers - Understanding Requirements

**Your Goal:** Get clear, technical requirements to build against.

**Quick Workflow:**

```
1. Upload: Technical specs, API docs, architecture docs
2. Process: Extract technical requirements
3. Personas: Use Developer + System Architect
4. Chat: "What are the technical dependencies?"
5. Conflict Check: Find contradicting specs
```

**Benefit:** No more "wait, what did they mean by this?" 🤔

#### 📊 Business Analysts - Requirements Documentation

**Your Goal:** Create comprehensive, conflict-free requirements docs.

**Quick Workflow:**

```
1. Upload: All stakeholder documents
2. Process: Extract from each source
3. Personas: Use ALL 8 personas for complete coverage
4. Conflict Detection: Find and resolve contradictions
5. Export: Professional requirements document
```

**Output:** Publication-ready requirements document 📄

#### 🧪 QA Engineers - Test Planning

**Your Goal:** Identify what needs testing and create test scenarios.

**Quick Workflow:**

```
1. Upload: Requirements docs, user stories
2. Process: Extract testable requirements
3. Personas: Use QA Tester + End User
4. Chat: "What edge cases should we test?"
5. Export: Test case requirements list
```

**Result:** Comprehensive test coverage from day one ✅

#### 🎓 Students - Learning & Projects

**Your Goal:** Complete coursework and learn best practices.

**Quick Workflow:**

```
1. Upload: Your project documents or case studies
2. Process: See how AI structures requirements
3. Experiment: Try different personas
4. Learn: Compare AI output with manual extraction
5. Submit: Export professional documentation
```

**Learn By Doing:** See requirements engineering in action! 📚

#### 🔒 Security Teams - Risk Assessment

**Your Goal:** Identify security requirements and risks.

**Quick Workflow:**

```
1. Upload: System specs, data flow diagrams
2. Process: Extract security-related requirements
3. Personas: Use Security Expert + System Architect
4. Chat: "What security risks are we missing?"
5. Report: Security requirements checklist
```

**Find Gaps:** Discover security requirements others missed 🛡️

---

---

## 🎥 Video Tutorial

**Coming Soon!** We're preparing video tutorials to help you get started. For now, follow the step-by-step guide above.

**What the interface looks like:**

```
┌─────────────────────────────────────────────────────────────┐
│  LLM4Reqs                    [Projects] [Chat] [Profile]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📊 Dashboard                              [+ New Project] │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  📁 Mobile Banking App        Last updated: 2 hrs ago │ │
│  │  12 requirements • 3 documents • 2 conflicts          │ │
│  │  [Open Project]                                       │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  📁 E-Commerce Website       Last updated: 1 day ago  │ │
│  │  28 requirements • 5 documents • 0 conflicts          │ │
│  │  [Open Project]                                       │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Inside a project:**

```
┌─────────────────────────────────────────────────────────────┐
│  📁 Mobile Banking App                          [Export ⬇]  │
├─────────────────────────────────────────────────────────────┤
│  [Documents] [Requirements] [Personas] [Conflicts] [Chat]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📄 Documents (3)                       [+ Upload Document] │
│                                                             │
│  ✅ Product_Requirements.pdf         [Process] [Delete]     │
│  ✅ User_Stories.docx               [Process] [Delete]     │
│  ✅ Technical_Specs.md              [Process] [Delete]     │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  📋 Requirements (12)               [Detect Conflicts]      │
│                                                             │
│  🟢 REQ-001: User must be able to login securely           │
│     Priority: High • Tags: Security, Authentication         │
│                                                             │
│  🟢 REQ-002: System shall support fingerprint auth         │
│     Priority: Medium • Tags: Biometric, Security            │
│                                                             │
│  🟡 REQ-003: Transaction history must be stored...         │
│     Priority: High • Tags: Data, Storage                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎓 Example Workflow

Here's a complete workflow from start to finish:

### Scenario: Building a E-Commerce Mobile App

```
1. Create Project: "E-Commerce Mobile App"
2. Upload Documents:
   - Product_Requirements_Document.pdf
   - User_Stories.docx
   - Technical_Specifications.md

3. Extract Requirements (Auto-generates ~50-100 requirements)

4. Generate Persona Requirements:
   - Product Manager → Business requirements
   - Developer → Technical implementation needs
   - Security Expert → Authentication, payment security
   - QA Tester → Test cases and quality criteria

5. Run Conflict Detection:
   - Found: "Payment must be processed within 2 seconds" conflicts with
     "All transactions must be verified by external API (avg 3-5 seconds)"
   - Resolved: Updated to "Payment must complete within 5 seconds"

6. Chat with AI:
   Q: "What are the requirements for offline mode?"
   A: [AI lists 8 requirements related to offline functionality]

   Q: "Are we missing any requirements for user notifications?"
   A: [AI suggests push notifications, email alerts, in-app messages]

7. Export & Share:
   - Download requirements as PDF/Excel
   - Share with team for review
   - Continue iterating
```

---

## 🛠️ Daily Usage

### Starting Your Work Day

```powershell
# 1. Navigate to project
cd LLM4Reqs

# 2. Start all services
.\start-dev.ps1

# 3. Open browser to http://localhost:5173

# 4. Login and start working!
```

### Stopping Services

Press `Ctrl + C` in each terminal window, or:

```powershell
# Kill all at once
taskkill /F /IM php.exe
taskkill /F /IM node.exe
taskkill /F /IM python.exe
```

---

## 🚀 Common Tasks & Quick Reference

### ✅ How Do I...?

#### Add a New User to My Project?

Currently single-user per project. Multi-user collaboration coming in future updates!

#### Export My Requirements?

1. Go to your project
2. Click "Export" button (top right)
3. Choose format: PDF, CSV, or JSON
4. Download the file

#### Edit a Requirement?

1. Click on any requirement card
2. Edit the text, priority, or tags
3. Click "Save" or press `Enter`
4. Changes are saved automatically!

#### Delete a Document?

1. Go to Documents section
2. Click the "..." menu on any document
3. Select "Delete"
4. Confirm deletion

#### Search Requirements?

1. Use the search bar at the top of your project
2. Search by keywords, tags, or requirement ID
3. Results update in real-time

#### Switch Between Projects?

1. Click "Projects" in the navigation menu
2. Click on any project to open it
3. Or use the project dropdown in the header

#### Get Help with AI?

1. Open the Chat feature
2. Type your question
3. AI has context of all your project documents and requirements

### 🔑 Keyboard Shortcuts

| Action              | Shortcut              |
| ------------------- | --------------------- |
| Search requirements | `Ctrl + F` or `/`     |
| New project         | `Ctrl + N`            |
| Open chat           | `Ctrl + K`            |
| Save changes        | `Ctrl + S` or `Enter` |
| Close modal         | `Esc`                 |

### 📊 Understanding AI Confidence Scores

When requirements are extracted, you'll see confidence scores:

- 🟢 **High (>80%)**: Very confident, likely accurate
- 🟡 **Medium (50-80%)**: Fairly confident, review recommended
- 🔴 **Low (<50%)**: Less confident, definitely review and edit

Always review AI-generated content - the AI is a helpful assistant, not a replacement for human judgment!

---

## ❓ FAQ (Frequently Asked Questions)

### 🆕 First-Time User Questions

**Q: I've never used this before. Where do I start?**  
A: Follow the [Quick Start](#-quick-start-for-new-users) at the top! Install → Get API key → Run. Takes about 20 minutes total.

**Q: What's an API key and why do I need it?**  
A: It's a free password that lets you use GROQ's AI models. Sign up at [console.groq.com](https://console.groq.com) - takes 2 minutes, no credit card needed.

**Q: Do I need to be technical to use this?**  
A: No! The interface is user-friendly. If you can upload a file and click buttons, you can use LLM4Reqs.

**Q: How much does it cost?**  
A: Free! GROQ provides free API access. You just need to sign up for a key.

**Q: Can I try it without installing?**  
A: Unfortunately no, you need to install it locally. But our automated setup makes it easy!

### 🔒 Privacy & Security

**Q: Is my data stored online?**  
A: **No!** Everything runs locally on your computer. Your documents never leave your machine. Only anonymous API requests go to GROQ for AI processing.

**Q: What data does GROQ see?**  
A: Only the text you send for AI processing (requirement extraction, chat). Your documents stay local.

**Q: Can others see my projects?**  
A: No, only you. Everything is stored in your local database.

**Q: How do I backup my data?**  
A: Copy the file `backend/database/database.sqlite` - that's your entire database!

### ⚡ Usage Questions

**Q: How accurate is the AI?**  
A: Very good! But always review AI output. Think of it as a smart assistant that does 80-90% of the work, you refine the rest.

**Q: Can I edit AI-generated requirements?**  
A: Absolutely! Click any requirement to edit. The AI gives you a starting point.

**Q: How many documents can I upload?**  
A: No hard limit, but best performance with <50 documents per project.

**Q: What file size limit?**  
A: 20MB per file. For larger files, split them or extract text separately.

**Q: What file types are supported?**  
A: PDF, Word (.doc/.docx), Plain Text (.txt), and Markdown (.md)

**Q: Can I upload images/diagrams?**  
A: You can upload PDFs with images, but AI only extracts text. For diagrams, describe them in text.

**Q: Do I need internet?**  
A: Yes, for AI API calls. But document upload and viewing works offline.

### 🛠️ Technical Questions

**Q: Can I use a different AI model?**  
A: Yes! Edit `llm/.env` and change `GROQ_MODEL`. See options at console.groq.com

**Q: Can I use MySQL instead of SQLite?**  
A: Yes! Edit `backend/.env` database settings. Run `php artisan migrate` after.

**Q: Can I run this on Mac/Linux?**  
A: Yes! Use bash scripts instead of PowerShell. All commands are cross-platform.

**Q: Why are there 5 terminals?**  
A: Each service (Backend, Frontend, LLM, WebSocket, Queue) runs separately. This is normal for development.

**Q: Can I close terminal windows?**  
A: Closing a terminal stops that service. Keep all 5 open while using the app.

**Q: How do I stop all services?**  
A: Press Ctrl+C in each window, or run: `taskkill /F /IM php.exe && taskkill /F /IM node.exe && taskkill /F /IM python.exe`

### 🎯 Performance Questions

**Q: AI responses are slow. Why?**  
A: Free GROQ API has rate limits. For faster responses, upgrade to a paid GROQ plan or use a local LLM.

**Q: How long does requirement extraction take?**  
A: Usually 30 seconds to 2 minutes depending on document size and AI load.

**Q: Can I process multiple documents at once?**  
A: Yes! Upload multiple files and process them one by one or together.

**Q: The app feels slow. Help?**  
A: Check all 5 services are running. Restart services if needed. Check internet connection for AI calls.

### 🤝 Collaboration Questions

**Q: Can multiple users work on the same project?**  
A: Not currently. Each installation is single-user. Multi-user support is planned for future!

**Q: How do I share my requirements with my team?**  
A: Export as PDF/CSV/JSON and share the file. Or share your database file (contains everything).

**Q: Can I import requirements from another tool?**  
A: You can upload documents in supported formats (PDF, Word, Text, Markdown).

### 📱 Platform Questions

**Q: Does it work on Windows?**  
A: Yes! That's our primary platform.

**Q: Does it work on Mac?**  
A: Yes! Use bash instead of PowerShell for commands.

**Q: Does it work on Linux?**  
A: Yes! Same as Mac, use bash commands.

**Q: Is there a mobile app?**  
A: Not yet. Use the web interface on mobile browsers (works but not optimized).

---

## ⚠️ Common Mistakes & How to Avoid Them

### ❌ Mistake #1: Forgot to Add GROQ API Key

**Symptom:** AI features don't work, errors about API key

**Solution:**

```powershell
# Edit llm\.env and add your key:
GROQ_API_KEY=gsk_your_actual_key_here
```

**Prevention:** Get your key from [console.groq.com](https://console.groq.com) during setup!

### ❌ Mistake #2: Not Activating Python Virtual Environment

**Symptom:** "Module 'fastapi' not found" error

**Solution:**

```powershell
cd llm
.\env\Scripts\Activate.ps1  # You should see (env) in prompt
```

**Prevention:** Always activate before running LLM service!

### ❌ Mistake #3: Starting Services in Wrong Order

**Symptom:** Services can't connect to each other

**Solution:**
Use the automated script:

```powershell
.\start-dev.ps1
```

**Or start manually in this order:** LLM → Frontend → Backend → Reverb → Queue

### ❌ Mistake #4: Closed a Terminal Window

**Symptom:** Part of the app stops working

**Solution:**
Restart that specific service or just run `.\start-dev.ps1` again.

**Prevention:** Keep all 5 terminal windows open while using the app!

### ❌ Mistake #5: Port Already in Use

**Symptom:** "Address already in use" error

**Solution:**

```powershell
# Find and kill the process:
netstat -ano | findstr :8001  # Replace with your port
taskkill /PID <PID> /F
```

**Prevention:** Close services properly with Ctrl+C before restarting.

### ❌ Mistake #6: Didn't Run Migrations

**Symptom:** Database errors, "table doesn't exist"

**Solution:**

```powershell
cd backend
php artisan migrate:fresh --seed
```

**Prevention:** Run migrations during initial setup!

### ❌ Mistake #7: Uploading Unsupported Files

**Symptom:** Upload fails or text not extracted

**Solution:**
Only use: PDF, Word (.doc/.docx), Text (.txt), Markdown (.md)

**Prevention:** Convert other formats to supported types first.

### ❌ Mistake #8: Expecting Perfect AI Output

**Symptom:** Requirements seem wrong or incomplete

**Solution:**
AI is a smart assistant, not perfect. Always review and edit output.

**Prevention:** Budget time to review and refine AI-generated requirements.

---

### Technical Questions

**Q: Can I use MySQL instead of SQLite?**  
A: Yes! Edit `backend/.env` and change the database settings. Run migrations afterward.

**Q: How do I backup my data?**  
A: Copy the `backend/database/database.sqlite` file. That's your entire database!

**Q: Can I run this on Mac/Linux?**  
A: Yes! The system works on all platforms. Use bash scripts instead of PowerShell.

**Q: The AI responses are slow. Why?**  
A: Free GROQ API has rate limits. Upgrade to a paid plan or switch to a local LLM.

**Q: How do I update to the latest version?**

```powershell
git pull origin main
cd backend && composer update
cd ../frontend && npm update
cd ../llm && pip install -r requirements.txt --upgrade
```

### Troubleshooting Questions

**Q: I get "Port already in use" errors**  
A: Another service is using the port. Kill it:

```powershell
netstat -ano | findstr :PORT
taskkill /PID <PID> /F
```

**Q: The frontend won't connect to backend**  
A: Check that all 5 services are running. Verify URLs in `frontend/.env` match your setup.

**Q: AI extraction returns empty results**  
A: Check your GROQ_API_KEY is valid. Test at http://localhost:8000/docs

**Q: WebSocket connection fails**  
A: Ensure Reverb is running and `REVERB_APP_KEY` matches in both backend and frontend .env files.

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

---

## 🆘 Getting Help

### Before Asking for Help

1. **Check [Common Mistakes](#️-common-mistakes--how-to-avoid-them)** - Most issues are covered there!
2. **Check [FAQ](#-faq-frequently-asked-questions)** - Your question might be answered
3. **Check [Troubleshooting](#-common-issues--solutions)** - Detailed error solutions
4. **Try the Quick Fix:**
   ```powershell
   # Clear caches and restart
   cd backend && php artisan optimize:clear
   cd .. && .\start-dev.ps1
   ```

### Still Stuck?

**Gather this information:**

- What were you trying to do?
- What error message did you see? (copy exact text)
- Which service is having issues? (Backend/Frontend/LLM)
- Your OS and software versions (`php -v`, `node -v`, `python --version`)

**Get Help:**

- 📧 Check your course materials for support contact
- 💬 Ask your instructor or TA
- 📝 Check project documentation in the repo
- 🐛 If it's a bug, document steps to reproduce it

### Useful Debug Commands

```powershell
# Check if all services are running
netstat -ano | findstr ":8001 :5173 :8000 :8080"

# Check PHP/Composer versions
php -v
composer -V

# Check Node/npm versions
node -v
npm -v

# Check Python version
python --version

# Check backend logs
Get-Content backend\storage\logs\laravel.log -Tail 50

# Test backend health
curl http://localhost:8001/api/health

# Test LLM health
curl http://localhost:8000/health
```

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

## 🎯 What's Next? (After Installation)

### ✅ Just Installed? Here's Your Next Steps:

**1. Verify Everything Works (2 minutes)**

```powershell
# Visit these URLs in your browser:
http://localhost:5173       # Frontend - Should show login page
http://localhost:8001/api/health  # Backend - Should show {"status":"healthy"}
http://localhost:8000/docs   # LLM API - Should show API documentation
```

**2. Create Your Account (1 minute)**

- Go to http://localhost:5173
- Click "Sign Up"
- Fill in username, email, password
- Click "Create Account"

**3. Create Your First Project (3 minutes)**

- Click "+ New Project"
- Name it something simple like "Test Project"
- Add a description
- Click "Create"

**4. Upload a Test Document (2 minutes)**

- Open your new project
- Go to "Documents" tab
- Create a simple text file on your computer:
  ```
  The system must allow users to login with username and password.
  Users should be able to reset their password via email.
  The system must encrypt all user data.
  ```
- Save as `test_requirements.txt`
- Upload it to your project

**5. Extract Requirements (2 minutes)**

- Click "Process Document"
- Watch the AI work!
- Review the extracted requirements
- Try editing one

**6. Try AI Chat (2 minutes)**

- Click "Chat" in navigation
- Select your project
- Ask: "What security requirements do we have?"
- See the AI respond with context from your document

**🎉 Congratulations!** You've just used AI to extract and analyze requirements!

### 📚 Continue Learning

**Next Steps to Explore:**

1. **Try Personas** - See how different experts view your requirements
2. **Upload More Documents** - Try PDF, Word documents
3. **Detect Conflicts** - Upload documents with contradicting info
4. **Experiment with Chat** - Ask different types of questions
5. **Export Requirements** - Download as PDF/CSV

**Want to Learn More?**

- Read [Usage Tips](#-usage-tips--best-practices)
- Check [Role-Specific Guides](#-quick-start-guides-by-role)
- Review [Example Workflows](#-example-workflow)

### 🚀 Advanced Features (Once You're Comfortable)

- **RAG-Based Conflict Detection** - Find subtle contradictions
- **Multi-Document Projects** - Combine specs from multiple sources
- **Custom Tagging System** - Organize requirements your way
- **Requirement Export** - Generate professional documentation
- **API Integration** - Use the REST API for automation

---

## 🎓 For Instructors & Course Staff

This tool is designed for **Computing Technology Project A (COS40005)** and similar courses.

### Educational Value

- **Teaches Requirements Engineering** - Hands-on experience with AI-assisted RE
- **Introduces Modern Tools** - Full-stack development, AI integration, microservices
- **Practical Application** - Students work with real documents and requirements
- **Multiple Technologies** - PHP/Laravel, React, Python, FastAPI, WebSockets

### Suggested Course Activities

1. **Week 1-2:** Install and familiarize with the tool
2. **Week 3-4:** Upload project documents and extract requirements
3. **Week 5-6:** Compare manual vs AI extraction
4. **Week 7-8:** Use personas to understand different perspectives
5. **Week 9-10:** Conflict detection and resolution
6. **Week 11-12:** Final project using the tool

### Assessment Ideas

- Compare AI-extracted requirements vs manual extraction
- Analyze persona-based requirement differences
- Document conflict resolution process
- Evaluate AI accuracy and bias
- Extend the tool with new features

---

**🚀 You're ready to go! Happy Requirements Engineering!**

**Need help?** Check the [Getting Help](#-getting-help) section or review [Common Mistakes](#️-common-mistakes--how-to-avoid-them).

**Want advanced features?** See [COMPLETE_KB_API_GUIDE.md](llm/COMPLETE_KB_API_GUIDE.md) for technical details.
