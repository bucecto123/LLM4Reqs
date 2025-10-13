<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ChatController;
use App\Http\Controllers\DocumentController;

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

Route::post('/register', [AuthController::class, 'register'])->name('auth.register');
Route::post('/login', [AuthController::class, 'login']);
Route::post('/logout', [AuthController::class, 'logout'])->middleware('auth:sanctum');

// Document upload and management routes
Route::middleware(['auth:sanctum'])->group(function () {
    Route::post('/documents', [DocumentController::class, 'upload']);
    Route::post('/documents/{id}/process', [DocumentController::class, 'processDocument']);
    Route::get('/projects/{id}/documents', [DocumentController::class, 'getProjectDocuments']);
});
