<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Hash;

class AuthService
{
    public function login($email, $password)
    {
        $user = User::where('email', $email)->first();

        if (!$user || ! Hash::check($password, $user->password)) {
            throw new \Exception('Invalid credentials');
        }
        return $user;
    }

    /**
     * Generate tokens with access and refresh tokens
     */
    public function generateTokens(User $user)
    {
        // Get token lifetimes from environment (with defaults)
        $accessTokenLifetime = (int) env('JWT_ACCESS_TOKEN_LIFETIME', 60); // minutes
        $refreshTokenLifetime = (int) env('JWT_REFRESH_TOKEN_LIFETIME', 10080); // minutes (7 days)
        
        // Create access token with configurable expiry
        $accessToken = $user->createToken(
            env('SANCTUM_TOKEN_PREFIX', 'llm4reqs') . '-access-token', 
            ['access'], 
            now()->addMinutes($accessTokenLifetime)
        );

        // Create refresh token with configurable expiry
        $refreshToken = $user->createToken(
            env('SANCTUM_TOKEN_PREFIX', 'llm4reqs') . '-refresh-token', 
            ['refresh'], 
            now()->addMinutes($refreshTokenLifetime)
        );

        return [
            'user' => $user->makeHidden(['password']),
            'access_token' => $accessToken->plainTextToken,
            'refresh_token' => $refreshToken->plainTextToken,
            'token_type' => 'Bearer',
            'expires_in' => $accessTokenLifetime * 60, // Convert to seconds
            'refresh_expires_in' => $refreshTokenLifetime * 60, // Convert to seconds
            'expires_at' => $accessToken->accessToken->expires_at->toISOString(),
            'refresh_expires_at' => $refreshToken->accessToken->expires_at->toISOString(),
        ];
    }
}
