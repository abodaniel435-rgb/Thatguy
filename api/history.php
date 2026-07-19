<?php

require_once __DIR__ . '/helpers.php';

currensee_require_method('POST');

$pdo = currensee_db();
$userId = currensee_current_user_id();
$input = currensee_read_json();
$action = $input['action'] ?? '';

if ($action === 'add') {
    $entry = $input['entry'] ?? [];
    $insertStmt = $pdo->prepare('
        INSERT INTO history (user_id, from_currency, to_currency, amount, result_text, rate_value, display_date, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
    ');
    $insertStmt->execute([
        $userId,
        $entry['from'] ?? '',
        $entry['to'] ?? '',
        (float) ($entry['amount'] ?? 0),
        $entry['result'] ?? '',
        (string) ($entry['rate'] ?? ''),
        $entry['date'] ?? date('Y-m-d H:i:s'),
    ]);

    $isPro = currensee_user_is_pro($pdo, $userId);

    if (!$isPro) {
        $trimStmt = $pdo->prepare('
            DELETE FROM history
            WHERE user_id = ?
            AND id NOT IN (
                SELECT id FROM (
                    SELECT id FROM history WHERE user_id = ? ORDER BY id DESC LIMIT 5
                ) recent_history
            )
        ');
        $trimStmt->execute([$userId, $userId]);
    }
} elseif ($action === 'clear') {
    $deleteStmt = $pdo->prepare('DELETE FROM history WHERE user_id = ?');
    $deleteStmt->execute([$userId]);
} else {
    currensee_json(['message' => 'Unsupported history action.'], 422);
}

currensee_json([
    'message' => 'History updated.',
    'user' => currensee_user_payload($pdo, $userId)
]);
