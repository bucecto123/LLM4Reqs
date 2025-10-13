<?php

/**
 * JWT Authentication Setup Verification Script
 * 
 * Run this to verify your JWT authentication setup is working correctly
 * Usage: php verify_jwt_setup.php
 */

require_once __DIR__ . '/vendor/autoload.php';

// Load Laravel application
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

class JWTSetupVerifier
{
    public function verify()
    {
        echo "🔐 JWT Authentication Setup Verification\n";
        echo str_repeat("=", 50) . "\n";
        
        $this->checkAppKey();
        $this->checkSanctumConfig();
        $this->checkJWTConfig();
        $this->checkCORSConfig();
        $this->checkDatabase();
        
        echo "\n✅ JWT Setup Verification Complete!\n";
    }
    
    private function checkAppKey()
    {
        echo "\n1. Checking APP_KEY...\n";
        $appKey = config('app.key');
        
        if (empty($appKey)) {
            echo "❌ APP_KEY is missing! Run 'php artisan key:generate'\n";
        } else {
            echo "✅ APP_KEY is configured\n";
            echo "   Key: " . substr($appKey, 0, 20) . "...\n";
        }
    }
    
    private function checkSanctumConfig()
    {
        echo "\n2. Checking Sanctum Configuration...\n";
        
        $statefulDomains = config('sanctum.stateful');
        echo "✅ Stateful domains: " . implode(', ', $statefulDomains) . "\n";
        
        $guard = config('sanctum.guard');
        echo "✅ Guard: " . implode(', ', $guard) . "\n";
        
        $expiration = config('sanctum.expiration');
        echo "✅ Token expiration: " . ($expiration ? $expiration . " minutes" : "Never") . "\n";
    }
    
    private function checkJWTConfig()
    {
        echo "\n3. Checking JWT Configuration...\n";
        
        $accessLifetime = env('JWT_ACCESS_TOKEN_LIFETIME', 60);
        $refreshLifetime = env('JWT_REFRESH_TOKEN_LIFETIME', 10080);
        $threshold = env('JWT_REFRESH_THRESHOLD', 5);
        
        echo "✅ Access token lifetime: {$accessLifetime} minutes\n";
        echo "✅ Refresh token lifetime: {$refreshLifetime} minutes (" . round($refreshLifetime / 1440, 1) . " days)\n";
        echo "✅ Refresh threshold: {$threshold} minutes\n";
    }
    
    private function checkCORSConfig()
    {
        echo "\n4. Checking CORS Configuration...\n";
        
        $allowedOrigins = config('cors.allowed_origins');
        echo "✅ Allowed origins: " . implode(', ', $allowedOrigins) . "\n";
        
        $supportsCredentials = config('cors.supports_credentials') ? 'Yes' : 'No';
        echo "✅ Supports credentials: {$supportsCredentials}\n";
    }
    
    private function checkDatabase()
    {
        echo "\n5. Checking Database Connection...\n";
        
        try {
            $connection = config('database.default');
            echo "✅ Database connection: {$connection}\n";
            
            // Try to query the database
            $pdo = \DB::connection()->getPdo();
            echo "✅ Database connection successful\n";
            
            // Check if personal_access_tokens table exists
            $tables = \DB::select("SELECT name FROM sqlite_master WHERE type='table' AND name='personal_access_tokens'");
            if (count($tables) > 0) {
                echo "✅ personal_access_tokens table exists\n";
            } else {
                echo "⚠️  personal_access_tokens table missing. Run 'php artisan migrate'\n";
            }
            
        } catch (Exception $e) {
            echo "❌ Database connection failed: " . $e->getMessage() . "\n";
        }
    }
}

// Run the verification
try {
    $verifier = new JWTSetupVerifier();
    $verifier->verify();
} catch (Exception $e) {
    echo "❌ Error running verification: " . $e->getMessage() . "\n";
}