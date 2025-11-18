<?php

/**
 * Test Password Reset Email Functionality
 * 
 * Usage: php test_password_reset.php
 */

require __DIR__ . '/vendor/autoload.php';

use Illuminate\Support\Facades\Artisan;

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "=== Password Reset Email Test ===\n\n";

// Test 1: Check if user exists
echo "1. Checking for test user...\n";
$user = \App\Models\User::first();

if (!$user) {
    echo "   ❌ No users found in database. Creating test user...\n";
    $user = \App\Models\User::create([
        'name' => 'Test User',
        'email' => 'test@example.com',
        'password' => \Illuminate\Support\Facades\Hash::make('password123'),
    ]);
    echo "   ✅ Test user created: {$user->email}\n";
} else {
    echo "   ✅ Using existing user: {$user->email}\n";
}

// Test 2: Check mail configuration
echo "\n2. Checking mail configuration...\n";
$mailDriver = config('mail.default');
$mailHost = config('mail.mailers.smtp.host');
$mailPort = config('mail.mailers.smtp.port');
$mailFrom = config('mail.from.address');

echo "   Mail Driver: {$mailDriver}\n";
echo "   Mail Host: {$mailHost}\n";
echo "   Mail Port: {$mailPort}\n";
echo "   From Address: {$mailFrom}\n";

if ($mailDriver === 'log') {
    echo "   ⚠️  Using 'log' driver - emails will be logged to storage/logs/laravel.log\n";
} elseif ($mailDriver === 'smtp') {
    echo "   ✅ Using SMTP driver\n";
}

// Test 3: Generate reset code
echo "\n3. Generating password reset code...\n";
$resetCode = \App\Models\PasswordResetToken::generateCode();
echo "   Generated code: {$resetCode}\n";

// Test 4: Store reset token
echo "\n4. Creating password reset token...\n";
\App\Models\PasswordResetToken::where('email', $user->email)->delete();

$resetToken = \App\Models\PasswordResetToken::create([
    'email' => $user->email,
    'token' => \Illuminate\Support\Facades\Hash::make($resetCode),
    'expires_at' => \Carbon\Carbon::now()->addMinutes(15),
]);
echo "   ✅ Token created, expires at: {$resetToken->expires_at}\n";

// Test 5: Send email notification
echo "\n5. Sending password reset email...\n";
try {
    $user->notify(new \App\Notifications\PasswordResetNotification($resetCode));
    echo "   ✅ Email notification sent successfully!\n";
    
    if ($mailDriver === 'log') {
        echo "\n   📧 Check the email in: storage/logs/laravel.log\n";
    }
} catch (\Exception $e) {
    echo "   ❌ Failed to send email: {$e->getMessage()}\n";
    echo "   📝 Check your mail configuration in .env file\n";
}

// Test 6: Verify code
echo "\n6. Verifying reset code...\n";
$isValid = \Illuminate\Support\Facades\Hash::check($resetCode, $resetToken->token);
echo "   Code verification: " . ($isValid ? "✅ Valid" : "❌ Invalid") . "\n";

// Test 7: Queue status
echo "\n7. Checking queue configuration...\n";
$queueDriver = config('queue.default');
echo "   Queue Driver: {$queueDriver}\n";

if ($queueDriver === 'sync') {
    echo "   ℹ️  Emails are sent synchronously (immediately)\n";
} elseif ($queueDriver === 'database') {
    echo "   ℹ️  Emails are queued - make sure to run: php artisan queue:work\n";
    
    $pendingJobs = \Illuminate\Support\Facades\DB::table('jobs')->count();
    echo "   Pending jobs in queue: {$pendingJobs}\n";
}

echo "\n=== Test Summary ===\n";
echo "User Email: {$user->email}\n";
echo "Reset Code: {$resetCode}\n";
echo "Code expires in: 15 minutes\n";

echo "\n=== Next Steps ===\n";
echo "1. Test forgot-password endpoint:\n";
echo "   POST http://localhost:8000/api/auth/forgot-password\n";
echo "   Body: {\"email\":\"{$user->email}\"}\n\n";

echo "2. Check for email in:\n";
if ($mailDriver === 'log') {
    echo "   storage/logs/laravel.log\n\n";
} else {
    echo "   Your email inbox\n\n";
}

echo "3. Test reset-password endpoint:\n";
echo "   POST http://localhost:8000/api/auth/reset-password\n";
echo "   Body: {\n";
echo "     \"email\":\"{$user->email}\",\n";
echo "     \"code\":\"[CODE_FROM_EMAIL]\",\n";
echo "     \"password\":\"newPassword123\",\n";
echo "     \"password_confirmation\":\"newPassword123\"\n";
echo "   }\n\n";

if ($queueDriver === 'database') {
    echo "⚠️  Remember to run: php artisan queue:work\n\n";
}

echo "✅ Test completed!\n";
