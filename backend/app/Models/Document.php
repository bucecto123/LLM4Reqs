<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Document extends Model
{
    use HasFactory;

    protected $fillable = ['project_id', 'conversation_id', 'user_id', 'filename', 'original_filename', 'file_path', 'content', 'file_size', 'file_type', 'status', 'processed_at'];

    protected $dates = ['processed_at'];

    protected $casts = [
        'content' => 'string',
    ];

    public function project()
    {
        return $this->belongsTo(Project::class);
    }

    public function conversation()
    {
        return $this->belongsTo(Conversation::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function requirements()
    {
        return $this->hasMany(Requirement::class);
    }
}
