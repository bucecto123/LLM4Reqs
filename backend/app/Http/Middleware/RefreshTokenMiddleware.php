<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;

class RefreshTokenMiddleware
{
    /**
     * Handle an incoming request for refresh token validation
     */
    public function handle(Request $request, Closure $next)
    {
        $token = $request->bearerToken();
        
        if (!$token) {
            return response()->json(['error' => 'Refresh token required'], 401);
        }

        $accessToken = PersonalAccessToken::findToken($token);
        
        if (!$accessToken) {
            return response()->json(['error' => 'Invalid refresh token'], 401);
        }

        // Check if token has refresh ability
        if (!$accessToken->can('refresh')) {
            return response()->json(['error' => 'Token does not have refresh privileges'], 403);
        }

        // Check if token is expired
        if ($accessToken->expires_at && $accessToken->expires_at->isPast()) {
            return response()->json(['error' => 'Refresh token has expired'], 401);
        }

        // Set the user for the request
        $request->setUserResolver(function () use ($accessToken) {
            return $accessToken->tokenable;
        });

        return $next($request);
    }
}