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

Security::requireAuth();
Security::checkPermission(Security::PERM_MANAGE_USERS);

try {
    $stmt = $pdo->prepare("SELECT id, name, email, role, admin_access, is_verified FROM users WHERE is_verified = 1 ORDER BY name ASC");
    $stmt->execute();
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $sanitizedUsers = array_map(function($user) {
        return [
            'id' => (int)$user['id'],
            'name' => Security::sanitizeOutput($user['name']),
            'email' => Security::sanitizeOutput($user['email']),
            'role' => $user['role'],
            'admin_access' => (bool)$user['admin_access']
        ];
    }, $users);
    
    echo json_encode([
        'success' => true,
        'users' => $sanitizedUsers
    ]);
    
} catch (Exception $e) {
    error_log('getAllUsersForAdmin error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Failed to fetch users: ' . $e->getMessage()
    ]);
}