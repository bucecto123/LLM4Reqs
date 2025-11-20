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
            $table->foreignId('project_id')->constrained('projects')->onDelete('cascade');
            $table->integer('requirement_number');
            $table->string('title');
            $table->text('requirement_text')->nullable();
            $table->string('requirement_type')->default('functional'); // functional, non-functional, constraint
            $table->string('priority')->default('medium'); // low, medium, high
            $table->float('confidence_score')->nullable();
            $table->string('status')->default('draft'); // draft, review, approved
            $table->string('source')->default('manual'); // manual, extracted
            $table->string('source_doc')->nullable(); // source document reference
            $table->json('meta')->nullable(); // additional metadata from LLM
            $table->foreignId('document_id')->nullable()->constrained('documents')->onDelete('set null');
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('requirements');
    }
}
