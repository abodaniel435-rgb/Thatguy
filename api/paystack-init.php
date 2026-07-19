<?php

require_once __DIR__ . '/paystack-helpers.php';

currensee_require_method('POST');

$pdo = currensee_db();
$userId = currensee_current_user_id();
$user = currensee_user_payload($pdo, $userId);
$amount = currensee_pro_monthly_amount_kobo();
$planCode = currensee_paystack_plan_code();
$siteUrl = currensee_site_url();

$payload = [
    'email' => $user['email'],
    'amount' => $amount,
    'currency' => 'NGN',
    'callback_url' => $siteUrl . '/pricing.html?payment=verify',
    'metadata' => [
        'user_id' => $userId,
        'plan' => 'pro',
        'product' => 'CurrenSee Pro Monthly',
    ],
];

if ($planCode !== '') {
    $payload['plan'] = $planCode;
}

$response = currensee_paystack_request(
    'POST',
    'https://api.paystack.co/transaction/initialize',
    $payload
);

currensee_json([
    'authorizationUrl' => $response['data']['authorization_url'] ?? null,
    'reference' => $response['data']['reference'] ?? null,
    'publicKey' => currensee_paystack_public_key(),
]);
