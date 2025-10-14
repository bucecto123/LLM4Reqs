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
    protected $authService;

    public function __construct(AuthService $authService)
    {
        $this->authService = $authService;
    }

    public function register(AuthRequest $request)
    {
        $user = User::create([
            'name' => $request['name'] ?? null,
            'email' => $request['email'],
            'password' => $request['password'],
        ]);

        $tokens = $this->authService->generateTokens($user);
        return response()->json($tokens, 201);
    }

    public function login(AuthRequest $request, AuthService $authService)
    {
        try {
            $user = $authService->login($request['email'], $request['password']);
            $token = $this->authService->generateTokens($user);
            return response()->json($token);
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
            $token = $this->authService->generateTokens($user);
            return response()->json($token);
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
}
