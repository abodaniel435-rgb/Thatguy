<?php

require_once __DIR__ . '/paystack-helpers.php';

$pdo = currensee_db();
$userId = currensee_current_user_id();
$reference = trim($_GET['reference'] ?? ($_POST['reference'] ?? ''));

if ($reference === '') {
    currensee_json(['message' => 'Payment reference is required.'], 422);
}

$response = currensee_paystack_request(
    'GET',
    'https://api.paystack.co/transaction/verify/' . rawurlencode($reference)
);

$paymentData = $response['data'] ?? [];
$paymentUserId = currensee_find_user_id_for_payment($pdo, $paymentData);
$expectedAmount = currensee_pro_monthly_amount_kobo();

if ((int) $paymentUserId !== $userId) {
    currensee_json(['message' => 'This payment does not belong to the current user.'], 403);
}

if (($paymentData['status'] ?? '') !== 'success') {
    currensee_json(['message' => 'Payment has not been completed.'], 422);
}

if ((int) ($paymentData['amount'] ?? 0) < $expectedAmount) {
    currensee_json(['message' => 'Payment amount is lower than the Pro monthly price.'], 422);
}

currensee_activate_pro($pdo, $userId, $paymentData);

currensee_json([
    'message' => 'Pro subscription activated.',
    'user' => currensee_user_payload($pdo, $userId),
]);
