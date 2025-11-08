<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PersonaRequirement extends Model
{
    use HasFactory;

    protected $fillable = [
        'requirement_id',
        'persona_id',
        'action_type'
    ];

    /**
     * Relationship: Belongs to a requirement
     */
    public function requirement()
    {
        return $this->belongsTo(Requirement::class);
    }

    /**
     * Relationship: Belongs to a persona
     */
    public function persona()
    {
        return $this->belongsTo(Persona::class);
    }
}
