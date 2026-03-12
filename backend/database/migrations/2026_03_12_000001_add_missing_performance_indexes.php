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
            // messages: faster fetch by conversation (sorted by time, limited)
            DB::statement('CREATE INDEX IF NOT EXISTS messages_conversation_created_index ON messages(conversation_id, created_at)');

            // conversations: dashboard query filters on both user_id AND project_id
            DB::statement('CREATE INDEX IF NOT EXISTS conversations_user_project_index ON conversations(user_id, project_id)');

            // requirements: filter by project + type together
            DB::statement('CREATE INDEX IF NOT EXISTS requirements_project_type_index ON requirements(project_id, requirement_type)');

            // knowledge_bases: looked up on every single message send
            DB::statement('CREATE INDEX IF NOT EXISTS knowledge_bases_project_index ON knowledge_bases(project_id)');

        } catch (\Exception $e) {
            // Indexes might already exist, ignore silently
        }
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS messages_conversation_created_index');
        DB::statement('DROP INDEX IF EXISTS conversations_user_project_index');
        DB::statement('DROP INDEX IF EXISTS requirements_project_type_index');
        DB::statement('DROP INDEX IF EXISTS knowledge_bases_project_index');
    }
};
