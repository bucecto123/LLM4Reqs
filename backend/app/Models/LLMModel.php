<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LLMModel extends Model
{
    use HasFactory;

    protected $table = 'llm_models';

    protected $fillable = [
        'provider',
        'model_id',
        'name',
        'is_active',
        'context_window',
        'input_price',
        'output_price',
        'supports_tools',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'supports_tools' => 'boolean',
        'input_price' => 'decimal:6',
        'output_price' => 'decimal:6',
    ];
}
