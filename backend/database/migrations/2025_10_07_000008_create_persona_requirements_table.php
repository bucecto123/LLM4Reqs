<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreatePersonaRequirementsTable extends Migration
{
    public function up()
    {
        Schema::create('persona_requirements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('requirement_id')->constrained('requirements')->onDelete('cascade');
            $table->foreignId('persona_id')->constrained('personas')->onDelete('cascade');
            $table->string('action_type')->default('generated');
            $table->timestamps();
            $table->unique(['requirement_id', 'persona_id', 'action_type'], 'persona_req_action_unique');
        });
    }

    public function down()
    {
        Schema::dropIfExists('persona_requirements');
    }
}
