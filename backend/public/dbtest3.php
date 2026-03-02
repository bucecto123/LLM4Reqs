<?php
try {
    $pdo = new PDO("sqlite:/var/db/database.sqlite", null, null, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
    echo "Connected OK\n";
    $pdo->prepare("pragma foreign_keys = 1")->execute();
    echo "pragma foreign_keys OK\n";
    $stmt = $pdo->prepare("select count(*) as aggregate from users where email = ?");
    $stmt->execute(["test@test.com"]);
    echo "query OK: " . json_encode($stmt->fetch()) . "\n";
} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}
