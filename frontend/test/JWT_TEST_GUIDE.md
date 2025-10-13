# JWT Authentication Test Guide

## Quick Test for the Error

The error "The route api/auth/login could not be found" suggests there might be a frontend/backend communication issue. Here's how to test:

### 1. Test Backend Endpoints Directly

```bash
# Test health endpoint
curl http://localhost:8001/api/health

# Test login endpoint (should return 401 for invalid credentials)
curl -X POST http://localhost:8001/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"wrongpassword"}'

# Test registration endpoint
curl -X POST http://localhost:8001/api/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"newuser@test.com","password":"password123","password_confirmation":"password123"}'
```

### 2. Check Frontend Configuration

Make sure your frontend .env file has:
```
VITE_API_BASE=http://localhost:8001
```

### 3. Restart Both Servers

1. **Backend**: `php artisan serve --port=8001`
2. **Frontend**: `npm run dev`

### 4. Check Browser Network Tab

Open Developer Tools → Network tab and try to login. Look for:
- Is the request going to the right URL?
- What's the actual error response?
- Are there any CORS errors?

### 5. Common Issues & Solutions

**Issue**: Route not found
**Solution**: Clear route cache: `php artisan route:clear`

**Issue**: CORS errors
**Solution**: Check SANCTUM_STATEFUL_DOMAINS in backend .env

**Issue**: 401 errors
**Solution**: Check user credentials or create a test user

### 6. Create Test User

Run this in Laravel tinker:
```php
php artisan tinker
User::create(['name'=>'Test User','email'=>'test@test.com','password'=>'password123']);
```

### 7. Debug Frontend

Add this to your browser console to check the API base:
```javascript
console.log('API Base:', import.meta.env.VITE_API_BASE);
```