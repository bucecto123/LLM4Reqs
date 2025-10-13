<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\AuthRequest;
use App\Services\AuthService;
use Illuminate\Http\Request;
use App\Models\User;
use Laravel\Sanctum\PersonalAccessToken;

class AuthController extends Controller
{
    public function register(AuthRequest $request)
    {
        $user = User::create([
            'name' => $request['name'] ?? null,
            'email' => $request['email'],
            'password' => $request['password'],
        ]);

        return $this->generateTokenResponse($user);
    }

    public function login(AuthRequest $request, AuthService $auth_service)
    {
        try {
            $user = $auth_service->login($request['email'], $request['password']);
            return $this->generateTokenResponse($user);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 401);
        }
    }

    public function refresh(Request $request)
    {
        try {
            $user = $request->user();
            
            if (!$user) {
                return response()->json(['error' => 'Invalid refresh token'], 401);
            }

            // Delete the current token
            $request->user()->currentAccessToken()?->delete();
            
            // Generate new tokens
            return $this->generateTokenResponse($user);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Token refresh failed'], 401);
        }
    }

    public function logout(Request $request)
    {
        try {
            // Delete current access token
            $request->user()->currentAccessToken()?->delete();
            
            // Optionally, delete all tokens for this user
            // $request->user()->tokens()->delete();

            return response()->json(['message' => 'Successfully logged out']);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Logout failed'], 500);
        }
    }

    public function logoutAll(Request $request)
    {
        try {
            // Delete all tokens for the user
            $request->user()->tokens()->delete();

            return response()->json(['message' => 'Successfully logged out from all devices']);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Logout failed'], 500);
        }
    }

    public function me(Request $request)
    {
        return response()->json([
            'user' => $request->user(),
            'token_info' => [
                'expires_at' => $request->user()->currentAccessToken()->expires_at,
                'last_used_at' => $request->user()->currentAccessToken()->last_used_at,
            ]
        ]);
    }

    /**
     * Generate token response with access and refresh tokens
     */
    private function generateTokenResponse(User $user)
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

        return response()->json([
            'user' => $user->makeHidden(['password']),
            'access_token' => $accessToken->plainTextToken,
            'refresh_token' => $refreshToken->plainTextToken,
            'token_type' => 'Bearer',
            'expires_in' => $accessTokenLifetime * 60, // Convert to seconds
            'refresh_expires_in' => $refreshTokenLifetime * 60, // Convert to seconds
            'expires_at' => $accessToken->accessToken->expires_at->toISOString(),
            'refresh_expires_at' => $refreshToken->accessToken->expires_at->toISOString(),
        ]);
    }
}
