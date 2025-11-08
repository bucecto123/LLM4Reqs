<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddConflictDetectionFields extends Migration
{
    public function up()
    {
        Schema::table('requirement_conflicts', function (Blueprint $table) {
            // Add fields needed for domain-agnostic conflict detection
            $table->string('confidence')->default('medium')->after('conflict_description'); // high, medium, low
            $table->integer('cluster_id')->nullable()->after('confidence'); // Semantic cluster ID
            $table->timestamp('detected_at')->nullable()->change(); // Make nullable if not already
        });
    }

    public function down()
    {
        Schema::table('requirement_conflicts', function (Blueprint $table) {
            $table->dropColumn(['confidence', 'cluster_id']);
        });
    }
}
