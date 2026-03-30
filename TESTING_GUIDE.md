# Testing Guide — March 2026 Optimization Update

This guide covers everything you need to update your Docker build and verify all the new features.

---

## Part 1: Updating Docker

### 1.1 Pull latest changes

```powershell
git pull
```

### 1.2 Rebuild all containers (required — Dockerfile changed)

```powershell
docker compose build --no-cache
```

This will rebuild all 5 containers:
- `llm` — Python LLM service
- `backend` — Laravel PHP-FPM + nginx
- `frontend` — Vite multi-stage build → nginx
- `reverb` — Laravel WebSocket server
- `queue` — Background job runner

Expected rebuild time: **3–8 minutes** (first run only; later runs use Docker cache).

### 1.3 Start all services

```powershell
docker compose up -d
```

### 1.4 Wait for services to be healthy

```powershell
docker compose ps
```

All services should show `healthy` (except `queue` which runs `sleep infinity`):

| Service | Port | Health check |
|---|---|---|
| `llm` | 8000 | HTTP `GET /health` |
| `backend` | 8001 | HTTP `GET /api/health` |
| `frontend` | 5173 | nginx (always healthy) |
| `reverb` | 8081 | (no healthcheck) |

### 1.5 Verify the app is running

Open: **http://localhost:5173**

---

## Part 2: What to Test

### 🔴 Feature Group 1: Performance Monitoring

#### Test A — Console Performance Grades

1. Open the app at http://localhost:5173
2. Open **Chrome DevTools → Console**
3. Navigate around (open a project, load conversations, send a message)
4. Look for entries prefixed with `[PERF]` — they show emoji grades:
   - 🚀 = response < 500ms (green)
   - ⚡ = response < 1s (yellow)
   - 🐌 = response > 1s (red)
5. **Expected**: Most calls should be 🚀 or ⚡

#### Test B — DevTools Performance Overlay

1. In the app, press **`Ctrl+Shift+P`**
2. A dark overlay panel appears at the bottom-right showing recent API calls
3. Verify it shows: method, path, duration, timestamp, success/failure
4. Switch to the **Cache** tab — you should see localStorage cache entries
5. Press **`Esc`** or **`Ctrl+Shift+P`** again to close
6. **Expected**: Panel opens/closes; entries populate as you use the app

#### Test C — Backend Request Timing Logs

The Laravel backend logs every request. To view them:

```powershell
# In a separate terminal:
docker compose exec backend tail -f storage/logs/laravel.log
```

Then use the app (load a conversation, send a message). You should see entries like:

```
[RequestTiming] method=GET uri=api/projects duration_ms=23.4 status=200
```

To check for slow queries:

```powershell
docker compose exec backend tail -f storage/logs/laravel.log | grep SlowQuery
```

Then perform a slow operation (e.g., conflict detection). Any query >100ms will be logged with SQL and bindings.

#### Test D — Frontend Build Output (Chunk Splitting)

```powershell
cd frontend && npm run build
```

Look at the output:
- `✓ built in Xs` — should succeed with no errors
- `mermaid-c-*.js` — Mermaid in its own chunk (~548 kB gzip: 158 kB)
- `echo-pusher-*.js` — Echo + Pusher in their own chunk (~74 kB gzip: 21 kB)
- `react-flow-*.js` — React Flow in its own chunk (~125 kB gzip: 41 kB)
- `index-*.js` — main bundle (~217 kB gzip: 66 kB)

These heavy chunks are **lazy-loaded** — they are NOT downloaded on initial page load.

---

### 💾 Feature Group 2: Smart Caching

#### Test E — Conversations Load Instantly from Cache

1. Open the app → log in → go to dashboard
2. **Wait for conversations to load** (they appear after a moment)
3. **Hard refresh** the page (`Ctrl+Shift+R` or `F5`)
4. Watch the conversation list — **it should appear almost instantly** from localStorage cache
5. Open DevTools → **Network tab** → filter by `XHR` or `fetch`
6. Verify: when the page first loads, no GET to `/api/conversations` fires until AFTER the list appears (background refresh)
7. On **second load** (from cache), no conversation API request should fire at all for ~2 minutes

#### Test E2 — Projects Load from Cache

1. Log in and see the project list
2. Hard refresh (`Ctrl+Shift+R`)
3. Projects should appear immediately from localStorage cache
4. **Network tab**: no `/api/projects` GET fires until after the list appears

#### Test F — Models List Cached (1 Hour TTL)

1. Open DevTools → **Application tab → Local Storage**
2. Search for a key starting with `v1:models:` — this is the cached model list
3. The TTL is 1 hour — on second page loads, no `/api/llm/models` request fires

#### Test G — Cache Busting on Create

1. Create a **new conversation** (click "+ New Chat" or similar)
2. After the conversation is created:
   - Open DevTools → **Application tab → Local Storage**
   - Find and delete the key starting with `v1:conversations:`
3. Refresh — the new conversation should **not** appear (cache was manually busted)
4. Repeat step 1 — this time, the cache is auto-busted and the new conversation appears immediately

---

### 🎨 Feature Group 3: Animations

#### Test H — Shimmer Skeleton Loading

1. Open DevTools → **Network tab** → set throttle to **Slow 3G** (or use `Ctrl+Shift+R` on a cached page to clear cache)
2. Reload — the loading skeleton should show a **shimmering gradient** (not just a flat grey pulsing block)
3. The shimmer should wave from left to right across skeleton elements

#### Test I — Thinking Indicator Animation

1. Open a conversation and **send a message**
2. Watch the thinking indicator while the AI is "thinking"
3. You should see:
   - 🐟 fish with a **wiggle animation** (rotates left/right)
   - **Bubble trail** (small circles floating up and fading)
   - **Thinking dots** bouncing
   - **Wave bars** oscillating at the bottom
4. **Expected**: Multi-layered, smooth animation — not static text

#### Test J — Message Bubble Entrance

1. Send a message and wait for the AI reply
2. Watch the message bubble **animate in**:
   - Slides up slightly (`translateY`)
   - Fades in (`opacity`)
   - Uses a **spring easing curve** (slight overshoot, not linear)
3. **Expected**: Smooth, non-robotic feel

#### Test K — Toast Notifications

1. Trigger an **error condition** (e.g., disconnect the backend: `docker compose stop backend`, send a message, then `docker compose start backend`)
2. **Expected**: A red error toast slides in from the top-right with the error message and a close button
3. Click the toast or the `×` — it should dismiss
4. **Success toasts** should appear green; **info** toasts blue; **warning** toasts amber

#### Test L — Conversation List Slide-In (Sidebar)

1. Create a new conversation
2. The new conversation item should **slide in from the left** into the conversation list
3. **Expected**: Smooth staggered animation, not an instant jump

#### Test M — Accessibility: Reduced Motion

1. Open OS settings → **Accessibility → Visual effects → Reduce motion** (Windows: Settings → Ease of Access → Display → Show animations)
2. Reload the app
3. **Expected**: All shimmer, bounce, and slide animations are disabled; content appears without motion

---

### 🔧 Feature Group 4: Docker Production Build

#### Test N0 — Queue Worker Runs Async (New)

```powershell
docker compose exec queue php artisan queue:work --once
```

Expected: command runs without configuration errors and processes at most one job.
Also verify queue mode is not sync:

```powershell
docker compose exec backend php artisan tinker --execute="echo config('queue.default');"
```

Expected output: `database` (or your configured async driver), **not** `sync`.

#### Test N1 — Backend Image Composer Resolution (PHP 8.2)

```powershell
docker compose build --no-cache backend
```

Expected: Composer stage completes (no lock mismatch errors like `php version 8.5.4 does not satisfy ...`).

#### Test N2 — Full Stack Rebuild

```powershell
docker compose build --no-cache
docker compose up -d
docker compose ps
```

Expected: `llm`, `backend`, `frontend` healthy/running and `queue` running with queue worker command.

#### Test N0 — Queue Worker Runs Async (New)

```powershell
docker compose exec queue php artisan queue:work --once
```

Expected: command runs without configuration errors and processes at most one job.
Also verify queue mode is not sync:

```powershell
docker compose exec backend php artisan tinker --execute="echo config('queue.default');"
```

Expected output: `database` (or your configured async driver), **not** `sync`.

#### Test N1 — Backend Image Composer Resolution (PHP 8.2)

```powershell
docker compose build --no-cache backend
```

Expected: Composer stage completes (no lock mismatch errors like `php version 8.5.4 does not satisfy ...`).

#### Test N2 — Full Stack Rebuild

```powershell
docker compose build --no-cache
docker compose up -d
docker compose ps
```

Expected: `llm`, `backend`, `frontend` healthy/running and `queue` running with queue worker command.

#### Test N — Frontend Served by nginx (not Vite dev server)

```powershell
docker compose exec frontend ls /usr/share/nginx/html/
```

Expected output: should contain `index.html` and `assets/` — the **built Vite dist**, not source files.

#### Test O — nginx Gzip Compression Active

```powershell
curl -H "Accept-Encoding: gzip" -I http://localhost:5173/ | grep -i "gzip\|content-encoding"
```

Expected: `Content-Encoding: gzip` returned.

#### Test P — PHP-FPM Running (not artisan serve)

```powershell
docker compose exec backend ps aux | grep php
```

Expected: `php-fpm` should appear in the process list (not `php artisan serve`).

#### Test Q — Backend Security Headers

```powershell
curl -I http://localhost:8001/ | grep -i "x-frame\|x-content"
```

Expected:
```
X-Frame-Options: SAMEORIGIN
X-Content-Type-Options: nosniff
```

#### Test R — LLM in Production Mode (no reload)

```powershell
docker compose exec llm ps aux | grep uvicorn
```

Expected: `uvicorn main:app --host 0.0.0.0 --port 8000` — **without `--reload`**

---

### 🔐 Feature Group 5: Bug Fixes

#### Test S — Story Graph Bypasses Auth? (Bug Fix)

1. Open DevTools → **Network tab**
2. Navigate to Story Graph view
3. Filter: look for requests to `/api/projects/{id}/story-graph`
4. Click the request → **Headers tab**
5. Verify: `Authorization: Bearer <token>` header is present
6. **Expected**: All story graph requests carry JWT auth (previously broken — this was a silent bug)

#### Test T — Collaborators Bypasses Auth? (Bug Fix)

1. Go to a project → **Share / Collaborators** panel
2. Add a collaborator
3. Filter network: requests to `/api/projects/{id}/collaborators`
4. Verify: `Authorization: Bearer <token>` header is present

---

## Part 3: Quick Smoke Test (5 Minutes)

### Queue/Cache Smoke Add-on (New)

- [ ] `docker compose exec backend php artisan tinker --execute="echo config('queue.default');"` returns `database`
- [ ] Trigger a long-running operation (e.g., conflict detection or KB build) and verify HTTP request returns quickly while job continues in queue logs
- [ ] Run same chat query twice within 10 minutes and verify second response is faster with semantic cache hit log (`Semantic cache HIT`) in llm logs

### Queue/Cache Smoke Add-on (New)

- [ ] `docker compose exec backend php artisan tinker --execute="echo config('queue.default');"` returns `database`
- [ ] Trigger a long-running operation (e.g., conflict detection or KB build) and verify HTTP request returns quickly while job continues in queue logs
- [ ] Run same chat query twice within 10 minutes and verify second response is faster with semantic cache hit log (`Semantic cache HIT`) in llm logs

Run through this checklist in order — it takes about 5 minutes:

- [ ] `docker compose build --no-cache` completes without error
- [ ] `docker compose up -d` — all containers healthy
- [ ] http://localhost:5173 loads in browser
- [ ] Login / sign up works
- [ ] Create a project → appears instantly (cache)
- [ ] Send a message → thinking indicator animates
- [ ] Receive a reply → message bubble animates in
- [ ] Press `Ctrl+Shift+P` → performance overlay opens
- [ ] Console shows `[PERF] 🚀` or `[PERF] ⚡` entries
- [ ] Open DevTools → Application → Local Storage → entries starting with `v1:` exist

---

## Troubleshooting

### Frontend shows "connection refused" after rebuild

The frontend nginx needs the backend to be running. Check:
```powershell
docker compose up -d backend
```

### Performance overlay doesn't appear on `Ctrl+Shift+P`

The key combination might be captured by the browser or an extension. Try using the browser's own DevTools → **Console** tab instead — `[PERF]` logs are also printed there as styled console output.

### Cache not working — data still loads slowly

Check that localStorage is not full or disabled:
- DevTools → **Application tab → Local Storage** → is the domain listed?
- Try clearing site data and reloading

### Toast notifications not appearing

Check the DevTools Console for JavaScript errors — the ToastProvider must be mounted in `main.jsx`. If there's an error mounting it, toasts won't render.

### Backend logs show `SlowQuery` warnings

This is **expected behavior** — slow queries are now logged so you can identify bottlenecks. To fix slow queries, check:
- Is the database indexed on the columns being filtered/sorted?
- Run `docker compose exec backend php artisan tinker` and inspect the query with `DB::getQueryLog()`.

### `mermaid` chunk still huge on initial load

Check DevTools → **Network tab** — the `mermaid-c-*.js` chunk should only load when you open the Graph view (it is lazy-imported). If it's loading on the main page, the `React.lazy` wrapping in `DashBoard.jsx` may not be working — file a bug.

---

## Docker Service Architecture (Updated)

```
Browser (port 5173)
  │
  ├─► frontend (nginx)         [built static assets, port 80 internal]
  │       │
  │       ├─► /api/*  ──────► backend (php-fpm + nginx)  [port 8001]
  │       │                         │
  │       │                         ├─► /health
  │       │                         ├─► /api/*  ──► llm (FastAPI)  [port 8000]
  │       │                         └─► /ws/*   ──► reverb (WebSocket) [port 8081]
  │       │
  │       └─► /ws/* ──────────► reverb (WebSocket)
  │
  └─► Direct access:
          http://localhost:8001   (backend nginx)
          http://localhost:8000   (llm)
          http://localhost:8081   (reverb)
```

## File Reference: What Changed

| File | Change |
|---|---|
| `frontend/Dockerfile` | 2-stage build: `npm ci` + `npm run build` → nginx serves dist |
| `backend/Dockerfile` | Composer `--no-dev`, PHP-FPM, OPcache, nginx security headers |
| `llm/Dockerfile` | `--no-cache-dir`, non-root user |
| `docker-compose.yml` | Backend: `8001:80` + php-fpm/nginx; LLM: no reload, no bind mount |
| `frontend/vite.config.js` | Explicit chunks for mermaid, react-flow, echo-pusher |
| `frontend/.dockerignore` | Reduced Docker build context |
| `backend/app/Http/Middleware/RequestTiming.php` | **New** — request timing middleware |
| `backend/app/Providers/AppServiceProvider.php` | Slow query logging (>100ms) |
| `frontend/src/utils/performanceMonitor.js` | **New** — API timing + dedupe singleton |
| `frontend/src/utils/cache.js` | **New** — TTL localStorage cache |
| `frontend/src/components/PerfOverlay.jsx` | **New** — Ctrl+Shift+P live overlay |
| `frontend/src/components/ShimmerSkeleton.jsx` | **New** — shimmer skeleton components |
| `frontend/src/components/AnimateIn.jsx` | **New** — staggered entrance wrapper |
| `frontend/src/components/Toast.jsx` | **New** — toast notification system |
| `frontend/src/utils/echo.js` | Lazy Echo singleton (not loaded until first WebSocket use) |
| `frontend/src/hooks/useDashboard.js` | Cache-first loading for projects, models, conversations |
| `frontend/src/services/sharingService.js` | Bug fix: import auth.js (was bypassing JWT) |
| `frontend/src/services/graphService.js` | Bug fix: import auth.js (was bypassing JWT) |
