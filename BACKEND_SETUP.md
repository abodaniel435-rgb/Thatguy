# CurrenSee Shared Account Setup

This setup enables the same account data across multiple devices on your cPanel-hosted site.

## What it adds

- Shared login accounts in MySQL
- Shared conversion history
- Shared alerts
- Password hashing on the server
- cPanel-friendly PHP API endpoints

## 1. Create a MySQL database in cPanel

In cPanel:

1. Open `MySQL Database Wizard`
2. Create a new database
3. Create a database user
4. Add the user to the database
5. Give the user `ALL PRIVILEGES`

Save these values:

- Database host: usually `localhost`
- Database name
- Database username
- Database password

## 2. Create the tables

1. Open `phpMyAdmin`
2. Select your new database
3. Open the `SQL` tab
4. Paste the contents of `api/schema.sql`
5. Run it

## 3. Configure the backend

1. In your hosted `curensee` folder, go to `api`
2. Copy `config.sample.php`
3. Rename the copy to `config.php`
4. Edit `config.php` and add your real database credentials

Example:

```php
<?php

return [
    'db_host' => 'localhost',
    'db_name' => 'your_real_database_name',
    'db_user' => 'your_real_database_user',
    'db_pass' => 'your_real_database_password',
];
```

## 4. Upload the project

Upload the updated site files, including:

- `backend.js`
- `api/` folder
- updated `auth.js`
- updated `script.js`
- updated `alerts.js`
- updated `history.js`
- updated HTML files

## 5. Test

1. Register a new account on the hosted site
2. Log in on device 1
3. Create a conversion or alert
4. Log in on device 2 with the same account
5. Confirm the same history and alerts appear there too

## Important note

The current password reset flow is still a simple direct reset form. It now updates the database, but it is not yet a production-grade email reset flow.
