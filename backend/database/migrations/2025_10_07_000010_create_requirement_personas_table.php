<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateRequirementPersonasTable extends Migration
{
    public function up()
    {
        Schema::create('requirement_personas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('requirement_id')->constrained('requirements')->onDelete('cascade');
            $table->foreignId('persona_id')->constrained('personas')->onDelete('cascade');
            $table->boolean('generated')->default(false);
            $table->unique(['requirement_id', 'persona_id']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('requirement_personas');
    }
}
