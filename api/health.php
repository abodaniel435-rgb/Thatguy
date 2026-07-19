<?php

require_once __DIR__ . '/db.php';

header('Content-Type: application/json');

try {
    currensee_db();
    echo json_encode(['ok' => true]);
} catch (Throwable $error) {
    http_response_code(200);
    echo json_encode([
        'ok' => false,
        'message' => $error->getMessage()
    ]);
}
