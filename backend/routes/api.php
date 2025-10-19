<?php

use App\Http\Controllers\Api\ConversationController;
use App\Http\Controllers\Api\PersonaController;
use App\Models\Persona;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ChatController;
use App\Http\Controllers\Api\DocumentController;
use App\Http\Controllers\Api\ProjectController;
use App\Http\Controllers\Api\ProjectKBController;

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
});

// Protected API routes
Route::middleware('auth:sanctum')->group(function () {
    // Projects API
    Route::apiResource('projects', ProjectController::class);
    Route::get('/projects/{project}/requirements', [ProjectController::class, 'getRequirements']);
    Route::get('/users/{user}/projects', [ProjectController::class, 'getUserProjects']);

    // Conversations API
    Route::post('/conversations', [ConversationController::class, 'store']);
    // Get all user conversations (normal chat workflow - null project_id)
    Route::get('/conversations', [ConversationController::class, 'getUserConversations']);
    // Get conversations for a specific project (project chat workflow)
    Route::get('/projects/{project}/conversations', [ConversationController::class, 'getProjectConversations']);
    Route::get('/conversations/{conversation}/messages', [ConversationController::class, 'show']);
    Route::post('/conversations/{conversation}/messages', [ConversationController::class, 'sendMessage']);
    Route::put('/conversations/{conversation}', [ConversationController::class, 'update']);
    Route::delete('/conversations/{conversation}', [ConversationController::class, 'destroy']);

    // Document upload and management routes
    Route::post('/documents', [DocumentController::class, 'upload']);
    Route::post('/documents/{id}/process', [DocumentController::class, 'processDocument']);
    Route::get('/projects/{id}/documents', [DocumentController::class, 'getProjectDocuments']);
    Route::post('/projects/{project}/kb/build', [ProjectKBController::class, 'build']);

    // Personas API
    Route::get('/personas', [PersonaController::class,'index']);
});
