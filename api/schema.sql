CREATE TABLE users (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(190) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    default_currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    plan VARCHAR(20) NOT NULL DEFAULT 'free',
    subscription_active TINYINT(1) NOT NULL DEFAULT 0,
    subscription_expires_at DATETIME NULL,
    created_at DATETIME NOT NULL,
    last_login_at DATETIME NULL,
    password_updated_at DATETIME NULL
);

CREATE TABLE history (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    from_currency VARCHAR(10) NOT NULL,
    to_currency VARCHAR(10) NOT NULL,
    amount DECIMAL(18,4) NOT NULL,
    result_text VARCHAR(120) NOT NULL,
    rate_value VARCHAR(50) NOT NULL,
    display_date VARCHAR(80) NOT NULL,
    created_at DATETIME NOT NULL,
    CONSTRAINT fk_history_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE alerts (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    from_currency VARCHAR(10) NOT NULL,
    to_currency VARCHAR(10) NOT NULL,
    target_rate DECIMAL(18,6) NOT NULL,
    alert_type VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL,
    display_date VARCHAR(80) NOT NULL,
    created_at_rate DECIMAL(18,6) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL,
    CONSTRAINT fk_alerts_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE payments (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    reference VARCHAR(120) NOT NULL UNIQUE,
    amount_kobo INT UNSIGNED NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'NGN',
    status VARCHAR(40) NOT NULL,
    paystack_customer_code VARCHAR(80) NULL,
    paystack_subscription_code VARCHAR(120) NULL,
    paid_at DATETIME NULL,
    raw_payload LONGTEXT NULL,
    created_at DATETIME NOT NULL,
    CONSTRAINT fk_payments_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
