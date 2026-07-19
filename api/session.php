<?php

require_once __DIR__ . '/helpers.php';

$userId = $_SESSION['currensee_user_id'] ?? null;

if (!$userId) {
    currensee_json(['authenticated' => false], 401);
}

$pdo = currensee_db();
currensee_json([
    'authenticated' => true,
    'user' => currensee_user_payload($pdo, (int) $userId)
]);
