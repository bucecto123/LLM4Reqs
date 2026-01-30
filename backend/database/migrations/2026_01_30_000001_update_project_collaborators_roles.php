<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Update the role column to use enum for better validation
        Schema::table('project_collaborators', function (Blueprint $table) {
            // Add index for better query performance
            $table->index(['project_id', 'role']);
            $table->index('user_id');
        });
        
        // Update existing roles to match new standard
        \DB::table('project_collaborators')
            ->where('role', 'member')
            ->update(['role' => 'editor']);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('project_collaborators', function (Blueprint $table) {
            $table->dropIndex(['project_id', 'role']);
            $table->dropIndex(['user_id']);
        });
    }
};
