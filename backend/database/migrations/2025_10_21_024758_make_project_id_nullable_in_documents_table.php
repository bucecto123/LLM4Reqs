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
        // For SQLite, we need to recreate the table
        // First, check if we're using SQLite
        $driver = DB::connection()->getDriverName();
        
        if ($driver === 'sqlite') {
            // SQLite approach: recreate the table
            Schema::table('documents', function (Blueprint $table) {
                $table->dropForeign(['project_id']);
            });
            
            // Now alter the column to be nullable
            DB::statement('CREATE TABLE documents_temp AS SELECT * FROM documents');
            Schema::drop('documents');
            
            Schema::create('documents', function (Blueprint $table) {
                $table->id();
                $table->foreignId('project_id')->nullable()->constrained('projects')->onDelete('cascade');
                $table->foreignId('conversation_id')->nullable()->constrained('conversations')->onDelete('set null');
                $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
                $table->string('filename');
                $table->string('original_filename')->nullable();
                $table->string('file_path')->nullable();
                $table->longText('content')->nullable();
                $table->bigInteger('file_size')->nullable();
                $table->string('file_type')->nullable();
                $table->string('status')->default('uploaded');
                $table->timestamp('processed_at')->nullable();
                $table->timestamps();
                $table->softDeletes();
            });
            
            DB::statement('INSERT INTO documents SELECT * FROM documents_temp');
            Schema::drop('documents_temp');
        } else {
            // MySQL/PostgreSQL approach
            Schema::table('documents', function (Blueprint $table) {
                $table->dropForeign(['project_id']);
                $table->foreignId('project_id')->nullable()->change();
                $table->foreign('project_id')->references('id')->on('projects')->onDelete('cascade');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $driver = DB::connection()->getDriverName();
        
        if ($driver === 'sqlite') {
            // For rollback, we'd need to make it NOT NULL again
            // This is complex with SQLite, so we'll just note it
            // In practice, rolling back this migration would require manual intervention
        } else {
            Schema::table('documents', function (Blueprint $table) {
                $table->dropForeign(['project_id']);
                $table->foreignId('project_id')->nullable(false)->change();
                $table->foreign('project_id')->references('id')->on('projects')->onDelete('cascade');
            });
        }
    }
};
