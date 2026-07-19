<?php

require_once __DIR__ . '/helpers.php';

currensee_require_method('POST');

$input = currensee_read_json();
$email = currensee_normalize_email($input['email'] ?? '');
$newPassword = (string) ($input['newPassword'] ?? '');

if ($email === '' || $newPassword === '') {
    currensee_json(['message' => 'Email and new password are required.'], 422);
}

if (strlen($newPassword) < 6) {
    currensee_json(['message' => 'New password must be at least 6 characters.'], 422);
}

$pdo = currensee_db();
$stmt = $pdo->prepare('SELECT id FROM users WHERE email = ? LIMIT 1');
$stmt->execute([$email]);
$user = $stmt->fetch();

if (!$user) {
    currensee_json(['message' => 'No account was found with that email address.'], 404);
}

$updateStmt = $pdo->prepare('UPDATE users SET password_hash = ?, password_updated_at = NOW() WHERE id = ?');
$updateStmt->execute([
    password_hash($newPassword, PASSWORD_DEFAULT),
    $user['id']
]);

if (isset($_SESSION['currensee_user_id']) && (int) $_SESSION['currensee_user_id'] === (int) $user['id']) {
    unset($_SESSION['currensee_user_id']);
}

currensee_json(['message' => 'Password reset successful.']);
