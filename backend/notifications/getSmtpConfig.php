<?php
/**
 * SMTP Config - loaded from backend config file only.
 * Not editable from the frontend UI.
 */

function getSmtpConfig() {
    $configPath = __DIR__ . '/../config/smtp.php';

    if (!file_exists($configPath)) {
        error_log('SMTP config file not found at: ' . $configPath);
        return [
            'smtp_host'          => '',
            'smtp_port'          => 587,
            'smtp_username'      => '',
            'smtp_password'      => '',
            'from_email'         => '',
            'from_name'          => 'Tool Management System',
            'notification_email' => '',
        ];
    }

    $config = require $configPath;

    return [
        'smtp_host'          => $config['smtp_host']          ?? '',
        'smtp_port'          => (int)($config['smtp_port']    ?? 587),
        'smtp_username'      => $config['smtp_username']      ?? '',
        'smtp_password'      => $config['smtp_password']      ?? '',
        'from_email'         => $config['from_email']         ?? '',
        'from_name'          => $config['from_name']          ?? 'Tool Management System',
        'notification_email' => $config['notification_email'] ?? '',
    ];
}
