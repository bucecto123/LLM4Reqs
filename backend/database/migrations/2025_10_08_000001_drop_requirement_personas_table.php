cd<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class DropRequirementPersonasTable extends Migration
{
    public function up()
    {
        if (Schema::hasTable('requirement_personas')) {
            Schema::dropIfExists('requirement_personas');
        }
    }

    public function down()
    {
        // no-op: table intentionally removed
    }
}
