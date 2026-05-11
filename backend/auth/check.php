<?php
require_once __DIR__ . '/../middleware/CorsMiddleware.php';
CorsMiddleware::handle();
header('Content-Type: application/json');

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../middleware/security.php';

Security::initSession();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

if (isset($_SESSION['user_id'])) {
    echo json_encode([
        'authenticated' => true,
        'user' => [
            'id' => $_SESSION['user_id'],
            'name' => Security::sanitizeOutput($_SESSION['user_name'] ?? ''),
            'email' => Security::sanitizeOutput($_SESSION['user_email'] ?? ''),
            'role' => Security::sanitizeOutput($_SESSION['user_role'] ?? 'user'),
            'admin_access' => isset($_SESSION['admin_access']) ? (bool)$_SESSION['admin_access'] : false
        ],
        'csrf_token' => Security::generateCsrfToken()
    ]);
} else {
    echo json_encode(['authenticated' => false]);
}