<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateRequirementsTable extends Migration
{
    public function up()
    {
        Schema::create('requirements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained()->onDelete('cascade');
            $table->foreignId('document_id')->nullable()->constrained('documents')->onDelete('set null');
            $table->foreignId('conversation_id')->nullable()->constrained('conversations')->onDelete('set null');
            $table->longText('requirement_text');
            $table->string('requirement_type')->nullable();
            $table->string('priority')->default('medium');
            $table->string('status')->default('draft');
            $table->string('source')->default('manual');
            $table->decimal('confidence_score', 5, 4)->nullable();
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('requirements');
    }
}
