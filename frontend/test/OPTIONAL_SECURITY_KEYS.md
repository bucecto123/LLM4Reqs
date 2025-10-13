# Optional Additional Security Enhancements for .env

# If you want to add extra security layers, you can optionally add these:

# JWT Signing Key (Optional - Laravel APP_KEY is sufficient)
# JWT_SECRET=your_custom_jwt_secret_here

# API Keys for External Services (if needed)
# EXTERNAL_API_KEY=your_external_api_key
# THIRD_PARTY_SERVICE_KEY=your_service_key

# Additional Security Headers
SESSION_SECURE_COOKIE=false  # Set to true in production with HTTPS
SESSION_HTTP_ONLY=true
SESSION_SAME_SITE=lax

# Production Security (uncomment for production)
# APP_ENV=production
# APP_DEBUG=false
# SESSION_SECURE_COOKIE=true
# SANCTUM_STATEFUL_DOMAINS=yourdomain.com
# CORS_ALLOWED_ORIGINS=https://yourdomain.com

# Database Encryption (if you need field-level encryption)
# DB_ENCRYPTION_KEY=your_database_encryption_key

# Two-Factor Authentication Secret (if implementing 2FA)
# TWO_FACTOR_SECRET=your_2fa_secret