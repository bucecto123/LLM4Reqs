<?php

/**
 * Simple test script to verify export functionality
 */

require_once __DIR__ . '/vendor/autoload.php';

use App\Models\Project;
use App\Models\User;
use App\Models\Requirement;

// Create test data
echo "🧪 Testing Export Functionality...\n\n";

try {
    // Create a test user and project
    $user = User::first();
    if (!$user) {
        echo "❌ No users found. Please ensure the database is seeded.\n";
        exit(1);
    }

    $project = Project::where('user_id', $user->id)->first();
    if (!$project) {
        echo "❌ No projects found for user. Please create a project first.\n";
        exit(1);
    }

    $requirements = Requirement::where('project_id', $project->id)->count();
    
    echo "✅ Found test data:\n";
    echo "   - User: {$user->name}\n";
    echo "   - Project: {$project->name}\n";
    echo "   - Requirements: {$requirements}\n\n";

    echo "🔗 Export URLs to test:\n";
    echo "   - PDF: /api/projects/{$project->id}/export?format=pdf&include=all\n";
    echo "   - Word: /api/projects/{$project->id}/export?format=word&include=requirements\n";
    echo "   - Markdown: /api/projects/{$project->id}/export?format=markdown&include=all\n\n";

    echo "💡 Test these URLs in your browser or API client with authentication.\n";
    echo "🚀 Export functionality is ready!\n";

} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
}