<?php

namespace Database\Seeders;

use App\Models\Requirement;
use Illuminate\Database\Seeder;

class RequirementSeeder extends Seeder
{
    public function run()
    {
        Requirement::factory()->count(10)->create();
    }
}
