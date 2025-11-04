<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddActionTypeToPersonaRequirements extends Migration
{
    /**
     * Run the migrations.
     */
    public function up()
    {
        Schema::table('persona_requirements', function (Blueprint $table) {
            // Add action_type if it doesn't exist
            if (!Schema::hasColumn('persona_requirements', 'action_type')) {
                $table->string('action_type')->default('generated')->after('persona_id');
            }
            
            // Drop old persona_view column if exists
            if (Schema::hasColumn('persona_requirements', 'persona_view')) {
                $table->dropColumn('persona_view');
            }
            
            // Drop old generated_at column if exists  
            if (Schema::hasColumn('persona_requirements', 'generated_at')) {
                $table->dropColumn('generated_at');
            }
        });

        // Add unique constraint if it doesn't exist
        try {
            Schema::table('persona_requirements', function (Blueprint $table) {
                $table->unique(['requirement_id', 'persona_id', 'action_type'], 'persona_req_action_unique');
            });
        } catch (\Exception $e) {
            // Index might already exist, ignore
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down()
    {
        Schema::table('persona_requirements', function (Blueprint $table) {
            $table->dropUnique('persona_req_action_unique');
            
            if (Schema::hasColumn('persona_requirements', 'action_type')) {
                $table->dropColumn('action_type');
            }
            
            $table->text('persona_view')->nullable();
            $table->timestamp('generated_at')->nullable();
        });
    }
}
