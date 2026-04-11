# 🚀 LLM4Reqs - AI-Powered Requirements Extraction

**LLM4Reqs** is an intelligent web application that uses Large Language Models to automatically analyze documents and extract software requirements. It features persona-based requirement generation, conflict detection, and interactive AI chat.

---

## 🎯 Quick Start for New Users (Docker Recommended)

The easiest way to run the application is using Docker. It will automatically set up the frontend, backend, websockets, and the AI service.

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running.
- [Git](https://git-scm.com/downloads) installed.
- A free API key from [Groq](https://console.groq.com/keys).

### Step 1: Clone the Repository

```bash
git clone https://github.com/bucecto123/LLM4Reqs.git
cd LLM4Reqs
```

### Step 2: Configure Environment Variables

The application needs some base configuration to run. We provide example configuration files you can copy.

**For the Backend:**
Copy the backend environment file:
* Windows: `copy backend\.env.example backend\.env`
* Linux/Mac: `cp backend/.env.example backend/.env`

**For the LLM Service:**
Copy the LLM environment file:
* Windows: `copy llm\.env.example llm\.env`
* Linux/Mac: `cp llm/.env.example llm/.env`

### Step 3: Add your Groq API Key

1. Log in to the [Groq Console](https://console.groq.com/keys) and create a free API key.
2. Open `llm/.env` in any text editor.
3. Replace `your-groq-api-key-here` with your actual API key:
   ```env
   GROQ_API_KEY=gsk_your_actual_key_here...
   ```

### Step 4: Start the Application

From the root directory of the project, run:
```bash
docker compose up -d
```
Docker will pull the necessary images, build the application variants, and start 5 services:
- `frontend` (React web interface)
- `backend` (Laravel API & DB Migration)
- `llm` (Python FastAPI service)
- `reverb` (Websockets for real-time connection)
- `queue` (Workers for background tasks)

*Wait about 30 seconds for the backend database migrations and setups to complete.*

### Step 5: Start Using LLM4Reqs!

Open your browser and navigate to: **http://localhost:5173**
*(Docker forwards port `5173` to the frontend container).*

---

## 📖 How to Use LLM4Reqs

Once the application is running, follow this workflow to extract requirements from your documents:

### 1️⃣ Sign Up & Login
- Open `http://localhost:5173`
- Click **Sign Up** and create an account. You will automatically be logged in.

### 2️⃣ Create a Project
- Click **+ New Project** on your dashboard.
- Give it a name (e.g., "Mobile Banking App") and a brief description.

### 3️⃣ Upload Documents
- Inside your project, navigate to the **Documents** section.
- Upload any reference material containing requirements (supports PDF, DOCX, TXT, MD).

### 4️⃣ AI Requirement Extraction
- Click **Process Document** next to your uploaded file.
- The AI will automatically read your document and split it into structured tracking cards (Functional, Non-Functional, User Stories).

### 5️⃣ Explore Perspectives with Personas
- Go to the **Personas** tab.
- Choose from 8 expert viewpoints (Security, Developer, Product Manager, QA, etc.).
- Allow the AI to draft requirements from the specific point of view of that stakeholder to uncover missing details.

### 6️⃣ Conflict Detection
- Navigate to the **Conflicts** tab.
- Click **Detect Conflicts**. The AI will analyze all project requirements to identify contradictions (like a requirement asking for "5 second response time" vs another asking for "2 second response time").

### 7️⃣ Chat with Your Documents
- Open the AI **Chat** interface.
- Ask questions directly about your loaded documents (e.g., "What are the security requirements we missed?").
- The system uses RAG (Retrieval-Augmented Generation) to give you accurate answers based strictly on your project docs.

---

## 🗂️ Project Structure

For developers looking to understand or modify the source code:

- `/frontend` - Built with **React** & **Vite**. Contains all user interface components.
- `/backend` - Built with **Laravel (PHP)**. Provides standard REST APIs, database connectivity (SQLite), WebSocket broadcasting, and background job queueing.
- `/llm` - Built with **Python (FastAPI)**. Connects to Groq models, embeds text, performs document processing, and manages the FAISS vector database.

## 🛑 Stopping the Application

To shut down the application and background containers, run:
```bash
docker compose down
```

To wipe the application data completely (this clears the SQLite database, logs, and caches), run:
```bash
docker compose down -v
```
