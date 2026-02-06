<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Add indexes for better query performance
        try {
            DB::statement('CREATE INDEX IF NOT EXISTS projects_updated_at_index ON projects(updated_at)');
            DB::statement('CREATE INDEX IF NOT EXISTS projects_owner_updated_index ON projects(owner_id, updated_at)');
            DB::statement('CREATE INDEX IF NOT EXISTS project_collaborators_composite_index ON project_collaborators(project_id, user_id)');
        } catch (\Exception $e) {
            // Indexes might already exist, ignore
        }
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS projects_updated_at_index');
        DB::statement('DROP INDEX IF EXISTS projects_owner_updated_index');
        DB::statement('DROP INDEX IF EXISTS project_collaborators_composite_index');
    }
};
