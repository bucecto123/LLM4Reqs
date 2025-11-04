<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\PersonaService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;

class PersonaController extends Controller
{
    protected $personaService;

    public function __construct(PersonaService $personaService)
    {
        $this->personaService = $personaService;
    }

    /**
     * Get all available personas for the authenticated user
     * GET /api/personas
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $userId = $request->user()->id ?? null;
            $personas = $this->personaService->getAllPersonas($userId);

            // Group by type for easier frontend rendering
            $grouped = [
                'predefined' => $personas->where('type', 'predefined')->values(),
                'custom' => $personas->where('type', 'custom')->values(),
            ];

            return response()->json([
                'success' => true,
                'data' => $grouped,
                'all' => $personas
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch personas',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get a specific persona by ID
     * GET /api/personas/{id}
     */
    public function show(Request $request, int $id): JsonResponse
    {
        try {
            $userId = $request->user()->id ?? null;
            $persona = $this->personaService->getPersonaById($id, $userId);

            if (!$persona) {
                return response()->json([
                    'success' => false,
                    'message' => 'Persona not found or access denied'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'data' => $persona
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch persona',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Create a new custom persona
     * POST /api/personas
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'role' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'priorities' => 'nullable|array',
            'concerns' => 'nullable|array',
            'typical_requirements' => 'nullable|array',
            'communication_style' => 'nullable|string',
            'technical_level' => 'nullable|in:low,medium,high',
            'focus_areas' => 'nullable|array',
            'example_questions' => 'nullable|array',
            'custom_attributes' => 'nullable|array',
            'prompt_template' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $userId = $request->user()->id;
            $persona = $this->personaService->createCustomPersona($userId, $request->all());

            return response()->json([
                'success' => true,
                'message' => 'Custom persona created successfully',
                'data' => $persona
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to create persona',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update a custom persona
     * PUT /api/personas/{id}
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|string|max:255',
            'role' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'priorities' => 'nullable|array',
            'concerns' => 'nullable|array',
            'typical_requirements' => 'nullable|array',
            'communication_style' => 'nullable|string',
            'technical_level' => 'nullable|in:low,medium,high',
            'focus_areas' => 'nullable|array',
            'example_questions' => 'nullable|array',
            'custom_attributes' => 'nullable|array',
            'prompt_template' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $userId = $request->user()->id;
            $persona = $this->personaService->updateCustomPersona($id, $userId, $request->all());

            if (!$persona) {
                return response()->json([
                    'success' => false,
                    'message' => 'Persona not found or you do not have permission to update it'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'message' => 'Persona updated successfully',
                'data' => $persona
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update persona',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete a custom persona
     * DELETE /api/personas/{id}
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        try {
            $userId = $request->user()->id;
            $deleted = $this->personaService->deleteCustomPersona($id, $userId);

            if (!$deleted) {
                return response()->json([
                    'success' => false,
                    'message' => 'Persona not found or you do not have permission to delete it'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'message' => 'Persona deleted successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete persona',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get persona statistics
     * GET /api/personas/{id}/stats
     */
    public function stats(int $id): JsonResponse
    {
        try {
            $stats = $this->personaService->getPersonaStats($id);

            if (empty($stats)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Persona not found'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'data' => $stats
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch persona statistics',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Generate system prompt for a persona
     * POST /api/personas/{id}/prompt
     */
    public function generatePrompt(Request $request, int $id): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'task_type' => 'nullable|in:generate,analyze,review,refine'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $taskType = $request->input('task_type', 'generate');
            $prompt = $this->personaService->generatePersonaPrompt($id, $taskType);

            if (!$prompt) {
                return response()->json([
                    'success' => false,
                    'message' => 'Persona not found'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'persona_id' => $id,
                    'task_type' => $taskType,
                    'system_prompt' => $prompt
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to generate prompt',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
