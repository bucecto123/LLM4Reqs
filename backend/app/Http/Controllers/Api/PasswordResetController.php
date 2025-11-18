<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PasswordResetToken;
use App\Models\User;
use App\Notifications\PasswordResetNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Carbon\Carbon;

class PasswordResetController extends Controller
{
    /**
     * Send password reset code to user's email
     */
    public function sendResetCode(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email|exists:users,email',
        ], [
            'email.exists' => 'No account found with this email address.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'error' => 'Validation failed',
                'messages' => $validator->errors()
            ], 422);
        }

        $user = User::where('email', $request->email)->first();

        // Delete any existing reset tokens for this email
        PasswordResetToken::where('email', $request->email)->delete();

        // Generate a 6-digit code
        $resetCode = PasswordResetToken::generateCode();

        // Store the reset token
        PasswordResetToken::create([
            'email' => $request->email,
            'token' => Hash::make($resetCode),
            'expires_at' => Carbon::now()->addMinutes(15),
        ]);

        // Send the notification
        try {
            $user->notify(new PasswordResetNotification($resetCode));
        } catch (\Exception $e) {
            \Log::error('Password reset email failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'error' => 'Failed to send email. Please check mail configuration.',
                'details' => config('app.debug') ? $e->getMessage() : null,
                'trace' => config('app.debug') ? $e->getTraceAsString() : null
            ], 500);
        }

        return response()->json([
            'message' => 'Password reset code has been sent to your email.'
        ], 200);
    }

    /**
     * Reset password using the code
     */
    public function resetPassword(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email',
            'code' => 'required|string|size:6',
            'password' => 'required|string|min:8|confirmed',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'error' => 'Validation failed',
                'messages' => $validator->errors()
            ], 422);
        }

        $user = User::where('email', $request->email)->first();

        if (!$user) {
            return response()->json([
                'error' => 'Invalid reset code or email.'
            ], 400);
        }

        // Get all non-expired tokens for this email
        $resetTokens = PasswordResetToken::where('email', $request->email)
            ->where('expires_at', '>', Carbon::now())
            ->get();

        if ($resetTokens->isEmpty()) {
            return response()->json([
                'error' => 'Reset code has expired or does not exist.'
            ], 400);
        }

        // Check if any token matches the provided code
        $validToken = null;
        foreach ($resetTokens as $token) {
            if (Hash::check($request->code, $token->token)) {
                $validToken = $token;
                break;
            }
        }

        if (!$validToken) {
            return response()->json([
                'error' => 'Invalid reset code.'
            ], 400);
        }

        // Update the user's password
        $user->password = Hash::make($request->password);
        $user->save();

        // Delete all reset tokens for this email
        PasswordResetToken::where('email', $request->email)->delete();

        // Optionally, revoke all existing tokens for security
        $user->tokens()->delete();

        return response()->json([
            'message' => 'Password has been reset successfully. Please login with your new password.'
        ], 200);
    }

    /**
     * Verify if a reset code is valid (optional endpoint for frontend validation)
     */
    public function verifyCode(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email',
            'code' => 'required|string|size:6',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'error' => 'Validation failed',
                'messages' => $validator->errors()
            ], 422);
        }

        $resetTokens = PasswordResetToken::where('email', $request->email)
            ->where('expires_at', '>', Carbon::now())
            ->get();

        if ($resetTokens->isEmpty()) {
            return response()->json([
                'valid' => false,
                'message' => 'Code has expired or does not exist.'
            ], 200);
        }

        foreach ($resetTokens as $token) {
            if (Hash::check($request->code, $token->token)) {
                return response()->json([
                    'valid' => true,
                    'message' => 'Code is valid.'
                ], 200);
            }
        }

        return response()->json([
            'valid' => false,
            'message' => 'Invalid code.'
        ], 200);
    }
}
