ALTER TABLE users
    ADD COLUMN plan VARCHAR(20) NOT NULL DEFAULT 'free',
    ADD COLUMN subscription_active TINYINT(1) NOT NULL DEFAULT 0,
    ADD COLUMN subscription_expires_at DATETIME NULL;

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
