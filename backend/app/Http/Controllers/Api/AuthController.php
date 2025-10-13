<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\AuthRequest;
use App\Services\AuthService;
use Illuminate\Http\Request;
use App\Models\User;

class AuthController extends Controller
{
    public function register(AuthRequest $request)
    {
        $user = User::create([
            'name' => $request['name'] ?? null,
            'email' => $request['email'],
            'password' => $request['password'],
        ]);

        $token = $user->createToken('api-token')->plainTextToken;

        return response()->json(['user' => $user, 'token' => $token]);
    }

    public function login(AuthRequest $request, AuthService $auth_service)
    {
        try {
            $user = $auth_service->login($request['email'], $request['password']);
            $token = $user->createToken('api-token')->plainTextToken;
    
            return response()->json(['user' => $user, 'token' => $token]);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 401);
        }
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()?->delete();

        return response()->json(['message' => 'logged out']);
    }
}
