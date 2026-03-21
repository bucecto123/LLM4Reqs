<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        try {
            // conversations: sorting project conversations by updated_at
            DB::statement('CREATE INDEX IF NOT EXISTS conversations_project_updated_index ON conversations(project_id, updated_at)');

            // conversations: sorting user (non-project) conversations by updated_at
            DB::statement('CREATE INDEX IF NOT EXISTS conversations_user_updated_index ON conversations(user_id, updated_at)');

            // requirements: filter/sort by priority within a project
            DB::statement('CREATE INDEX IF NOT EXISTS requirements_project_priority_index ON requirements(project_id, priority)');

            // conflicts: filter/sort by severity within a project
            DB::statement('CREATE INDEX IF NOT EXISTS requirement_conflicts_project_severity_index ON requirement_conflicts(project_id, severity)');

            // conflicts: filter by resolution_status within a project
            DB::statement('CREATE INDEX IF NOT EXISTS requirement_conflicts_project_resolution_index ON requirement_conflicts(project_id, resolution_status)');
        } catch (\Exception $e) {
            // Indexes might already exist, ignore silently
        }
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS conversations_project_updated_index');
        DB::statement('DROP INDEX IF EXISTS conversations_user_updated_index');
        DB::statement('DROP INDEX IF EXISTS requirements_project_priority_index');
        DB::statement('DROP INDEX IF EXISTS requirement_conflicts_project_severity_index');
        DB::statement('DROP INDEX IF EXISTS requirement_conflicts_project_resolution_index');
    }
};
