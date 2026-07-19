<?php

require_once __DIR__ . '/helpers.php';

currensee_require_method('POST');

$input = currensee_read_json();
$email = currensee_normalize_email($input['email'] ?? '');
$password = (string) ($input['password'] ?? '');

if ($email === '' || $password === '') {
    currensee_json(['message' => 'Email and password are required.'], 422);
}

$pdo = currensee_db();
$stmt = $pdo->prepare('SELECT id, name, email, password_hash, default_currency FROM users WHERE email = ? LIMIT 1');
$stmt->execute([$email]);
$user = $stmt->fetch();

if (!$user || !password_verify($password, $user['password_hash'])) {
    currensee_json(['message' => 'Invalid email or password.'], 401);
}

$_SESSION['currensee_user_id'] = (int) $user['id'];

$loginStmt = $pdo->prepare('UPDATE users SET last_login_at = NOW() WHERE id = ?');
$loginStmt->execute([$user['id']]);

currensee_json([
    'message' => 'Login successful.',
    'user' => currensee_user_payload($pdo, (int) $user['id'])
]);
