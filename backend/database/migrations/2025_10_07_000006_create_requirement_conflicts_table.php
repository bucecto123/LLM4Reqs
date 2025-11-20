<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateRequirementConflictsTable extends Migration
{
    public function up()
    {
        Schema::create('requirement_conflicts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained('projects')->onDelete('cascade');
            $table->integer('conflict_number');
            $table->foreignId('requirement_id_1')->constrained('requirements')->onDelete('cascade');
            $table->foreignId('requirement_id_2')->constrained('requirements')->onDelete('cascade');
            $table->text('conflict_description')->nullable();
            $table->string('confidence')->default('medium'); // high, medium, low
            $table->integer('cluster_id')->nullable(); // Semantic cluster ID
            $table->string('severity')->default('medium');
            $table->string('resolution_status')->default('pending');
            $table->text('resolution_notes')->nullable();
            $table->timestamp('detected_at')->nullable();
            $table->timestamp('resolved_at')->nullable();
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('requirement_conflicts');
    }
}
