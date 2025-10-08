<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Persona extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = ['name', 'role', 'description', 'prompt_template', 'is_default', 'focus_areas'];

    protected $casts = [
        'focus_areas' => 'array',
        'is_default' => 'boolean',
    ];

    // Requirements relation removed — mapping is handled on Requirement/Conversation now.
}
