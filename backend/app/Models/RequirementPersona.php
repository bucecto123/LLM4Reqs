<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RequirementPersona extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $fillable = ['requirement_id', 'persona_id', 'generated'];
}
