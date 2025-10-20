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
            $table->foreignId('document_id')->nullable()->after('project_id')->constrained('documents')->onDelete('set null');
            $table->text('requirement_text')->nullable()->after('content');
            $table->string('requirement_type')->nullable()->after('requirement_text'); // functional, non-functional, etc.
            $table->string('source_doc')->nullable()->after('requirement_type'); // source document reference
            $table->json('meta')->nullable()->after('source_doc'); // additional metadata from LLM
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('requirements', function (Blueprint $table) {
            $table->dropForeign(['document_id']);
            $table->dropColumn(['document_id', 'requirement_text', 'requirement_type', 'source_doc', 'meta']);
        });
    }
};
