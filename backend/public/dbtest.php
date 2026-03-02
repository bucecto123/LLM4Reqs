<?php
// Test file to run via web server to check PHP context
header('Content-Type: text/plain');

echo 'PHP SAPI: ' . php_sapi_name() . PHP_EOL;
echo 'open_basedir: ' . (ini_get('open_basedir') ?: 'none') . PHP_EOL;
echo 'doc_root: ' . (ini_get('doc_root') ?: 'none') . PHP_EOL;
echo 'file_exists /var/db/database.sqlite: ' . (file_exists('/var/db/database.sqlite') ? 'YES' : 'NO') . PHP_EOL;
echo 'is_readable: ' . (is_readable('/var/db/database.sqlite') ? 'YES' : 'NO') . PHP_EOL;
echo 'is_writable: ' . (is_writable('/var/db/database.sqlite') ? 'YES' : 'NO') . PHP_EOL;

try {
    $db = new PDO('sqlite:/var/db/database.sqlite');
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $r = $db->query('SELECT count(*) FROM users');
    echo 'PDO connection: OK, users=' . $r->fetchColumn() . PHP_EOL;
} catch (Exception $e) {
    echo 'PDO ERROR: ' . $e->getMessage() . PHP_EOL;
    echo 'PDO error code: ' . $e->getCode() . PHP_EOL;
}
