<?php

require_once __DIR__ . '/helpers.php';

currensee_require_method('POST');

$pdo = currensee_db();
$userId = currensee_current_user_id();
$input = currensee_read_json();
$alerts = $input['alerts'] ?? [];

if (!is_array($alerts)) {
    currensee_json(['message' => 'Alerts payload must be an array.'], 422);
}

$isPro = currensee_user_is_pro($pdo, $userId);

if (!$isPro) {
    $activeAlerts = array_filter($alerts, function ($alert): bool {
        return ($alert['status'] ?? 'active') === 'active';
    });

    if (count($activeAlerts) > 2) {
        currensee_json(['message' => 'Free users can only run 2 active alerts. Upgrade to Pro for unlimited alerts.'], 403);
    }
}

$deleteStmt = $pdo->prepare('DELETE FROM alerts WHERE user_id = ?');
$deleteStmt->execute([$userId]);

$insertStmt = $pdo->prepare('
    INSERT INTO alerts (user_id, from_currency, to_currency, target_rate, alert_type, status, display_date, created_at_rate, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
');

foreach ($alerts as $alert) {
    $insertStmt->execute([
        $userId,
        $alert['from'] ?? '',
        $alert['to'] ?? '',
        (float) ($alert['targetRate'] ?? 0),
        $alert['type'] ?? 'above',
        $alert['status'] ?? 'active',
        $alert['date'] ?? date('Y-m-d H:i:s'),
        (float) ($alert['createdAtRate'] ?? 0),
    ]);
}

currensee_json([
    'message' => 'Alerts updated.',
    'user' => currensee_user_payload($pdo, $userId)
]);
