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
        if (Schema::hasColumn('requirements', 'content')) {
            Schema::table('requirements', function (Blueprint $table) {
                // Only rename the column if it exists
                $table->renameColumn('content', 'requirement_text');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('requirements', 'requirement_text')) {
            Schema::table('requirements', function (Blueprint $table) {
                // Only rename back if the column exists
                $table->renameColumn('requirement_text', 'content');
            });
        }
    }
};
