<?php

return [

    /*
    |--------------------------------------------------------------------------
    | JWT Configuration
    |--------------------------------------------------------------------------
    |
    | Configuration settings for JWT authentication implementation
    |
    */

    'access_token_lifetime' => (int) env('JWT_ACCESS_TOKEN_LIFETIME', 60), // minutes
    'refresh_token_lifetime' => (int) env('JWT_REFRESH_TOKEN_LIFETIME', 10080), // minutes (7 days)
    'refresh_threshold' => (int) env('JWT_REFRESH_THRESHOLD', 5), // minutes before expiry to auto-refresh
    
    /*
    |--------------------------------------------------------------------------
    | Token Settings
    |--------------------------------------------------------------------------
    */
    
    'token_prefix' => env('SANCTUM_TOKEN_PREFIX', 'llm4reqs'),
    'access_token_name' => env('SANCTUM_TOKEN_PREFIX', 'llm4reqs') . '-access-token',
    'refresh_token_name' => env('SANCTUM_TOKEN_PREFIX', 'llm4reqs') . '-refresh-token',
    
    /*
    |--------------------------------------------------------------------------
    | Security Settings
    |--------------------------------------------------------------------------
    */
    
    'max_refresh_attempts' => 3,
    'rate_limit_requests' => (int) env('API_RATE_LIMIT', 60),
    'rate_limit_period' => 60, // seconds
    
    /*
    |--------------------------------------------------------------------------
    | CORS Settings
    |--------------------------------------------------------------------------
    */
    
    'cors' => [
        'paths' => ['api/*', 'sanctum/csrf-cookie'],
        'allowed_methods' => ['*'],
        'allowed_origins' => explode(',', env('CORS_ALLOWED_ORIGINS', 'http://localhost:5173')),
        'allowed_origins_patterns' => [],
        'allowed_headers' => ['*'],
        'exposed_headers' => [],
        'max_age' => 0,
        'supports_credentials' => true,
    ],

];