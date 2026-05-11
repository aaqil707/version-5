<?php
/**
 * Get CSRF Token
 * Public endpoint to get a CSRF token for signup
 */

require_once __DIR__ . '/../middleware/CorsMiddleware.php';
CorsMiddleware::handle();
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate');

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../middleware/security.php';

// Initialize session and generate CSRF token
Security::initSession();
$csrfToken = Security::generateCsrfToken();

echo json_encode([
    'success' => true,
    'csrf_token' => $csrfToken
]);