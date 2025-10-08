<?php

namespace Database\Seeders;

use App\Models\User;
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Database\Seeders\PersonaSeeder;
use Database\Seeders\ProjectSeeder;
use Database\Seeders\RequirementSeeder;
use Database\Seeders\ConversationSeeder;
use Database\Seeders\DocumentSeeder;
use Database\Seeders\MessageSeeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // User::factory(10)->create();

        User::factory()->create([
            'name' => 'Test User',
            'email' => 'test@example.com',
        ]);

        $this->call([
            PersonaSeeder::class,
            ProjectSeeder::class,
            RequirementSeeder::class,
            ConversationSeeder::class,
            DocumentSeeder::class,
            MessageSeeder::class,
        ]);
    }
}
