# Running development services (Windows)

Two helper scripts are provided in the repository root to start the three development services (LLM, frontend, backend) on Windows.

- `start-dev.ps1` - PowerShell script that opens three new PowerShell windows and runs:
  - llm: activates `.venv` in `llm` if present and runs `uvicorn main:app --reload`
  - frontend: `npm run dev` in `frontend`
  - backend: `php artisan serve` in `backend`

- `start-dev.bat` - a small cmd/Explorer-friendly wrapper that runs the PowerShell script.

Usage:

1. From a PowerShell prompt in the repo root you can run:

   .\start-dev.ps1

   or, to run in the same window (no new windows):

   .\start-dev.ps1 -NoNewWindows

2. From Explorer or cmd.exe, double-click or run:

   start-dev.bat

Notes & troubleshooting:

- The script expects `uvicorn`, `npm`, and `php` to be available on your PATH. If they are installed inside project-specific runtimes (for example a global Python environment), ensure the commands are reachable.
- The PowerShell script will try to activate a `.venv` at `llm\.venv` or `llm\venv` if present before launching `uvicorn`.
- If a service fails to start, open the corresponding window and inspect the error output. You may need to run `npm install` in `frontend` or `composer install` in `backend` if dependencies are missing.
