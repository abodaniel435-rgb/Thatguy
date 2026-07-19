<?php

require_once __DIR__ . '/helpers.php';

currensee_require_method('POST');

$input = currensee_read_json();
$type = trim((string) ($input['type'] ?? ''));
$to = 'abodaniel435@gmail.com';
$from = 'support@danielwebservices.com';
$fromName = 'CurrenSee Support';

function currensee_clean_mail_value(string $value): string
{
    return trim(str_replace(["\r", "\n"], ' ', $value));
}

function currensee_clean_mail_body(string $value): string
{
    return trim(str_replace("\r", '', $value));
}

if ($type === 'support') {
    $name = currensee_clean_mail_value((string) ($input['name'] ?? ''));
    $email = currensee_clean_mail_value((string) ($input['email'] ?? ''));
    $category = currensee_clean_mail_value((string) ($input['category'] ?? ''));
    $message = currensee_clean_mail_body((string) ($input['message'] ?? ''));

    if ($name === '' || !filter_var($email, FILTER_VALIDATE_EMAIL) || $message === '') {
        currensee_json(['message' => 'Please complete the support form with a valid email address.'], 422);
    }

    $subject = 'CurrenSee Support Request';
    $body = implode("\n\n", [
        "Name: {$name}",
        "Email: {$email}",
        "Category: {$category}",
        "Message:",
        $message,
    ]);
} elseif ($type === 'feedback') {
    $rating = (int) ($input['rating'] ?? 0);
    $likes = currensee_clean_mail_body((string) ($input['likes'] ?? ''));
    $improvements = currensee_clean_mail_body((string) ($input['improvements'] ?? ''));
    $email = currensee_clean_mail_value((string) ($input['email'] ?? ''));

    if ($rating < 1 || $rating > 5 || $likes === '' || $improvements === '') {
        currensee_json(['message' => 'Please choose a rating and complete both feedback fields.'], 422);
    }

    $subject = 'CurrenSee Product Feedback';
    $body = implode("\n\n", [
        "Rating: {$rating}/5",
        "Account email: " . ($email !== '' ? $email : 'Not available'),
        "What they like most:",
        $likes,
        "What should improve:",
        $improvements,
    ]);
} else {
    currensee_json(['message' => 'Unsupported contact request.'], 422);
}

function currensee_smtp_read($socket): string
{
    $data = '';

    while ($line = fgets($socket, 515)) {
        $data .= $line;
        if (isset($line[3]) && $line[3] === ' ') {
            break;
        }
    }

    return $data;
}

function currensee_smtp_command($socket, string $command, array $expectedCodes): string
{
    fwrite($socket, $command . "\r\n");
    $response = currensee_smtp_read($socket);
    $code = (int) substr($response, 0, 3);

    if (!in_array($code, $expectedCodes, true)) {
        throw new RuntimeException('SMTP error: ' . trim($response));
    }

    return $response;
}

function currensee_format_address(string $email, string $name = ''): string
{
    if ($name === '') {
        return $email;
    }

    return sprintf('"%s" <%s>', addcslashes($name, '"\\'), $email);
}

function currensee_smtp_send(array $config, string $to, string $subject, string $body, string $from, string $fromName, string $replyTo): void
{
    $host = (string) ($config['host'] ?? '');
    $port = (int) ($config['port'] ?? 465);
    $username = (string) ($config['username'] ?? '');
    $password = (string) ($config['password'] ?? '');
    $secure = strtolower((string) ($config['secure'] ?? 'ssl'));

    if ($host === '' || $username === '' || $password === '') {
        throw new RuntimeException('Missing SMTP configuration.');
    }

    $remote = $secure === 'ssl' ? "ssl://{$host}" : $host;
    $socket = fsockopen($remote, $port, $errno, $errstr, 20);

    if (!$socket) {
        throw new RuntimeException("Could not connect to SMTP server: {$errstr}");
    }

    try {
        stream_set_timeout($socket, 20);
        $greeting = currensee_smtp_read($socket);
        if ((int) substr($greeting, 0, 3) !== 220) {
            throw new RuntimeException('SMTP error: ' . trim($greeting));
        }

        currensee_smtp_command($socket, 'EHLO danielwebservices.com', [250]);

        if ($secure === 'tls') {
            currensee_smtp_command($socket, 'STARTTLS', [220]);
            if (!stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
                throw new RuntimeException('Could not start SMTP TLS encryption.');
            }
            currensee_smtp_command($socket, 'EHLO danielwebservices.com', [250]);
        }

        currensee_smtp_command($socket, 'AUTH LOGIN', [334]);
        currensee_smtp_command($socket, base64_encode($username), [334]);
        currensee_smtp_command($socket, base64_encode($password), [235]);
        currensee_smtp_command($socket, 'MAIL FROM:<' . $from . '>', [250]);
        currensee_smtp_command($socket, 'RCPT TO:<' . $to . '>', [250, 251]);
        currensee_smtp_command($socket, 'DATA', [354]);

        $headers = [
            'From: ' . currensee_format_address($from, $fromName),
            'To: ' . $to,
            'Reply-To: ' . $replyTo,
            'Subject: ' . $subject,
            'MIME-Version: 1.0',
            'Content-Type: text/plain; charset=UTF-8',
        ];

        $message = implode("\r\n", $headers) . "\r\n\r\n" . $body;
        $message = preg_replace('/^\./m', '..', $message);

        fwrite($socket, $message . "\r\n.\r\n");
        $response = currensee_smtp_read($socket);
        if ((int) substr($response, 0, 3) !== 250) {
            throw new RuntimeException('SMTP error: ' . trim($response));
        }

        currensee_smtp_command($socket, 'QUIT', [221]);
    } finally {
        fclose($socket);
    }
}

$replyTo = $email !== '' ? $email : $to;
$mailConfigFile = __DIR__ . '/mail.config.php';
$sent = false;

if (file_exists($mailConfigFile)) {
    try {
        currensee_smtp_send(require $mailConfigFile, $to, $subject, $body, $from, $fromName, $replyTo);
        $sent = true;
    } catch (Throwable $error) {
        currensee_json(['message' => $error->getMessage()], 500);
    }
} else {
    $headers = [
        'From: ' . currensee_format_address($from, $fromName),
        'Reply-To: ' . $replyTo,
        'Content-Type: text/plain; charset=UTF-8',
    ];

    $sent = mail($to, $subject, $body, implode("\r\n", $headers));
}

if (!$sent) {
    currensee_json(['message' => 'Could not send the message right now. Please try again later.'], 500);
}

currensee_json(['message' => 'Message sent.']);
