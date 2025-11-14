<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Project;
use App\Models\Requirement;
use App\Models\RequirementConflict;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

class ExportTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_export_requirements_as_pdf()
    {
        $user = User::factory()->create();
        $project = Project::factory()->create(['user_id' => $user->id]);
        
        // Create some test requirements
        Requirement::factory()->count(3)->create([
            'project_id' => $project->id
        ]);

        Sanctum::actingAs($user);

        $response = $this->get("/api/projects/{$project->id}/export?format=pdf&include=requirements");

        $response->assertStatus(200);
        $response->assertHeader('Content-Type', 'application/pdf');
    }

    public function test_can_export_conflicts_as_word()
    {
        $user = User::factory()->create();
        $project = Project::factory()->create(['user_id' => $user->id]);
        
        // Create requirements and conflicts
        $req1 = Requirement::factory()->create(['project_id' => $project->id]);
        $req2 = Requirement::factory()->create(['project_id' => $project->id]);
        
        RequirementConflict::factory()->create([
            'requirement_id_1' => $req1->id,
            'requirement_id_2' => $req2->id,
            'conflict_description' => 'Test conflict',
            'severity' => 'high'
        ]);

        Sanctum::actingAs($user);

        $response = $this->get("/api/projects/{$project->id}/export?format=word&include=conflicts");

        $response->assertStatus(200);
        $response->assertHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    }

    public function test_can_export_everything_as_markdown()
    {
        $user = User::factory()->create();
        $project = Project::factory()->create(['user_id' => $user->id]);
        
        // Create some test data
        $req1 = Requirement::factory()->create(['project_id' => $project->id]);
        $req2 = Requirement::factory()->create(['project_id' => $project->id]);
        
        RequirementConflict::factory()->create([
            'requirement_id_1' => $req1->id,
            'requirement_id_2' => $req2->id
        ]);

        Sanctum::actingAs($user);

        $response = $this->get("/api/projects/{$project->id}/export?format=markdown&include=all");

        $response->assertStatus(200);
        $response->assertHeader('Content-Type', 'text/markdown');
        $this->assertStringContainsString('# ' . $project->name, $response->getContent());
    }

    public function test_export_requires_authentication()
    {
        $project = Project::factory()->create();

        $response = $this->get("/api/projects/{$project->id}/export?format=pdf&include=requirements");

        $response->assertStatus(401);
    }

    public function test_export_validates_parameters()
    {
        $user = User::factory()->create();
        $project = Project::factory()->create(['user_id' => $user->id]);

        Sanctum::actingAs($user);

        // Test invalid format
        $response = $this->get("/api/projects/{$project->id}/export?format=invalid&include=requirements");
        $response->assertStatus(422);

        // Test invalid include
        $response = $this->get("/api/projects/{$project->id}/export?format=pdf&include=invalid");
        $response->assertStatus(422);
    }
}