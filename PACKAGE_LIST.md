# 📦 Complete Package & Library List

This document provides a comprehensive list of all packages and libraries installed across the three main components of LLM4Reqs: Backend (Laravel/PHP), Frontend (React/Vite), and LLM Service (Python/FastAPI).

---

## 📊 Package Overview

| Component       | Technology Stack      | Total Packages                | Installation Time | Disk Space  |
| --------------- | --------------------- | ----------------------------- | ----------------- | ----------- |
| **Backend**     | Laravel 12 + PHP 8.2  | **75+**                       | 2-3 minutes       | ~100 MB     |
| **Frontend**    | React 19 + Vite 7     | **200+**                      | 3-5 minutes       | ~300 MB     |
| **LLM Service** | Python 3.8+ + FastAPI | **30+ core** (100+ with deps) | 5-10 minutes      | ~2 GB       |
| **TOTAL**       | Full Stack            | **305+**                      | **10-18 minutes** | **~2.4 GB** |

---

## 🔴 Backend (Laravel/PHP)

### Installation Command

```bash
composer install
```

### Main Production Dependencies

| Package                    | Version | Purpose                                      | Category            |
| -------------------------- | ------- | -------------------------------------------- | ------------------- |
| `php`                      | ^8.2    | Core language                                | Runtime             |
| `laravel/framework`        | ^12.0   | Web application framework                    | Framework           |
| `laravel/reverb`           | ^1.0    | WebSocket server for real-time communication | WebSocket           |
| `laravel/sanctum`          | ^4.2    | API authentication system                    | Authentication      |
| `laravel/tinker`           | ^2.10.1 | Interactive REPL for Laravel                 | Development         |
| `pusher/pusher-php-server` | ^7.2    | Push notification service                    | Real-time           |
| `smalot/pdfparser`         | ^2.12   | PDF document parsing and text extraction     | Document Processing |

**Total Production Dependencies:** 7 direct + 68+ transitive

### Development Dependencies

| Package                | Version | Purpose                        | Category     |
| ---------------------- | ------- | ------------------------------ | ------------ |
| `fakerphp/faker`       | ^1.23   | Generate fake data for testing | Testing      |
| `laravel/pail`         | ^1.2.2  | Real-time log viewer           | Debugging    |
| `laravel/pint`         | ^1.24   | PHP code style fixer           | Code Quality |
| `laravel/sail`         | ^1.41   | Docker development environment | Development  |
| `mockery/mockery`      | ^1.6    | Mocking framework for testing  | Testing      |
| `nunomaduro/collision` | ^8.6    | Beautiful error reporting      | Debugging    |
| `phpunit/phpunit`      | ^11.5.3 | Unit testing framework         | Testing      |

**Total Dev Dependencies:** 7 direct

### Key Transitive Dependencies (Auto-installed)

| Package                   | Purpose                         |
| ------------------------- | ------------------------------- |
| `symfony/console`         | Command-line interface          |
| `symfony/http-foundation` | HTTP request/response handling  |
| `symfony/routing`         | URL routing                     |
| `doctrine/dbal`           | Database abstraction layer      |
| `monolog/monolog`         | Logging library                 |
| `guzzlehttp/guzzle`       | HTTP client                     |
| `vlucas/phpdotenv`        | Environment variable management |
| `nesbot/carbon`           | Date/time manipulation          |
| `league/flysystem`        | Filesystem abstraction          |
| `ramsey/uuid`             | UUID generation                 |

### PHP Extensions Required

```ini
extension=pdo_sqlite
extension=fileinfo
extension=mbstring
extension=openssl
extension=zip
extension=curl
extension=tokenizer
extension=xml
extension=ctype
extension=json
```

### Backend Package Breakdown

- **Framework Core:** 1 package (Laravel)
- **Authentication & Security:** 1 package (Sanctum)
- **Real-time Communication:** 2 packages (Reverb, Pusher)
- **Document Processing:** 1 package (PDF Parser)
- **Development Tools:** 2 packages (Tinker, Sail)
- **Testing:** 3 packages (PHPUnit, Faker, Mockery)
- **Code Quality:** 2 packages (Pint, Collision, Pail)
- **Transitive Dependencies:** ~68 packages

---

## 🔵 Frontend (React/Vite)

### Installation Command

```bash
npm install
```

### Main Production Dependencies

| Package                    | Version  | Purpose                          | Category   |
| -------------------------- | -------- | -------------------------------- | ---------- |
| `react`                    | ^19.1.1  | Core React library               | Framework  |
| `react-dom`                | ^19.1.1  | React DOM renderer               | Framework  |
| `react-router-dom`         | ^7.9.4   | Client-side routing              | Navigation |
| `laravel-echo`             | ^2.2.6   | WebSocket client for Laravel     | Real-time  |
| `pusher-js`                | ^8.4.0   | Pusher JavaScript client         | Real-time  |
| `react-markdown`           | ^10.1.0  | Markdown renderer component      | UI         |
| `react-syntax-highlighter` | ^15.6.6  | Code syntax highlighting         | UI         |
| `lucide-react`             | ^0.544.0 | Icon library                     | UI         |
| `prismjs`                  | ^1.30.0  | Syntax highlighting engine       | UI         |
| `remark-gfm`               | ^4.0.1   | GitHub Flavored Markdown support | Markdown   |
| `rehype-raw`               | ^7.0.0   | HTML in Markdown support         | Markdown   |
| `remark-breaks`            | ^3.0.0   | Line break support in Markdown   | Markdown   |

**Total Production Dependencies:** 12 direct + 188+ transitive

### Development Dependencies

| Package                       | Version  | Purpose                        | Category     |
| ----------------------------- | -------- | ------------------------------ | ------------ |
| `@vitejs/plugin-react`        | ^5.0.3   | Vite plugin for React          | Build Tool   |
| `vite`                        | ^7.1.7   | Next-gen frontend build tool   | Build Tool   |
| `tailwindcss`                 | ^4.1.14  | Utility-first CSS framework    | Styling      |
| `@tailwindcss/postcss`        | ^4.1.14  | TailwindCSS PostCSS plugin     | Styling      |
| `postcss`                     | ^8.5.6   | CSS transformation tool        | Build Tool   |
| `autoprefixer`                | ^10.4.21 | CSS vendor prefix automation   | Build Tool   |
| `eslint`                      | ^9.36.0  | JavaScript linter              | Code Quality |
| `@eslint/js`                  | ^9.36.0  | ESLint JavaScript rules        | Code Quality |
| `eslint-plugin-react-hooks`   | ^5.2.0   | React Hooks linting rules      | Code Quality |
| `eslint-plugin-react-refresh` | ^0.4.20  | React Fast Refresh linting     | Code Quality |
| `@types/react`                | ^19.1.13 | TypeScript types for React     | Development  |
| `@types/react-dom`            | ^19.1.9  | TypeScript types for React DOM | Development  |
| `globals`                     | ^16.4.0  | Global variable definitions    | Development  |

**Total Dev Dependencies:** 13 direct

### Key Transitive Dependencies (Auto-installed)

| Package          | Purpose                         |
| ---------------- | ------------------------------- |
| `@babel/runtime` | Babel runtime helpers           |
| `react-is`       | React element type checking     |
| `scheduler`      | React scheduler                 |
| `prop-types`     | Runtime type checking           |
| `hast-util-*`    | HTML/Markdown AST utilities     |
| `unist-util-*`   | Universal syntax tree utilities |
| `micromark-*`    | Markdown parsing                |
| `esbuild`        | JavaScript bundler              |
| `rollup`         | Module bundler                  |
| `picocolors`     | Terminal colors                 |

### Frontend Package Breakdown

- **Framework Core:** 2 packages (React, React DOM)
- **Routing:** 1 package (React Router DOM)
- **Real-time Communication:** 2 packages (Laravel Echo, Pusher JS)
- **UI Components:** 2 packages (Lucide React, Prism)
- **Markdown Rendering:** 4 packages (React Markdown + plugins)
- **Styling:** 3 packages (TailwindCSS, PostCSS, Autoprefixer)
- **Build Tools:** 2 packages (Vite, Vite React Plugin)
- **Code Quality:** 4 packages (ESLint + plugins)
- **Type Definitions:** 2 packages (React types)
- **Transitive Dependencies:** ~188 packages

---

## 🟢 LLM Service (Python/FastAPI)

### Installation Command

```bash
pip install -r requirements.txt
```

### Core Production Dependencies

| Package            | Version | Purpose                            | Category      |
| ------------------ | ------- | ---------------------------------- | ------------- |
| `fastapi`          | Latest  | Modern async web framework         | Framework     |
| `uvicorn`          | Latest  | ASGI server for FastAPI            | Server        |
| `pydantic`         | Latest  | Data validation using Python types | Validation    |
| `python-dotenv`    | Latest  | Environment variable management    | Configuration |
| `requests`         | Latest  | HTTP library for API calls         | HTTP Client   |
| `aiofiles`         | Latest  | Async file operations              | File I/O      |
| `python-multipart` | Latest  | Multipart form data parsing        | File Upload   |

**Total Core Dependencies:** 7 packages

### AI/ML Dependencies

| Package                 | Version  | Purpose                               | Category     |
| ----------------------- | -------- | ------------------------------------- | ------------ |
| `groq`                  | Latest   | GROQ AI API client                    | AI/LLM       |
| `sentence-transformers` | Latest   | Text embedding models                 | NLP/ML       |
| `faiss-cpu`             | Latest   | Vector similarity search              | Vector DB    |
| `numpy`                 | Latest   | Numerical computing                   | Data Science |
| `pandas`                | Latest   | Data manipulation and analysis        | Data Science |
| `scikit-learn`          | >=1.3.0  | Machine learning algorithms           | ML           |
| `hdbscan`               | >=0.8.33 | Hierarchical density-based clustering | ML           |
| `tqdm`                  | Latest   | Progress bars for loops               | Utilities    |

**Total AI/ML Dependencies:** 8 packages

### Document Processing Dependencies

| Package  | Version | Purpose             | Category            |
| -------- | ------- | ------------------- | ------------------- |
| `PyPDF2` | Latest  | PDF text extraction | Document Processing |

**Total Document Processing:** 1 package

### Testing Dependencies

| Package          | Version | Purpose                       | Category |
| ---------------- | ------- | ----------------------------- | -------- |
| `pytest`         | Latest  | Testing framework             | Testing  |
| `pytest-asyncio` | Latest  | Async testing support         | Testing  |
| `httpx`          | Latest  | Async HTTP client for testing | Testing  |

**Total Testing Dependencies:** 3 packages

### Optional Dependencies (Commented Out)

These are NOT installed by default but can be added if needed:

| Package         | Purpose                   | Why Optional                      |
| --------------- | ------------------------- | --------------------------------- |
| `transformers`  | Hugging Face transformers | Using GROQ API instead            |
| `torch`         | PyTorch deep learning     | Using GROQ API instead            |
| `datasets`      | Dataset loading           | Not needed for production         |
| `accelerate`    | Hardware acceleration     | Not needed with GROQ              |
| `tiktoken`      | Token counting            | Not currently used                |
| `protobuf`      | Protocol buffers          | Not currently used                |
| `sentencepiece` | Tokenization              | Included in sentence-transformers |

### Key Transitive Dependencies (Auto-installed)

| Package              | Purpose                             |
| -------------------- | ----------------------------------- |
| `starlette`          | ASGI framework (FastAPI dependency) |
| `anyio`              | Async I/O library                   |
| `click`              | CLI creation                        |
| `h11`                | HTTP/1.1 protocol                   |
| `httptools`          | HTTP parser                         |
| `uvloop`             | Fast event loop                     |
| `watchfiles`         | File change detection               |
| `websockets`         | WebSocket support                   |
| `typing-extensions`  | Type hints backport                 |
| `annotated-types`    | Type annotations                    |
| `pydantic-core`      | Pydantic core validation            |
| `certifi`            | SSL certificates                    |
| `charset-normalizer` | Character encoding detection        |
| `idna`               | Internationalized domain names      |
| `urllib3`            | HTTP client library                 |
| `joblib`             | Parallel computing                  |
| `threadpoolctl`      | Thread pool control                 |
| `scipy`              | Scientific computing                |
| `tokenizers`         | Fast tokenization                   |
| `huggingface-hub`    | Model hub client                    |
| `filelock`           | File locking                        |
| `fsspec`             | Filesystem interfaces               |
| `mpmath`             | Multiprecision math                 |
| `sympy`              | Symbolic mathematics                |
| `pillow`             | Image processing                    |
| `regex`              | Advanced regex                      |
| `safetensors`        | Safe tensor serialization           |
| `networkx`           | Graph algorithms                    |

### LLM Package Breakdown

- **Framework:** 1 package (FastAPI)
- **Server:** 1 package (Uvicorn)
- **AI/LLM:** 8 packages (GROQ, Transformers, FAISS, etc.)
- **Data Science:** 3 packages (NumPy, Pandas, Scikit-learn)
- **Document Processing:** 1 package (PyPDF2)
- **File Handling:** 2 packages (Aiofiles, Python-multipart)
- **Configuration:** 1 package (Python-dotenv)
- **HTTP Client:** 1 package (Requests)
- **Testing:** 3 packages (Pytest, Pytest-asyncio, HTTPX)
- **Utilities:** 1 package (tqdm)
- **Transitive Dependencies:** ~70+ packages

### Python Version Requirements

```
Python >= 3.8
Python <= 3.11 (recommended for compatibility)
```

---

## 🔍 Package Categories Summary

### By Category Across All Components

| Category                | Backend | Frontend | LLM | Total |
| ----------------------- | ------- | -------- | --- | ----- |
| **Framework/Core**      | 1       | 2        | 1   | 4     |
| **Web Server**          | -       | -        | 1   | 1     |
| **Authentication**      | 1       | -        | -   | 1     |
| **Real-time/WebSocket** | 2       | 2        | -   | 4     |
| **Routing/Navigation**  | -       | 1        | -   | 1     |
| **UI Components**       | -       | 6        | -   | 6     |
| **Styling**             | -       | 3        | -   | 3     |
| **AI/ML**               | -       | -        | 8   | 8     |
| **Document Processing** | 1       | -        | 1   | 2     |
| **Data Science**        | -       | -        | 3   | 3     |
| **Build Tools**         | -       | 6        | -   | 6     |
| **Testing**             | 3       | -        | 3   | 6     |
| **Code Quality**        | 3       | 4        | -   | 7     |
| **Development Tools**   | 3       | 2        | -   | 5     |
| **HTTP/API Client**     | -       | -        | 1   | 1     |
| **File Handling**       | -       | -        | 2   | 2     |
| **Configuration**       | -       | -        | 1   | 1     |

---

## 📥 Complete Installation Guide

### Prerequisites Check

Before installing packages, verify you have all required software:

```powershell
# Check PHP version (need 8.2+)
php -v

# Check Composer
composer -V

# Check Node.js (need 18+)
node -v

# Check npm (need 9+)
npm -v

# Check Python (need 3.8+)
python --version

# Check pip
pip --version
```

**If any command fails, install the missing software:**

- **PHP 8.2+**: https://www.php.net/downloads or use XAMPP/WAMP
- **Composer**: https://getcomposer.org/download/
- **Node.js 18+**: https://nodejs.org/ (LTS version)
- **Python 3.8+**: https://www.python.org/downloads/

---

## 🔴 Backend Package Installation (Laravel/PHP)

### Step 1: Navigate to Backend Directory

```powershell
cd backend
```

### Step 2: Install All Packages with Composer

```powershell
composer install
```

**What happens:**

- Composer reads `composer.json` and `composer.lock`
- Downloads **75+ packages** from Packagist
- Installs to `vendor/` directory
- Takes **2-3 minutes**
- Uses **~100 MB** disk space

**Progress output you'll see:**

```
Loading composer repositories with package information
Installing dependencies (including require-dev) from lock file
Package operations: 75 installs, 0 updates, 0 removals
  - Installing vendor/package (v1.0.0): Downloading (100%)
...
Generating optimized autoload files
```

### Step 3: Verify Installation

```powershell
# Check installed packages
composer show

# Should see 75+ packages including:
# laravel/framework, laravel/reverb, laravel/sanctum, etc.

# Verify autoload
composer dump-autoload
```

### Step 4: Install Specific Packages (If Needed)

```powershell
# Install a single package
composer require package/name

# Install dev dependency
composer require --dev package/name

# Example: Install a new package
composer require guzzlehttp/guzzle
```

### Common Issues & Solutions

#### ❌ "composer: command not found"

```powershell
# Download and install Composer from:
# https://getcomposer.org/Composer-Setup.exe

# After installation, restart terminal and verify:
composer -V
```

#### ❌ "PHP extension missing"

```powershell
# Find your php.ini file
php --ini

# Open php.ini and uncomment these lines (remove semicolon):
extension=pdo_sqlite
extension=fileinfo
extension=mbstring
extension=openssl
extension=zip
extension=curl
extension=tokenizer
extension=xml

# Restart terminal and try again
```

#### ❌ "Memory limit of X bytes exhausted"

```powershell
# Option 1: Increase memory temporarily
php -d memory_limit=512M composer install

# Option 2: Increase permanently in php.ini
# Edit php.ini and set:
memory_limit = 512M
```

#### ❌ "Your requirements could not be resolved"

```powershell
# Update composer itself
composer self-update

# Clear cache and retry
composer clear-cache
composer install
```

### Backend Installation Complete ✅

You should now have:

- ✅ `vendor/` directory with 75+ packages
- ✅ `vendor/autoload.php` for autoloading
- ✅ All Laravel dependencies installed

---

## 🔵 Frontend Package Installation (React/Vite)

### Step 1: Navigate to Frontend Directory

```powershell
cd frontend
# Or from project root:
cd ..\frontend
```

### Step 2: Install All Packages with npm

```powershell
npm install
```

**What happens:**

- npm reads `package.json` and `package-lock.json`
- Downloads **200+ packages** from npmjs.com
- Installs to `node_modules/` directory
- Takes **3-5 minutes**
- Uses **~300 MB** disk space

**Progress output you'll see:**

```
added 200 packages, and audited 201 packages in 3m

50 packages are looking for funding
  run `npm fund` for details

found 0 vulnerabilities
```

### Step 3: Verify Installation

```powershell
# List all installed packages (top-level only)
npm list --depth=0

# Should see:
# react@19.1.1
# react-dom@19.1.1
# vite@7.1.7
# tailwindcss@4.1.14
# laravel-echo@2.2.6
# etc.

# Check for missing dependencies
npm ls

# Audit for security vulnerabilities
npm audit
```

### Step 4: Install Specific Packages (If Needed)

```powershell
# Install a production dependency
npm install package-name

# Install a dev dependency
npm install --save-dev package-name

# Install specific version
npm install react@19.1.1

# Examples:
npm install axios                    # Add axios
npm install --save-dev eslint        # Add ESLint as dev dependency
```

### Step 5: Alternative Installation Methods

```powershell
# Clean install (deletes node_modules first)
npm ci

# Install with legacy peer deps (if peer dependency conflicts)
npm install --legacy-peer-deps

# Install only production dependencies
npm install --production
```

### Common Issues & Solutions

#### ❌ "npm: command not found"

```powershell
# Install Node.js from:
# https://nodejs.org/en/download/

# Verify installation:
node -v
npm -v
```

#### ❌ "EACCES: permission denied"

```powershell
# On Windows: Run PowerShell as Administrator
# Right-click PowerShell → Run as Administrator

# Or clear npm cache:
npm cache clean --force
npm install
```

#### ❌ "Cannot find module"

```powershell
# Delete and reinstall everything
Remove-Item -Recurse -Force node_modules
Remove-Item -Force package-lock.json
npm install
```

#### ❌ "Peer dependency warnings"

```powershell
# Usually safe to ignore, but if causing issues:
npm install --legacy-peer-deps
```

#### ❌ "ERESOLVE unable to resolve dependency tree"

```powershell
# Force the installation
npm install --force

# Or use legacy peer deps
npm install --legacy-peer-deps
```

#### ❌ "Network timeout or slow download"

```powershell
# Increase timeout
npm install --timeout=60000

# Use different registry (if in China or restricted network)
npm install --registry=https://registry.npmjs.org/
```

### Frontend Installation Complete ✅

You should now have:

- ✅ `node_modules/` directory with 200+ packages
- ✅ `package-lock.json` with locked versions
- ✅ All React and Vite dependencies installed
- ✅ No security vulnerabilities (check with `npm audit`)

---

## 🟢 LLM Service Package Installation (Python/FastAPI)

### Step 1: Navigate to LLM Directory

```powershell
cd llm
# Or from project root:
cd ..\llm
```

### Step 2: Create Python Virtual Environment

```powershell
# Create virtual environment
python -m venv env
```

**What happens:**

- Creates `env/` directory
- Copies Python interpreter
- Sets up isolated Python environment
- Takes **10-30 seconds**
- Uses **~50 MB** initially

### Step 3: Activate Virtual Environment

**On Windows (PowerShell):**

```powershell
.\env\Scripts\Activate.ps1
```

**On Windows (Command Prompt):**

```cmd
.\env\Scripts\activate.bat
```

**On Linux/Mac:**

```bash
source env/bin/activate
```

**You should see `(env)` in your prompt:**

```
(env) PS D:\LLM4Reqs\llm>
```

⚠️ **Important:** Always activate the virtual environment before installing packages!

### Step 4: Upgrade pip (Recommended)

```powershell
python -m pip install --upgrade pip
```

**Why:** Ensures you have the latest pip with bug fixes and better dependency resolution.

### Step 5: Install All Packages

```powershell
pip install -r requirements.txt
```

**What happens:**

- pip reads `requirements.txt`
- Downloads **30+ core packages** + **70+ dependencies** from PyPI
- Installs to `env/Lib/site-packages/`
- Downloads pre-trained ML models (~400 MB for sentence-transformers)
- Takes **5-10 minutes** (depending on internet speed)
- Uses **~2 GB** disk space

**Progress output you'll see:**

```
Collecting fastapi
  Downloading fastapi-0.104.1-py3-none-any.whl (92 kB)
Collecting uvicorn
  Downloading uvicorn-0.24.0-py3-none-any.whl (58 kB)
...
Collecting sentence-transformers
  Downloading sentence_transformers-2.2.2-py3-none-any.whl
Downloading models... [████████████████] 100%
Installing collected packages: ...
Successfully installed 100+ packages
```

### Step 6: Verify Installation

```powershell
# List all installed packages
pip list

# Should see 100+ packages including:
# fastapi, uvicorn, groq, faiss-cpu, sentence-transformers, etc.

# Check specific package
pip show fastapi

# Verify imports work
python -c "import fastapi; import uvicorn; import groq; import faiss"
# (No output = success)
```

### Step 7: Install Specific Packages (If Needed)

```powershell
# Install a single package
pip install package-name

# Install specific version
pip install fastapi==0.104.1

# Install with minimum version
pip install scikit-learn>=1.3.0

# Upgrade a package
pip install --upgrade fastapi

# Examples:
pip install numpy                    # Install numpy
pip install pandas==2.0.0           # Install specific version
pip install --upgrade requests       # Upgrade to latest
```

### Step 8: Handle Large Package Downloads

Some packages are very large (especially ML models):

```powershell
# sentence-transformers downloads ~400 MB of models
# This is normal and required for embeddings

# FAISS installation (~10 MB)
pip install faiss-cpu

# If FAISS fails to build from source:
pip install faiss-cpu --only-binary :all:
```

### Common Issues & Solutions

#### ❌ "python: command not found"

```powershell
# Install Python from:
# https://www.python.org/downloads/

# During installation, check "Add Python to PATH"

# Verify installation:
python --version
```

#### ❌ "Activate.ps1 is not digitally signed"

```powershell
# Set execution policy (one-time setup)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Then activate again:
.\env\Scripts\Activate.ps1
```

#### ❌ "Microsoft Visual C++ 14.0 or greater is required"

```powershell
# Some packages need C++ compiler

# Download and install "Microsoft C++ Build Tools":
# https://visualstudio.microsoft.com/visual-cpp-build-tools/

# Install "Desktop development with C++" workload

# Then retry:
pip install -r requirements.txt
```

#### ❌ "Failed building wheel for faiss-cpu"

```powershell
# Install prebuilt wheel instead of building from source
pip install faiss-cpu --only-binary :all:

# Or use conda (if you have Anaconda/Miniconda):
conda install -c conda-forge faiss-cpu
```

#### ❌ "ERROR: Could not find a version that satisfies the requirement"

```powershell
# Make sure you're using Python 3.8-3.11
python --version

# If using Python 3.12+, some packages may not be compatible yet
# Recreate environment with Python 3.11:
Remove-Item -Recurse -Force env
py -3.11 -m venv env
.\env\Scripts\Activate.ps1
pip install -r requirements.txt
```

#### ❌ "ModuleNotFoundError: No module named 'xxx'"

```powershell
# Make sure virtual environment is activated
# You should see (env) in your prompt

# If not activated:
.\env\Scripts\Activate.ps1

# Then install packages:
pip install -r requirements.txt
```

#### ❌ "Slow download speed"

```powershell
# Use a different PyPI mirror (if in China or slow network)
pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple

# Or increase timeout:
pip install -r requirements.txt --timeout=1000
```

#### ❌ "ImportError: DLL load failed" (Windows)

```powershell
# Install Microsoft Visual C++ Redistributable
# Download from: https://aka.ms/vs/17/release/vc_redist.x64.exe

# Run the installer and restart your computer
```

### Step 9: Test Installation

```powershell
# Test FastAPI
python -c "from fastapi import FastAPI; print('FastAPI OK')"

# Test GROQ
python -c "import groq; print('GROQ OK')"

# Test FAISS
python -c "import faiss; print('FAISS OK')"

# Test sentence transformers
python -c "from sentence_transformers import SentenceTransformer; print('SentenceTransformer OK')"

# All should print "OK" with no errors
```

### LLM Service Installation Complete ✅

You should now have:

- ✅ `env/` virtual environment created
- ✅ Virtual environment activated (see `(env)` in prompt)
- ✅ 100+ packages installed in `env/Lib/site-packages/`
- ✅ Pre-trained models downloaded (~400 MB)
- ✅ All imports working without errors

### Deactivating Virtual Environment

When you're done working:

```powershell
deactivate
```

To reactivate later:

```powershell
cd llm
.\env\Scripts\Activate.ps1
```

---

## 🔄 Complete Installation Workflow

Here's the complete workflow to install all packages for all three components:

```powershell
# Step 1: Clone repository (if not done)
git clone https://github.com/bucecto123/LLM4Reqs.git
cd LLM4Reqs

# Step 2: Install Backend packages
cd backend
composer install
cd ..

# Step 3: Install Frontend packages
cd frontend
npm install
cd ..

# Step 4: Install LLM packages
cd llm
python -m venv env
.\env\Scripts\Activate.ps1
pip install --upgrade pip
pip install -r requirements.txt
deactivate
cd ..

# Done! All packages installed
```

**Total time:** 10-18 minutes  
**Total disk space:** ~2.4 GB

---

## 🧪 Verify All Installations

Run these commands to verify everything is installed correctly:

```powershell
# Backend verification
cd backend
composer show | Measure-Object -Line
# Should show 75+ lines

# Frontend verification
cd ..\frontend
npm list --depth=0 | Measure-Object -Line
# Should show 200+ lines

# LLM verification
cd ..\llm
.\env\Scripts\Activate.ps1
pip list | Measure-Object -Line
# Should show 100+ lines
deactivate

# All checks passed? You're ready to go! 🚀
```

---

## 🎯 Version Management

### Backend (Composer)

```bash
# List installed packages
composer show

# Show specific package version
composer show laravel/framework

# Update all packages
composer update

# Update specific package
composer update laravel/framework

# Check for outdated packages
composer outdated
```

### Frontend (npm)

```bash
# List installed packages
npm list --depth=0

# Show specific package version
npm show react version

# Update all packages
npm update

# Update specific package
npm update react

# Check for outdated packages
npm outdated

# Audit for security issues
npm audit
```

### LLM Service (pip)

```bash
# Activate virtual environment first!
.\env\Scripts\Activate.ps1

# List installed packages
pip list

# Show specific package info
pip show fastapi

# Update specific package
pip install --upgrade fastapi

# Update all packages
pip list --outdated | ForEach-Object { pip install --upgrade $_.Split()[0] }

# Export current packages
pip freeze > requirements.txt

# Check for security issues
pip check
```

---

## 🔒 Security Considerations

### Backend

- Regularly update Laravel to latest security patches
- Monitor security advisories: https://laravel.com/docs/security
- Use `composer audit` (when available)

### Frontend

- Run `npm audit` regularly for vulnerabilities
- Use `npm audit fix` to auto-fix issues
- Keep React and dependencies updated

### LLM Service

- Run `pip check` to verify dependencies
- Use `safety check` package for vulnerability scanning
- Keep Python version updated
- Monitor GROQ API security updates

---

## 📊 Disk Space Breakdown

```
LLM4Reqs/
├── backend/
│   └── vendor/           ~100 MB   (75+ packages)
│
├── frontend/
│   └── node_modules/     ~300 MB   (200+ packages)
│
└── llm/
    └── env/              ~2.0 GB   (30+ core + ML models)
        ├── Lib/          ~1.8 GB   (sentence-transformers models)
        └── Scripts/      ~200 MB   (executables)

Total:                    ~2.4 GB
```

**Notes:**

- FAISS CPU version is ~10 MB
- Sentence Transformers downloads pre-trained models (~400 MB each)
- PyTorch (if installed) adds ~800 MB
- Node modules can grow with more packages

---

## ✅ Verification Commands

### Verify All Installations

```bash
# Backend
cd backend
composer show | wc -l  # Should show 75+

# Frontend
cd frontend
npm list --depth=0 | wc -l  # Should show 200+

# LLM
cd llm
.\env\Scripts\Activate.ps1
pip list | wc -l  # Should show 100+
```

---

## 🚀 Quick Reference

| Component | Package Manager | Config File        | Install Command                   | Count    |
| --------- | --------------- | ------------------ | --------------------------------- | -------- |
| Backend   | Composer        | `composer.json`    | `composer install`                | 75+      |
| Frontend  | npm             | `package.json`     | `npm install`                     | 200+     |
| LLM       | pip             | `requirements.txt` | `pip install -r requirements.txt` | 30+ core |

---

**Last Updated:** November 14, 2025  
**Project:** LLM4Reqs - AI-Powered Requirements Extraction  
**Version:** 1.0.0
