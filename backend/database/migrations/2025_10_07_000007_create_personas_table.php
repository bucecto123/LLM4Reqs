<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreatePersonasTable extends Migration
{
    public function up()
    {
        Schema::create('personas', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('type')->default('custom'); // predefined or custom
            $table->string('role')->nullable();
            $table->text('description')->nullable();
            $table->json('priorities')->nullable();
            $table->json('concerns')->nullable();
            $table->json('typical_requirements')->nullable();
            $table->string('communication_style')->nullable();
            $table->string('technical_level')->default('medium');
            $table->longText('prompt_template')->nullable();
            $table->json('focus_areas')->nullable();
            $table->json('example_questions')->nullable();
            $table->json('custom_attributes')->nullable();
            $table->boolean('is_active')->default(true);
            $table->boolean('is_predefined')->default(false);
            $table->foreignId('user_id')->nullable()->constrained()->onDelete('cascade');
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('personas');
    }
}
