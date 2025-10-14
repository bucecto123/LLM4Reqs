<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ConversationRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        // For creating conversations, project_id is now optional (nullable)
        // Normal chat workflow: project_id is null
        // Project chat workflow: project_id is provided
        if ($this->isMethod('POST')) {
            return [
                'project_id' => 'nullable|integer|exists:projects,id',
                'requirement_id' => 'nullable|integer|exists:requirements,id',
                'title' => 'nullable|string|max:255',
                'context' => 'nullable|string',
                'status' => 'nullable|string|in:active,inactive',
            ];
        }
        
        // For updating conversations, only allow certain fields
        return [
            'title' => 'sometimes|string|max:255',
            'context' => 'sometimes|string',
            'status' => 'sometimes|string|in:active,inactive',
        ];
    }
}
