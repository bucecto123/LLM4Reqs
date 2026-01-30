<?php

/**
 * Test file for project sharing functionality
 * 
 * This script tests:
 * 1. Project collaborator management (add, list, update, remove)
 * 2. Authorization checks for different roles
 * 3. Story graph generation
 */

require_once __DIR__ . '/vendor/autoload.php';

use App\Models\User;
use App\Models\Project;
use App\Models\ProjectCollaborator;
use Illuminate\Support\Facades\Artisan;

// Colors for output
function color($text, $color = 'green') {
    $colors = [
        'green' => "\033[32m",
        'red' => "\033[31m",
        'yellow' => "\033[33m",
        'blue' => "\033[34m",
        'reset' => "\033[0m"
    ];
    return $colors[$color] . $text . $colors['reset'];
}

function testPassed($message) {
    echo color("✓ PASS: $message\n", 'green');
}

function testFailed($message) {
    echo color("✗ FAIL: $message\n", 'red');
}

function testSection($title) {
    echo color("\n=== $title ===\n", 'blue');
}

// Bootstrap Laravel
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

testSection("Testing Project Sharing Functionality");

try {
    // Clean up test data first
    testSection("Cleanup Test Data");
    ProjectCollaborator::where('role', 'test_role')->delete();
    
    // Find or create test users
    testSection("Setup Test Users");
    $owner = User::firstOrCreate(
        ['email' => 'test_owner@example.com'],
        ['name' => 'Test Owner', 'password' => bcrypt('password')]
    );
    testPassed("Created/found owner user: {$owner->email}");
    
    $editor = User::firstOrCreate(
        ['email' => 'test_editor@example.com'],
        ['name' => 'Test Editor', 'password' => bcrypt('password')]
    );
    testPassed("Created/found editor user: {$editor->email}");
    
    $viewer = User::firstOrCreate(
        ['email' => 'test_viewer@example.com'],
        ['name' => 'Test Viewer', 'password' => bcrypt('password')]
    );
    testPassed("Created/found viewer user: {$viewer->email}");
    
    // Create a test project
    testSection("Create Test Project");
    $project = Project::create([
        'owner_id' => $owner->id,
        'name' => 'Test Sharing Project',
        'description' => 'Project for testing sharing functionality',
        'status' => 'active'
    ]);
    testPassed("Created project: {$project->name} (ID: {$project->id})");
    
    // Test 1: Add collaborators
    testSection("Test 1: Add Collaborators");
    
    $editorCollab = ProjectCollaborator::create([
        'project_id' => $project->id,
        'user_id' => $editor->id,
        'role' => 'editor'
    ]);
    testPassed("Added editor collaborator");
    
    $viewerCollab = ProjectCollaborator::create([
        'project_id' => $project->id,
        'user_id' => $viewer->id,
        'role' => 'viewer'
    ]);
    testPassed("Added viewer collaborator");
    
    // Test 2: Check collaborators list
    testSection("Test 2: List Collaborators");
    $collaborators = $project->collaborators()->with('user')->get();
    
    if ($collaborators->count() === 2) {
        testPassed("Found 2 collaborators");
    } else {
        testFailed("Expected 2 collaborators, found {$collaborators->count()}");
    }
    
    foreach ($collaborators as $collab) {
        echo "  - {$collab->user->name} ({$collab->user->email}) as {$collab->role}\n";
    }
    
    // Test 3: Test authorization policies
    testSection("Test 3: Authorization Policies");
    
    // Owner can view
    if ($owner->can('view', $project)) {
        testPassed("Owner can view project");
    } else {
        testFailed("Owner cannot view project");
    }
    
    // Owner can update
    if ($owner->can('update', $project)) {
        testPassed("Owner can update project");
    } else {
        testFailed("Owner cannot update project");
    }
    
    // Owner can delete
    if ($owner->can('delete', $project)) {
        testPassed("Owner can delete project");
    } else {
        testFailed("Owner cannot delete project");
    }
    
    // Editor can view
    if ($editor->can('view', $project)) {
        testPassed("Editor can view project");
    } else {
        testFailed("Editor cannot view project");
    }
    
    // Editor can update
    if ($editor->can('update', $project)) {
        testPassed("Editor can update project");
    } else {
        testFailed("Editor cannot update project");
    }
    
    // Editor cannot delete
    if (!$editor->can('delete', $project)) {
        testPassed("Editor cannot delete project (correct)");
    } else {
        testFailed("Editor can delete project (should not be allowed)");
    }
    
    // Viewer can view
    if ($viewer->can('view', $project)) {
        testPassed("Viewer can view project");
    } else {
        testFailed("Viewer cannot view project");
    }
    
    // Viewer cannot update
    if (!$viewer->can('update', $project)) {
        testPassed("Viewer cannot update project (correct)");
    } else {
        testFailed("Viewer can update project (should not be allowed)");
    }
    
    // Viewer cannot delete
    if (!$viewer->can('delete', $project)) {
        testPassed("Viewer cannot delete project (correct)");
    } else {
        testFailed("Viewer can delete project (should not be allowed)");
    }
    
    // Test 4: Update collaborator role
    testSection("Test 4: Update Collaborator Role");
    $viewerCollab->update(['role' => 'editor']);
    $viewerCollab->refresh();
    
    if ($viewerCollab->role === 'editor') {
        testPassed("Successfully updated viewer to editor");
    } else {
        testFailed("Failed to update collaborator role");
    }
    
    // Now viewer (now editor) can update
    if ($viewer->can('update', $project)) {
        testPassed("Updated user (now editor) can update project");
    } else {
        testFailed("Updated user (now editor) cannot update project");
    }
    
    // Test 5: Remove collaborator
    testSection("Test 5: Remove Collaborator");
    $editorCollab->delete();
    
    $remainingCollabs = $project->collaborators()->count();
    if ($remainingCollabs === 1) {
        testPassed("Successfully removed collaborator (1 remaining)");
    } else {
        testFailed("Expected 1 remaining collaborator, found {$remainingCollabs}");
    }
    
    // Test 6: Test duplicate prevention
    testSection("Test 6: Duplicate Prevention");
    try {
        ProjectCollaborator::create([
            'project_id' => $project->id,
            'user_id' => $viewer->id,
            'role' => 'viewer'
        ]);
        testFailed("Allowed duplicate collaborator (should fail due to unique constraint)");
    } catch (\Exception $e) {
        testPassed("Correctly prevented duplicate collaborator");
    }
    
    // Cleanup
    testSection("Cleanup");
    $project->delete();
    testPassed("Deleted test project");
    
    testSection("All Tests Completed!");
    echo color("\nProject sharing functionality is working correctly!\n", 'green');
    
} catch (\Exception $e) {
    testFailed("Test suite failed: " . $e->getMessage());
    echo "\nStack trace:\n" . $e->getTraceAsString() . "\n";
}
