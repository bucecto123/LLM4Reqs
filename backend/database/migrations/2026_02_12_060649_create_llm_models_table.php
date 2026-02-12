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
        Schema::create('llm_models', function (Blueprint $table) {
            $table->id();
            $table->string('provider'); // 'groq', 'gemini'
            $table->string('model_id')->unique(); // 'llama3-70b-8192', 'gemini-1.5-pro'
            $table->string('name'); // Display name
            $table->boolean('is_active')->default(true);
            $table->integer('context_window')->nullable();
            $table->decimal('input_price', 10, 6)->nullable(); // Per 1M tokens (optional)
            $table->decimal('output_price', 10, 6)->nullable(); // Per 1M tokens (optional)
            $table->boolean('supports_tools')->nullable(); // null = unknown, true = yes, false = no
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('llm_models');
    }
};
