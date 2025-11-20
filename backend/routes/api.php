<?php

use App\Http\Controllers\Api\ConversationController;
use App\Http\Controllers\Api\PersonaController;
use App\Http\Controllers\Api\ConflictController;
use App\Http\Controllers\Api\ExportController;
use App\Models\Persona;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ChatController;
use App\Http\Controllers\Api\DocumentController;
use App\Http\Controllers\Api\ProjectController;
use App\Http\Controllers\Api\ProjectKBController;
use App\Http\Controllers\Api\PasswordResetController;

Route::get('/health', function () {
    return response()->json(['status' => 'ok', 'service' => 'backend']);
});

Route::get('/test-document-routes', function () {
    return response()->json([
        'message' => 'Document routes available',
        'routes' => [
            'POST /api/documents - Upload document',
            'POST /api/documents/{id}/process - Process document',
            'GET /api/projects/{id}/documents - List project documents'
        ]
    ]);
});

Route::post('/chat', [ChatController::class, 'chat']);

// Authentication routes
Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register'])->name('auth.register');
    Route::post('/login', [AuthController::class, 'login'])->name('auth.login');
    Route::post('/refresh', [AuthController::class, 'refresh'])->middleware('auth:sanctum')->name('auth.refresh');
    Route::post('/logout', [AuthController::class, 'logout'])->middleware('auth:sanctum')->name('auth.logout');
    Route::post('/logout-all', [AuthController::class, 'logoutAll'])->middleware('auth:sanctum')->name('auth.logout-all');
    Route::get('/me', [AuthController::class, 'me'])->middleware('auth:sanctum')->name('auth.me');
    
    // Password Reset routes
    Route::post('/forgot-password', [PasswordResetController::class, 'sendResetCode'])->name('auth.forgot-password');
    Route::post('/reset-password', [PasswordResetController::class, 'resetPassword'])->name('auth.reset-password');
    Route::post('/verify-reset-code', [PasswordResetController::class, 'verifyCode'])->name('auth.verify-reset-code');
});

// Protected API routes
Route::middleware('auth:sanctum')->group(function () {
    // Projects API
    Route::apiResource('projects', ProjectController::class);
    Route::get('/projects/{project}/requirements', [ProjectController::class, 'getRequirements']);
    Route::get('/projects/{project}/conflicts', [ProjectController::class, 'getConflicts']);
    Route::get('/users/{user}/projects', [ProjectController::class, 'getUserProjects']);

    // Knowledge Base API
    Route::get('/projects/{project}/kb/status', [ProjectKBController::class, 'getStatus']);
    Route::post('/projects/{project}/kb/build', [ProjectKBController::class, 'build']);
    Route::post('/projects/{project}/kb/reindex', [ProjectKBController::class, 'reindex']);

    // Conversations API
    Route::post('/conversations', [ConversationController::class, 'store']);
    // Get all user conversations (normal chat workflow - null project_id)
    Route::get('/conversations', [ConversationController::class, 'getUserConversations']);
    // Get conversations for a specific project (project chat workflow)
    Route::get('/projects/{project}/conversations', [ConversationController::class, 'getProjectConversations']);
    Route::get('/conversations/{conversation}/messages', [ConversationController::class, 'show']);
    Route::post('/conversations/{conversation}/messages', [ConversationController::class, 'sendMessage']);
    Route::post('/conversations/{conversation}/messages/stream', [ConversationController::class, 'sendMessageStream']);
    Route::put('/conversations/{conversation}', [ConversationController::class, 'update']);
    Route::delete('/conversations/{conversation}', [ConversationController::class, 'destroy']);

    // Document upload and management routes
    Route::post('/documents', [DocumentController::class, 'upload']);
    Route::post('/documents/{id}/process', [DocumentController::class, 'processDocument']);
    Route::get('/projects/{id}/documents', [DocumentController::class, 'getProjectDocuments']);
    Route::delete('/documents/{id}', [DocumentController::class, 'destroy']);

    // Conflict Detection API
    Route::post('/projects/{project}/conflicts/detect', [ConflictController::class, 'detectConflicts']);
    Route::get('/conflicts/status/{jobId}', [ConflictController::class, 'getJobStatus']);
    Route::post('/conflicts/process/{jobId}', [ConflictController::class, 'processJob']);
    Route::get('/projects/{project}/conflicts', [ConflictController::class, 'getProjectConflicts']);
    Route::post('/projects/{project}/conflicts/auto-resolve', [ConflictController::class, 'autoResolveConflicts']);
    Route::post('/conflicts/{conflict}/resolve-ai', [ConflictController::class, 'resolveConflictWithAI']);
    Route::put('/conflicts/{conflict}/resolve', [ConflictController::class, 'resolveConflict']);
    Route::delete('/conflicts/{conflict}', [ConflictController::class, 'deleteConflict']);

    // Personas API
    Route::get('/personas', [PersonaController::class, 'index']);
    Route::get('/personas/{id}', [PersonaController::class, 'show']);
    Route::post('/personas', [PersonaController::class, 'store']);
    Route::put('/personas/{id}', [PersonaController::class, 'update']);
    Route::delete('/personas/{id}', [PersonaController::class, 'destroy']);
    Route::get('/personas/{id}/stats', [PersonaController::class, 'stats']);
    Route::post('/personas/{id}/prompt', [PersonaController::class, 'generatePrompt']);

    // Export API (with CORS for file downloads)
    Route::get('/projects/{project}/export', [ExportController::class, 'exportProject'])->middleware('cors');
});