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
        Schema::table('personas', function (Blueprint $table) {
            $table->string('type')->default('custom')->after('name'); // predefined or custom
            $table->json('priorities')->nullable()->after('description');
            $table->json('concerns')->nullable()->after('priorities');
            $table->json('typical_requirements')->nullable()->after('concerns');
            $table->string('communication_style')->nullable()->after('typical_requirements');
            $table->string('technical_level')->default('medium')->after('communication_style');
            $table->json('example_questions')->nullable()->after('focus_areas');
            $table->boolean('is_active')->default(true)->after('prompt_template');
            $table->foreignId('user_id')->nullable()->after('is_active')->constrained()->onDelete('cascade');
            $table->boolean('is_predefined')->default(false)->after('is_default');
            $table->dropColumn('is_default');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('personas', function (Blueprint $table) {
            $table->boolean('is_default')->default(false);
            $table->dropColumn([
                'type',
                'priorities',
                'concerns',
                'typical_requirements',
                'communication_style',
                'technical_level',
                'example_questions',
                'is_active',
                'user_id',
                'is_predefined'
            ]);
        });
    }
};
