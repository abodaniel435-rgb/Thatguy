<?php

require_once __DIR__ . '/helpers.php';

function currensee_config(): array
{
    $configFile = __DIR__ . '/config.php';

    if (!file_exists($configFile)) {
        currensee_json(['message' => 'Missing api/config.php. Add your database and Paystack keys.'], 500);
    }

    return require $configFile;
}

function currensee_paystack_secret_key(): string
{
    $config = currensee_config();
    $secretKey = trim((string) ($config['paystack_secret_key'] ?? ''));

    if ($secretKey === '') {
        currensee_json(['message' => 'Missing Paystack secret key in api/config.php.'], 500);
    }

    return $secretKey;
}

function currensee_paystack_public_key(): string
{
    $config = currensee_config();
    return trim((string) ($config['paystack_public_key'] ?? ''));
}

function currensee_pro_monthly_amount_kobo(): int
{
    $config = currensee_config();
    return (int) ($config['pro_monthly_amount_kobo'] ?? 500000);
}

function currensee_paystack_plan_code(): string
{
    $config = currensee_config();
    return trim((string) ($config['paystack_plan_code'] ?? ''));
}

function currensee_paystack_request(string $method, string $url, ?array $payload = null): array
{
    $ch = curl_init($url);
    $headers = [
        'Authorization: Bearer ' . currensee_paystack_secret_key(),
        'Content-Type: application/json',
    ];

    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST => strtoupper($method),
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_TIMEOUT => 30,
    ]);

    if ($payload !== null) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    }

    $response = curl_exec($ch);
    $error = curl_error($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($response === false) {
        currensee_json(['message' => 'Paystack request failed: ' . $error], 502);
    }

    $data = json_decode((string) $response, true);
    if (!is_array($data)) {
        currensee_json(['message' => 'Invalid Paystack response.'], 502);
    }

    if ($status < 200 || $status >= 300 || empty($data['status'])) {
        currensee_json(['message' => $data['message'] ?? 'Paystack request was not successful.'], 502);
    }

    return $data;
}

function currensee_site_url(): string
{
    $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
    $scriptDir = str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '/api'));
    $baseDir = preg_replace('#/api$#', '', $scriptDir);

    return rtrim($scheme . '://' . $host . $baseDir, '/');
}

function currensee_add_month(string $dateTime): string
{
    $date = new DateTime($dateTime);
    $date->modify('+1 month');
    return $date->format('Y-m-d H:i:s');
}

function currensee_activate_pro(PDO $pdo, int $userId, array $paymentData): bool
{
    $reference = (string) ($paymentData['reference'] ?? '');
    if ($reference === '') {
        return false;
    }

    if ((int) ($paymentData['amount'] ?? 0) < currensee_pro_monthly_amount_kobo()) {
        return false;
    }

    $existingStmt = $pdo->prepare('SELECT id FROM payments WHERE reference = ? LIMIT 1');
    $existingStmt->execute([$reference]);
    if ($existingStmt->fetch()) {
        return false;
    }

    $amount = (int) ($paymentData['amount'] ?? 0);
    $currency = (string) ($paymentData['currency'] ?? 'NGN');
    $status = (string) ($paymentData['status'] ?? 'success');
    $paidAt = !empty($paymentData['paid_at'])
        ? date('Y-m-d H:i:s', strtotime((string) $paymentData['paid_at']))
        : date('Y-m-d H:i:s');
    $customerCode = $paymentData['customer']['customer_code'] ?? null;
    $subscriptionCode = $paymentData['subscription']['subscription_code'] ?? ($paymentData['subscription'] ?? null);
    $rawPayload = json_encode($paymentData);

    $insertStmt = $pdo->prepare('
        INSERT INTO payments (user_id, reference, amount_kobo, currency, status, paystack_customer_code, paystack_subscription_code, paid_at, raw_payload, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    ');
    $insertStmt->execute([
        $userId,
        $reference,
        $amount,
        $currency,
        $status,
        $customerCode,
        is_string($subscriptionCode) ? $subscriptionCode : null,
        $paidAt,
        $rawPayload,
    ]);

    $userStmt = $pdo->prepare('SELECT subscription_expires_at FROM users WHERE id = ? LIMIT 1');
    $userStmt->execute([$userId]);
    $user = $userStmt->fetch();
    $currentExpiry = $user['subscription_expires_at'] ?? null;
    $baseDate = ($currentExpiry && strtotime($currentExpiry) > time()) ? $currentExpiry : date('Y-m-d H:i:s');
    $newExpiry = currensee_add_month($baseDate);

    $updateStmt = $pdo->prepare('
        UPDATE users
        SET plan = ?, subscription_active = ?, subscription_expires_at = ?
        WHERE id = ?
    ');
    $updateStmt->execute(['pro', 1, $newExpiry, $userId]);

    return true;
}

function currensee_find_user_id_for_payment(PDO $pdo, array $paymentData): ?int
{
    $metadata = $paymentData['metadata'] ?? [];
    $userId = isset($metadata['user_id']) ? (int) $metadata['user_id'] : 0;

    if ($userId > 0) {
        return $userId;
    }

    $email = currensee_normalize_email($paymentData['customer']['email'] ?? '');
    if ($email === '') {
        return null;
    }

    $stmt = $pdo->prepare('SELECT id FROM users WHERE email = ? LIMIT 1');
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    return $user ? (int) $user['id'] : null;
}
