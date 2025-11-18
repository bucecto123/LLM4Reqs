<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

class AddRequirementNumberToRequirementsTable extends Migration
{
    public function up()
    {
        Schema::table('requirements', function (Blueprint $table) {
            $table->integer('requirement_number')->nullable()->after('project_id');
        });

        // Populate existing requirements with sequential numbers per project
        $projects = DB::table('requirements')
            ->select('project_id')
            ->distinct()
            ->pluck('project_id');

        foreach ($projects as $projectId) {
            $requirements = DB::table('requirements')
                ->where('project_id', $projectId)
                ->whereNull('deleted_at')
                ->orderBy('id')
                ->get();

            $counter = 1;
            foreach ($requirements as $requirement) {
                DB::table('requirements')
                    ->where('id', $requirement->id)
                    ->update(['requirement_number' => $counter++]);
            }
        }

        // Make requirement_number not nullable after populating
        Schema::table('requirements', function (Blueprint $table) {
            $table->integer('requirement_number')->nullable(false)->change();
        });
    }

    public function down()
    {
        Schema::table('requirements', function (Blueprint $table) {
            $table->dropColumn('requirement_number');
        });
    }
}
