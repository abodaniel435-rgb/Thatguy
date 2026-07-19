# Paystack setup for CurrenSee Pro

Use Paystack test keys first. Do not put your secret key in frontend JavaScript.

## 1. Update `api/config.php`

Copy any new keys from `api/config.sample.php` into your real `api/config.php`:

```php
'paystack_public_key' => 'pk_test_your_key_here',
'paystack_secret_key' => 'sk_test_your_key_here',
'paystack_plan_code' => '',
'pro_monthly_amount_kobo' => 500000,
```

`500000` kobo means `NGN 5,000`.

For true automatic monthly billing, create a monthly Paystack plan in the Paystack dashboard and paste its plan code into `paystack_plan_code`.

## 2. Update your database

If the database already exists, run `api/subscription-migration.sql` once in phpMyAdmin.

If this is a brand-new database, use the updated `api/schema.sql`.

## 3. Add your webhook URL in Paystack

In Paystack dashboard, go to **Settings > API Keys & Webhooks** and add:

```text
https://yourdomain.com/api/paystack-webhook.php
```

Use your real domain.

## 4. Test flow

1. Log in to CurrenSee.
2. Open `pricing.html`.
3. Click **Subscribe to Pro**.
4. Complete Paystack test checkout.
5. After redirect, CurrenSee verifies the payment and activates Pro.

Free limits:

- 5 saved history records
- 2 active alerts
- CSV export locked

Pro unlocks:

- unlimited history
- unlimited alerts
- CSV export
