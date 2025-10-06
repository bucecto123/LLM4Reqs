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
}
