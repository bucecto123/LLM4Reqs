# 🔄 start-dev.ps1 Changes for WebSocket Support

## ⚠️ What Changed

Your `start-dev.ps1` script has been updated to include **2 new critical services** required for WebSocket functionality.

---

## 📊 Before vs After

### ❌ Before (3 Services)
```
1. LLM Service (Python/FastAPI)
2. Frontend (React/Vite)
3. Backend API (Laravel)
```

### ✅ After (5 Services)
```
1. LLM Service (Python/FastAPI)
2. Frontend (React/Vite)
3. Backend API (Laravel)
4. Reverb WebSocket Server  ← NEW!
5. Queue Worker             ← NEW!
```

---

## 🆕 New Services Added

### 4. Reverb WebSocket Server
```powershell
php artisan reverb:start
```
**Purpose:** Handles real-time WebSocket connections for live progress updates
**Port:** 8080
**Why needed:** Without this, WebSocket connections will fail

### 5. Queue Worker
```powershell
php artisan queue:work --tries=3
```
**Purpose:** Processes background jobs (KB building, conflict detection) and broadcasts events
**Why needed:** Without this, events won't be broadcast to frontend

---

## 🎯 What Each Service Does

| Service | Port | Purpose | Required For |
|---------|------|---------|--------------|
| LLM Service | 8000 | AI/ML processing | Document analysis, KB building |
| Frontend | 5173 | User interface | Web app UI |
| Backend API | 8001 | REST API | Data management, auth |
| **Reverb** | **8080** | **WebSocket server** | **Real-time updates** |
| **Queue Worker** | - | **Background jobs** | **Event broadcasting** |

---

## 🚀 How to Use

### Start All Services
```powershell
.\start-dev.ps1
```

This will open **5 separate PowerShell windows**:
1. ✅ LLM (uvicorn)
2. ✅ Frontend (npm run dev)
3. ✅ Backend (php artisan)
4. ✅ Reverb (WebSocket)
5. ✅ Queue Worker

### Stop All Services
Press `Ctrl+C` in each window to stop the respective service.

---

## 🔍 Verify Services are Running

After running the script, you should see:

```
========================================
✅ Started all dev services!
========================================

Services running:
  1. LLM Service      - http://localhost:8000
  2. Frontend         - http://localhost:5173
  3. Backend API      - http://localhost:8001
  4. Reverb WebSocket - ws://localhost:8080
  5. Queue Worker     - Processing background jobs

Use the opened windows to view logs.
Press Ctrl+C in each window to stop services.
```

---

## ⚠️ Important Notes

### Before Running the Script:

1. **Update backend/.env** with Reverb configuration:
   ```env
   BROADCAST_CONNECTION=reverb
   REVERB_APP_KEY=local-app-key
   REVERB_PORT=8080
   ```

2. **Update frontend/.env** with WebSocket configuration:
   ```env
   VITE_REVERB_APP_KEY=local-app-key
   VITE_REVERB_HOST=localhost
   VITE_REVERB_PORT=8080
   VITE_REVERB_SCHEME=http
   ```

3. **Clear Laravel config cache** (if you've run the app before):
   ```powershell
   cd backend
   php artisan config:clear
   ```

---

## 🐛 Troubleshooting

### Issue: "Port 8080 already in use"
**Solution:** Another application is using port 8080. Either:
- Stop the other application
- Change `REVERB_PORT` in both backend and frontend `.env` files

### Issue: "Queue Worker not processing jobs"
**Solution:**
- Check that `QUEUE_CONNECTION=database` in backend/.env
- Restart the queue worker window
- Run: `php artisan queue:restart`

### Issue: "Reverb server crashes immediately"
**Solution:**
- Make sure backend/.env has all Reverb configuration
- Run: `php artisan config:clear`
- Check Reverb window for error messages

---

## 📝 Summary of Changes

| Change | Description |
|--------|-------------|
| Added Reverb service | New window for WebSocket server |
| Added Queue Worker | New window for background job processing |
| Updated documentation | Reflects all 5 services |
| Improved output | Shows all service URLs and status |

---

## ✅ Next Steps

1. ✅ Update your `.env` files (backend and frontend)
2. ✅ Run `.\start-dev.ps1`
3. ✅ Verify all 5 windows open
4. ✅ Test WebSocket by uploading documents to build KB
5. ✅ Watch real-time progress updates!

---

**Your script is now ready for WebSocket development!** 🎉
