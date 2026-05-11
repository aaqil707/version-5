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

$status = $_GET['status'] ?? 'all';
$validStatuses = ['all', 'Active', 'Inactive'];
if (!in_array($status, $validStatuses)) {
    $status = 'all';
}

try {
    $sql = "SELECT id, name, email, role, admin_access, is_verified, failed_login_attempts, locked_until, last_login_at, created_at, status FROM users";
    $params = [];
    
    if ($status !== 'all') {
        $sql .= " WHERE status = ?";
        $params[] = $status;
    }
    
    $sql .= " ORDER BY created_at DESC";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $sanitizedUsers = array_map(function($user) {
        return [
            'id' => (int)$user['id'],
            'name' => Security::sanitizeOutput($user['name']),
            'email' => Security::sanitizeOutput($user['email']),
            'role' => $user['role'],
            'admin_access' => (bool)$user['admin_access'],
            'is_verified' => (bool)$user['is_verified'],
            'status' => $user['status'] ?? 'Active',
            'failed_login_attempts' => (int)$user['failed_login_attempts'],
            'locked_until' => $user['locked_until'],
            'last_login_at' => $user['last_login_at'],
            'created_at' => $user['created_at']
        ];
    }, $users);
    
    echo json_encode([
        'success' => true,
        'users' => $sanitizedUsers
    ]);
    
} catch (Exception $e) {
    error_log('getUsers error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Failed to fetch users: ' . $e->getMessage()
    ]);
}