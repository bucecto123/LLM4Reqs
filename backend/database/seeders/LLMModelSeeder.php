<?php

namespace Database\Seeders;

use App\Models\LLMModel;
use Illuminate\Database\Seeder;

class LLMModelSeeder extends Seeder
{
    /**
     * Seed a curated set of known Groq models so the selector works on first boot
     * without needing a live API call. The /api/llm/sync endpoint can refresh
     * this list later when a valid GROQ_API_KEY is available.
     */
    public function run(): void
    {
        $models = [
            [
                'provider'       => 'groq',
                'model_id'       => 'llama-3.3-70b-versatile',
                'name'           => 'Llama 3.3 70B Versatile',
                'context_window' => 128000,
                'supports_tools' => true,
                'is_active'      => true,
            ],
            [
                'provider'       => 'groq',
                'model_id'       => 'llama-3.1-8b-instant',
                'name'           => 'Llama 3.1 8B Instant',
                'context_window' => 131072,
                'supports_tools' => true,
                'is_active'      => true,
            ],
            [
                'provider'       => 'groq',
                'model_id'       => 'llama3-70b-8192',
                'name'           => 'Llama 3 70B',
                'context_window' => 8192,
                'supports_tools' => true,
                'is_active'      => true,
            ],
            [
                'provider'       => 'groq',
                'model_id'       => 'llama3-8b-8192',
                'name'           => 'Llama 3 8B',
                'context_window' => 8192,
                'supports_tools' => true,
                'is_active'      => true,
            ],
            [
                'provider'       => 'groq',
                'model_id'       => 'mixtral-8x7b-32768',
                'name'           => 'Mixtral 8x7B',
                'context_window' => 32768,
                'supports_tools' => true,
                'is_active'      => true,
            ],
            [
                'provider'       => 'groq',
                'model_id'       => 'gemma2-9b-it',
                'name'           => 'Gemma 2 9B',
                'context_window' => 8192,
                'supports_tools' => false,
                'is_active'      => true,
            ],
            [
                'provider'       => 'groq',
                'model_id'       => 'deepseek-r1-distill-llama-70b',
                'name'           => 'DeepSeek R1 Distill 70B',
                'context_window' => 131072,
                'supports_tools' => false,
                'is_active'      => true,
            ],
        ];

        foreach ($models as $model) {
            LLMModel::updateOrCreate(
                ['model_id' => $model['model_id']],
                $model
            );
        }
    }
}
