<?php

require_once __DIR__ . '/helpers.php';

currensee_require_method('POST');

$input = currensee_read_json();
$name = trim($input['name'] ?? '');
$email = currensee_normalize_email($input['email'] ?? '');
$password = (string) ($input['password'] ?? '');

if ($name === '' || $email === '' || $password === '') {
    currensee_json(['message' => 'Name, email, and password are required.'], 422);
}

if (strlen($password) < 6) {
    currensee_json(['message' => 'Password must be at least 6 characters.'], 422);
}

$pdo = currensee_db();
$existingStmt = $pdo->prepare('SELECT id FROM users WHERE email = ? LIMIT 1');
$existingStmt->execute([$email]);

if ($existingStmt->fetch()) {
    currensee_json(['message' => 'An account with this email already exists.'], 409);
}

$insertStmt = $pdo->prepare('
    INSERT INTO users (name, email, password_hash, default_currency, created_at)
    VALUES (?, ?, ?, ?, NOW())
');
$insertStmt->execute([
    $name,
    $email,
    password_hash($password, PASSWORD_DEFAULT),
    'USD'
]);

currensee_json(['message' => 'Account created successfully.']);
