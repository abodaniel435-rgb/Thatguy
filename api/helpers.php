<?php

require_once __DIR__ . '/db.php';

if (session_status() !== PHP_SESSION_ACTIVE) {
    session_start();
}

function currensee_json(array $payload, int $status = 200): void
{
    http_response_code($status);
    header('Content-Type: application/json');
    echo json_encode($payload);
    exit;
}

function currensee_read_json(): array
{
    $raw = file_get_contents('php://input');
    if (!$raw) {
        return [];
    }

    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

function currensee_require_method(string $method): void
{
    if ($_SERVER['REQUEST_METHOD'] !== strtoupper($method)) {
        currensee_json(['message' => 'Method not allowed.'], 405);
    }
}

function currensee_normalize_email(string $email): string
{
    return strtolower(trim($email));
}

function currensee_current_user_id(): int
{
    $userId = $_SESSION['currensee_user_id'] ?? null;
    if (!$userId) {
        currensee_json(['message' => 'Unauthorized.'], 401);
    }

    return (int) $userId;
}

function currensee_user_is_pro(PDO $pdo, int $userId): bool
{
    try {
        $userStmt = $pdo->prepare('SELECT plan, subscription_active, subscription_expires_at FROM users WHERE id = ? LIMIT 1');
        $userStmt->execute([$userId]);
        $user = $userStmt->fetch();

        return $user
            && ($user['plan'] ?? 'free') === 'pro'
            && !empty($user['subscription_active'])
            && (empty($user['subscription_expires_at']) || strtotime($user['subscription_expires_at']) >= time());
    } catch (Throwable $error) {
        return false;
    }
}

function currensee_user_payload(PDO $pdo, int $userId): array
{
    $userStmt = $pdo->prepare('SELECT * FROM users WHERE id = ? LIMIT 1');
    $userStmt->execute([$userId]);
    $user = $userStmt->fetch();

    if (!$user) {
        unset($_SESSION['currensee_user_id']);
        currensee_json(['message' => 'Unauthorized.'], 401);
    }

    $alertsStmt = $pdo->prepare('
        SELECT from_currency, to_currency, target_rate, alert_type, status, display_date, created_at_rate
        FROM alerts
        WHERE user_id = ?
        ORDER BY id ASC
    ');
    $alertsStmt->execute([$userId]);
    $alerts = array_map(function (array $row): array {
        return [
            'from' => $row['from_currency'],
            'to' => $row['to_currency'],
            'targetRate' => (float) $row['target_rate'],
            'type' => $row['alert_type'],
            'status' => $row['status'],
            'date' => $row['display_date'],
            'createdAtRate' => (float) $row['created_at_rate'],
        ];
    }, $alertsStmt->fetchAll());

    $historyStmt = $pdo->prepare('
        SELECT from_currency, to_currency, amount, result_text, rate_value, display_date
        FROM history
        WHERE user_id = ?
        ORDER BY id ASC
    ');
    $historyStmt->execute([$userId]);
    $history = array_map(function (array $row): array {
        return [
            'from' => $row['from_currency'],
            'to' => $row['to_currency'],
            'amount' => (float) $row['amount'],
            'result' => $row['result_text'],
            'rate' => $row['rate_value'],
            'date' => $row['display_date'],
        ];
    }, $historyStmt->fetchAll());

    return [
        'id' => (int) $user['id'],
        'name' => $user['name'],
        'email' => $user['email'],
        'defaultCurrency' => $user['default_currency'] ?: 'USD',
        'plan' => $user['plan'] ?? 'free',
        'subscriptionActive' => !empty($user['subscription_active']),
        'subscriptionExpiresAt' => $user['subscription_expires_at'] ?? null,
        'alerts' => $alerts,
        'history' => $history,
    ];
}
