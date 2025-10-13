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
            // Add missing columns that the controller expects
            $table->string('requirement_type')->nullable()->after('title');
            $table->foreignId('document_id')->nullable()->constrained('documents')->onDelete('set null')->after('project_id');
            $table->string('source')->default('manual')->after('status'); // 'extracted' or 'manual'
            
            // Rename content to requirement_text to match controller
            $table->renameColumn('content', 'requirement_text');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('requirements', function (Blueprint $table) {
            // Remove added columns
            $table->dropColumn(['requirement_type', 'source']);
            $table->dropForeign(['document_id']);
            $table->dropColumn('document_id');
            
            // Rename back
            $table->renameColumn('requirement_text', 'content');
        });
    }
};
