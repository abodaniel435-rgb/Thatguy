<?php

function currensee_db(): PDO
{
    static $pdo = null;

    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $configFile = __DIR__ . '/config.php';

    if (!file_exists($configFile)) {
        throw new RuntimeException('Missing api/config.php. Copy api/config.sample.php to api/config.php and add your database credentials.');
    }

    $config = require $configFile;

    $pdo = new PDO(
        sprintf('mysql:host=%s;dbname=%s;charset=utf8mb4', $config['db_host'], $config['db_name']),
        $config['db_user'],
        $config['db_pass'],
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]
    );

    return $pdo;
}
