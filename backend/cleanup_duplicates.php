<?php

/**
 * Cleanup script to remove duplicate messages
 * Run this once with: php cleanup_duplicates.php
 */

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\Message;
use Illuminate\Support\Facades\DB;

echo "🔍 Finding duplicate messages...\n";

// Find duplicates: same conversation_id, role, content, and created_at (within 2 seconds)
$duplicates = DB::select("
    SELECT 
        m1.id as keep_id,
        m2.id as duplicate_id,
        m1.conversation_id,
        m1.role,
        m1.content
    FROM messages m1
    INNER JOIN messages m2 
        ON m1.conversation_id = m2.conversation_id
        AND m1.role = m2.role
        AND m1.content = m2.content
        AND m1.id < m2.id
        AND ABS(strftime('%s', m1.created_at) - strftime('%s', m2.created_at)) < 2
    ORDER BY m1.conversation_id, m1.created_at
");

if (empty($duplicates)) {
    echo "✅ No duplicates found!\n";
    exit(0);
}

echo "Found " . count($duplicates) . " duplicate messages\n";

$deleteIds = [];
foreach ($duplicates as $dup) {
    $deleteIds[] = $dup->duplicate_id;
    echo "  - Duplicate in conversation {$dup->conversation_id}: {$dup->role} message (ID: {$dup->duplicate_id})\n";
}

echo "\n⚠️  About to delete " . count($deleteIds) . " duplicate messages.\n";
echo "Press Enter to continue, or Ctrl+C to cancel...";
fgets(STDIN);

// Delete duplicates
$deleted = Message::whereIn('id', $deleteIds)->delete();

echo "✅ Deleted {$deleted} duplicate messages!\n";
echo "🎉 Cleanup complete!\n";
