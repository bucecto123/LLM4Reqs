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
        Schema::table('requirements', function (Blueprint $table) {
            // Add missing fields for KB integration
            // Note: document_id, requirement_type, and requirement_text already exist from previous migration
            
            // Check if columns don't exist before adding them
            if (!Schema::hasColumn('requirements', 'source_doc')) {
                $table->string('source_doc')->nullable()->after('source'); // source document reference
            }
            
            if (!Schema::hasColumn('requirements', 'meta')) {
                $table->json('meta')->nullable()->after('source_doc'); // additional metadata from LLM
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('requirements', function (Blueprint $table) {
            // Only drop the columns we actually added in this migration
            if (Schema::hasColumn('requirements', 'source_doc')) {
                $table->dropColumn('source_doc');
            }
            
            if (Schema::hasColumn('requirements', 'meta')) {
                $table->dropColumn('meta');
            }
        });
    }
};
