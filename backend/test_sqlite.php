<?php
echo 'open_basedir: ' . (ini_get('open_basedir') ?: 'none') . PHP_EOL;
echo 'doc_root: ' . (ini_get('doc_root') ?: 'none') . PHP_EOL;
echo 'PHP SAPI: ' . php_sapi_name() . PHP_EOL;
echo 'file_exists /var/db/database.sqlite: ' . (file_exists('/var/db/database.sqlite') ? 'YES' : 'NO') . PHP_EOL;
echo 'is_readable: ' . (is_readable('/var/db/database.sqlite') ? 'YES' : 'NO') . PHP_EOL;
echo 'is_writable: ' . (is_writable('/var/db/database.sqlite') ? 'YES' : 'NO') . PHP_EOL;
try {
    $db = new PDO('sqlite:/var/db/database.sqlite');
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $r = $db->query('SELECT count(*) FROM users');
    echo "PDO Direct: Users count = " . $r->fetchColumn() . PHP_EOL;
    
    // Test write
    $db->exec("INSERT INTO users (name, email, password, created_at, updated_at) VALUES ('Test', 'test@test.com', 'hash', datetime('now'), datetime('now'))");
    echo "PDO Write: OK" . PHP_EOL;
    $db->exec("DELETE FROM users WHERE email = 'test@test.com'");
    echo "PDO Delete: OK" . PHP_EOL;
    
    echo "PRAGMA journal_mode: " . $db->query('PRAGMA journal_mode')->fetchColumn() . PHP_EOL;
} catch (Exception $e) {
    echo "PDO Error: " . $e->getMessage() . PHP_EOL;
}

// Now test via Laravel
define('LARAVEL_START', microtime(true));
require '/var/www/html/vendor/autoload.php';
$app = require_once '/var/www/html/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

try {
    $count = DB::table('users')->count();
    echo "Laravel DB: Users count = $count" . PHP_EOL;
    
    $hash = Hash::make('test123');
    echo "Bcrypt: " . strlen($hash) . " chars (rounds=" . config('app.bcrypt_rounds', env('BCRYPT_ROUNDS', 12)) . ")" . PHP_EOL;
} catch (Exception $e) {
    echo "Laravel Error: " . $e->getMessage() . PHP_EOL;
}
