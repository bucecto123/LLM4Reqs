<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // For SQLite, we need to recreate the table to add an ID column
        // First, rename the old table
        Schema::rename('password_reset_tokens', 'password_reset_tokens_old');
        
        // Create new table with proper structure
        Schema::create('password_reset_tokens', function (Blueprint $table) {
            $table->id();
            $table->string('email')->index();
            $table->string('token');
            $table->timestamp('expires_at');
            $table->timestamps();
        });
        
        // Copy data from old table
        DB::statement('INSERT INTO password_reset_tokens (email, token, created_at, expires_at) 
                       SELECT email, token, created_at, datetime(created_at, \'+15 minutes\') 
                       FROM password_reset_tokens_old');
        
        // Drop old table
        Schema::dropIfExists('password_reset_tokens_old');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Recreate original structure
        Schema::rename('password_reset_tokens', 'password_reset_tokens_new');
        
        Schema::create('password_reset_tokens', function (Blueprint $table) {
            $table->string('email')->index();
            $table->string('token');
            $table->timestamp('created_at')->nullable();
        });
        
        DB::statement('INSERT INTO password_reset_tokens (email, token, created_at) 
                       SELECT email, token, created_at 
                       FROM password_reset_tokens_new');
        
        Schema::dropIfExists('password_reset_tokens_new');
    }
};
