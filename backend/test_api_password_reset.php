<?php

/**
 * Quick test for Password Reset API endpoints
 * 
 * Usage: php test_api_password_reset.php
 */

// Test configuration
$baseUrl = 'http://localhost:8000';
$testEmail = 'huskymudkipper1482004@gmail.com';

echo "=== Testing Password Reset API ===\n\n";

// Test 1: Forgot Password
echo "1. Testing POST /api/auth/forgot-password\n";
$ch = curl_init("$baseUrl/api/auth/forgot-password");
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode(['email' => $testEmail]));
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
curl_close($ch);

if ($error) {
    echo "   ❌ cURL Error: $error\n";
    echo "   ⚠️  Make sure the Laravel server is running: php artisan serve\n";
    exit(1);
}

echo "   HTTP Status: $httpCode\n";
echo "   Response: $response\n";

if ($httpCode === 200) {
    echo "   ✅ Forgot password request successful!\n";
    echo "   📧 Check storage/logs/laravel.log for the email with reset code\n";
} else {
    echo "   ❌ Request failed\n";
}

echo "\n";

// Instructions for next steps
echo "=== Next Steps ===\n\n";
echo "1. Check the email code in: backend/storage/logs/laravel.log\n";
echo "   Look for a 6-digit code in the email body\n\n";

echo "2. Test the reset password endpoint:\n";
echo "   POST $baseUrl/api/auth/reset-password\n";
echo "   Body: {\n";
echo "     \"email\": \"$testEmail\",\n";
echo "     \"code\": \"YOUR_6_DIGIT_CODE\",\n";
echo "     \"password\": \"newPassword123\",\n";
echo "     \"password_confirmation\": \"newPassword123\"\n";
echo "   }\n\n";

echo "3. Or use this curl command (replace CODE with actual code):\n";
echo "   curl -X POST $baseUrl/api/auth/reset-password \\\n";
echo "     -H \"Content-Type: application/json\" \\\n";
echo "     -d '{\"email\":\"$testEmail\",\"code\":\"CODE\",\"password\":\"newPassword123\",\"password_confirmation\":\"newPassword123\"}'\n\n";

echo "✅ Test completed!\n";
