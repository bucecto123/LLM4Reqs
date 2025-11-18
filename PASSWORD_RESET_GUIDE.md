# Password Reset Email Setup Guide

## Overview

The password reset functionality has been implemented with the following components:

### 1. **Database**

- **Migration**: `2025_11_18_062454_create_password_reset_tokens_table.php`
- **Model**: `App\Models\PasswordResetToken`
- Stores reset codes with expiration (15 minutes)

### 2. **API Endpoints**

All endpoints are prefixed with `/api/auth/`:

- **POST `/api/auth/forgot-password`**

  - Request body: `{ "email": "user@example.com" }`
  - Sends 6-digit reset code to user's email
  - Response: `{ "message": "Password reset code has been sent to your email." }`

- **POST `/api/auth/verify-reset-code`** (Optional)

  - Request body: `{ "email": "user@example.com", "code": "123456" }`
  - Validates reset code without resetting password
  - Response: `{ "valid": true, "message": "Code is valid." }`

- **POST `/api/auth/reset-password`**
  - Request body:
    ```json
    {
      "email": "user@example.com",
      "code": "123456",
      "password": "newPassword123",
      "password_confirmation": "newPassword123"
    }
    ```
  - Resets password if code is valid
  - Response: `{ "message": "Password has been reset successfully. Please login with your new password." }`

### 3. **Email Configuration**

#### Option A: Gmail (Recommended for Development)

1. **Create a `.env` file** in the `backend` folder (if not exists):

   ```bash
   cp .env.example .env
   ```

2. **Generate Application Key**:

   ```bash
   php artisan key:generate
   ```

3. **Enable 2-Factor Authentication** on your Gmail account:

   - Go to Google Account Settings
   - Security → 2-Step Verification → Enable

4. **Generate App Password**:

   - Go to Google Account Settings
   - Security → 2-Step Verification → App passwords
   - Select "Mail" and your device
   - Copy the 16-character password

5. **Update `.env` file**:
   ```env
   MAIL_MAILER=smtp
   MAIL_HOST=smtp.gmail.com
   MAIL_PORT=587
   MAIL_USERNAME=your-email@gmail.com
   MAIL_PASSWORD=your-16-char-app-password
   MAIL_ENCRYPTION=tls
   MAIL_FROM_ADDRESS=your-email@gmail.com
   MAIL_FROM_NAME="LLM4Reqs"
   ```

#### Option B: Mailtrap (Recommended for Testing)

1. **Sign up** at [mailtrap.io](https://mailtrap.io)
2. **Get credentials** from your inbox
3. **Update `.env` file**:
   ```env
   MAIL_MAILER=smtp
   MAIL_HOST=sandbox.smtp.mailtrap.io
   MAIL_PORT=2525
   MAIL_USERNAME=your-mailtrap-username
   MAIL_PASSWORD=your-mailtrap-password
   MAIL_ENCRYPTION=tls
   MAIL_FROM_ADDRESS=noreply@llm4reqs.com
   MAIL_FROM_NAME="LLM4Reqs"
   ```

#### Option C: Log Driver (For Local Testing)

If you just want to test without actually sending emails:

```env
MAIL_MAILER=log
MAIL_FROM_ADDRESS=noreply@llm4reqs.com
MAIL_FROM_NAME="LLM4Reqs"
```

Emails will be logged to `storage/logs/laravel.log`

### 4. **Queue Configuration**

The email notification implements `ShouldQueue`, so it will be queued for better performance.

1. **Update `.env`**:

   ```env
   QUEUE_CONNECTION=database
   ```

2. **Run queue worker**:

   ```bash
   php artisan queue:work
   ```

   Or for development (auto-reloads on code changes):

   ```bash
   php artisan queue:listen
   ```

### 5. **Run Migration**

```bash
php artisan migrate
```

### 6. **Testing the Implementation**

#### Test 1: Request Password Reset

```bash
curl -X POST http://localhost:8000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

#### Test 2: Verify Code (Optional)

```bash
curl -X POST http://localhost:8000/api/auth/verify-reset-code \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","code":"123456"}'
```

#### Test 3: Reset Password

```bash
curl -X POST http://localhost:8000/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "email":"test@example.com",
    "code":"123456",
    "password":"newPassword123",
    "password_confirmation":"newPassword123"
  }'
```

### 7. **Frontend Integration**

The error message in your screenshot shows: "The route api/auth/forgot-password could not be found."

Make sure your frontend is calling the correct endpoint:

```javascript
// Forgot Password
const response = await fetch("http://localhost:8000/api/auth/forgot-password", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    email: "user@example.com",
  }),
});

// Reset Password
const response = await fetch("http://localhost:8000/api/auth/reset-password", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    email: "user@example.com",
    code: "123456",
    password: "newPassword123",
    password_confirmation: "newPassword123",
  }),
});
```

### 8. **Security Features**

- ✅ Reset codes are hashed before storage
- ✅ Codes expire after 15 minutes
- ✅ Old codes are deleted when new ones are requested
- ✅ All user tokens are revoked after password reset
- ✅ Email existence is not revealed (security through obscurity)
- ✅ Rate limiting can be added to prevent abuse

### 9. **Troubleshooting**

#### Email not sending:

1. Check `.env` configuration
2. Verify SMTP credentials
3. Check `storage/logs/laravel.log` for errors
4. Test with `MAIL_MAILER=log` first

#### Queue not processing:

1. Make sure `QUEUE_CONNECTION=database` in `.env`
2. Run `php artisan queue:work` or `php artisan queue:listen`
3. Check `jobs` table in database

#### Code expired:

- Codes expire after 15 minutes
- Request a new code via `/api/auth/forgot-password`

### 10. **Customization**

#### Change code expiration time:

Edit `app/Http/Controllers/Api/PasswordResetController.php` line 50:

```php
'expires_at' => Carbon::now()->addMinutes(30), // Change to 30 minutes
```

#### Change code format:

Edit `app/Models/PasswordResetToken.php` to use alphanumeric codes:

```php
public static function generateCode(): string
{
    return strtoupper(Str::random(6)); // Returns: AB12CD
}
```

#### Customize email template:

Edit `app/Notifications/PasswordResetNotification.php` to change email content.

## Files Created/Modified

### New Files:

1. `backend/database/migrations/2025_11_18_062454_create_password_reset_tokens_table.php`
2. `backend/app/Models/PasswordResetToken.php`
3. `backend/app/Notifications/PasswordResetNotification.php`
4. `backend/app/Http/Controllers/Api/PasswordResetController.php`

### Modified Files:

1. `backend/routes/api.php` - Added password reset routes
2. `backend/.env.example` - Updated mail configuration examples

## Next Steps

1. ✅ Run migration: `php artisan migrate`
2. ✅ Configure email in `.env` file
3. ✅ Start queue worker: `php artisan queue:work`
4. ✅ Test with Postman or curl
5. ✅ Update frontend to use correct API endpoints
