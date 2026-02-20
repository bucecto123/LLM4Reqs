<?php
$host = getenv('DB_HOST');
echo "DB_HOST from env: '$host'\n";
if (!$host) {
    echo "DB_HOST not set! Using default 'db' for test.\n";
    $host = 'db';
}
try {
    $dsn = "pgsql:host=$host;port=5432;dbname=llm4reqs";
    echo "Connecting to: $dsn\n";
    $pdo = new PDO($dsn, 'postgres', '1023maledeeptry');
    echo "Connection successful!\n";
} catch (PDOException $e) {
    echo "Connection failed: " . $e->getMessage() . "\n";
}
