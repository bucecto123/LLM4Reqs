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
        Schema::create('knowledge_bases', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->unique()->constrained('projects')->onDelete('cascade');
            $table->enum('status', ['not_built', 'queued', 'building', 'ready', 'failed'])->default('not_built');
            $table->string('index_path')->nullable();
            $table->string('meta_path')->nullable();
            $table->integer('version')->default(0);
            $table->integer('documents_count')->default(0);
            $table->timestamp('last_built_at')->nullable();
            $table->text('last_error')->nullable();
            $table->string('job_id')->nullable(); // Track async build job ID
            $table->integer('build_progress')->default(0);
            $table->string('build_stage')->default('not_started');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('knowledge_bases');
    }
};
