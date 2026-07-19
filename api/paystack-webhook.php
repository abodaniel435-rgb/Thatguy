<?php

require_once __DIR__ . '/paystack-helpers.php';

$rawBody = file_get_contents('php://input') ?: '';
$signature = $_SERVER['HTTP_X_PAYSTACK_SIGNATURE'] ?? '';
$expectedSignature = hash_hmac('sha512', $rawBody, currensee_paystack_secret_key());

if (!hash_equals($expectedSignature, $signature)) {
    http_response_code(401);
    echo 'Invalid signature';
    exit;
}

$event = json_decode($rawBody, true);
if (!is_array($event)) {
    http_response_code(400);
    echo 'Invalid payload';
    exit;
}

$eventName = $event['event'] ?? '';
$paymentData = $event['data'] ?? [];

if ($eventName === 'charge.success' && is_array($paymentData)) {
    $pdo = currensee_db();
    $userId = currensee_find_user_id_for_payment($pdo, $paymentData);

    if ($userId) {
        currensee_activate_pro($pdo, $userId, $paymentData);
    }
}

http_response_code(200);
echo 'OK';
