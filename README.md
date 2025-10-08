# COS40005 - Technology - Project A
## LLM4Reqs: Requirements Context Automation

LLM4Reqs is an AI-driven system that leverages Large Language Models (LLMs) to automatically generate software requirements and contextual usage scenarios. It contains three main parts in this repository:

- `backend/` - Laravel application (API + database and models)
- `frontend/` - Vite + React frontend
- `llm/` - Lightweight FastAPI service used for local LLM-related tooling (example integration)

This README shows how to get the full development environment running on Windows (PowerShell). Follow the sections below in order.

Prerequisites
-------------

- PHP 8.1+ and Composer (for Laravel backend)
- SQLite3 (or another database; the instructions use SQLite for simplicity)
- Node.js 18+ and npm or pnpm (for the frontend)
- Python 3.11+ and pip (for the `llm` service)
- Git (repo already present)

If you don't have these installed, please install them first. The commands below are written for PowerShell.

Backend (Laravel) - quick dev setup
-----------------------------------

1. Change to the backend folder:

```powershell
cd backend
```

2. Install PHP dependencies using Composer:

```powershell
composer install --no-interaction --prefer-dist
```

3. Copy the example env and set keys (use `.env` if you have one already):

```powershell
copy .env.example .env
php artisan key:generate
```

4. Configure the database (using SQLite for dev):

- Create the SQLite file used by Laravel:

```powershell
mkdir database -ErrorAction SilentlyContinue; New-Item -Path database\database.sqlite -ItemType File -Force
```

- In `.env` set these values (the defaults in the repo usually point to sqlite):

```
DB_CONNECTION=sqlite
DB_DATABASE=${PWD}\database\database.sqlite
```

5. Run migrations and seeders:

```powershell
php artisan migrate --seed
```

6. Start the Laravel dev server (optional; the frontend may call the API directly):

```powershell
php artisan serve --host=127.0.0.1 --port=8001
```

Notes:
- If you use MySQL/Postgres, update `.env` accordingly and run `php artisan migrate --seed`.
- If migrations fail, check `storage/logs/laravel.log` for details.

Frontend (Vite + React)
-----------------------

1. Change to the frontend folder and install dependencies:

```powershell
cd ..\frontend
npm install
```

2. Run the development server (Vite):

```powershell
npm run dev
```

By default Vite serves on `http://localhost:5173` (or a similar port). Configure proxy settings in `frontend/vite.config.js` or the frontend code to point API requests to the Laravel backend (for example `http://localhost:8001/api`).

3. Build for production:

```powershell
npm run build
```

LLM service (optional local FastAPI)
-----------------------------------

This repository includes a small FastAPI service under `llm/` used for LLM experiments. It's optional for running the web app but useful during development.

1. Change to the `llm` folder and create a virtual environment (recommended):

```powershell
cd ..\llm
python -m venv env
.\env\Scripts\Activate.ps1
pip install -r requirements.txt
```

2. Create or export any required environment variables (example):

```powershell
# Example - set GROQ API key or other model keys
$env:GROQ_API_KEY = 'your_api_key_here'
$env:GROQ_MODEL = 'gemma2-9b-it'
```

or you can create an .env file with the following content:
GROQ_API_KEY = 'your_api_key_here'
GROQ_MODEL = 'gemma2-9b-it'

3. Run the FastAPI app locally (development mode):

```powershell
uvicorn main:app --reload --host 127.0.0.1 --port 8001
```

The LLM service will be available at `http://127.0.0.1:8001` and the FastAPI OpenAPI docs at `/docs`.

Environment variables and configuration
---------------------------------------

- Backend `.env` (important keys):
  - `APP_KEY` (generated via `php artisan key:generate`)
  - `DB_CONNECTION`, `DB_DATABASE` (set these for SQLite/MySQL/Postgres)

- LLM service: set provider-specific API keys (example `GROQ_API_KEY`) in your shell or a `.env` and load them before running the service.

Testing and utilities
---------------------

- Run backend tests (if any):

```powershell
cd backend
php artisan test
```

- Run frontend tests (if set up):

```powershell
cd frontend
npm test
```

Troubleshooting
---------------

- Database errors: ensure `database/database.sqlite` exists and `.env` points to it.
- Migration class not found: ensure migration file names are unique and contain classes with names matching Laravel expectations. If you modify migrations, run `php artisan migrate:fresh --seed` in dev to rebuild.
- Permission errors on Windows: run PowerShell as administrator if you hit file permission issues creating SQLite files.

Useful commands summary (PowerShell)
------------------------------------

```powershell
# Backend
cd backend
composer install
copy .env.example .env
php artisan key:generate
New-Item -Path database\database.sqlite -ItemType File -Force
php artisan migrate --seed
php artisan serve --host=127.0.0.1 --port=8001

# Frontend
cd ..\frontend
npm install
npm run dev

# LLM service
cd ..\llm
.\env\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

Contributing
------------

If you plan to add features, please:

1. Create a feature branch from `dev`.
2. Run and update migrations carefully; prefer additive migrations.
3. Add tests for backend and frontend when possible.

License
-------

This project includes a `LICENSE` file in the repository root. Check it for licensing terms.

If you'd like, I can also:

- Add a small Laravel job that parses uploaded files and writes the extracted text to the `content` column we added, or
- Create a frontend example that uploads a document and displays parsed text.

---
Updated: README with full dev setup for backend, frontend, and the LLM helper service.
