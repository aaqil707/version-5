<?php
require_once __DIR__ . '/../middleware/CorsMiddleware.php';
CorsMiddleware::handle();
header('Content-Type: application/json');

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../middleware/security.php';
require_once __DIR__ . '/../middleware/AuditLogger.php';

Security::initSession();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

Security::requireAuth();
Security::checkPermission(Security::PERM_MANAGE_USERS);

$csrfToken = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
if (!Security::validateCsrfToken($csrfToken)) {
    http_response_code(403);
    echo json_encode(['error' => 'Invalid CSRF token']);
    exit;
}

// Admin only - only admins can grant/revoke admin access
if (!Security::isAdmin()) {
    http_response_code(403);
    echo json_encode(['error' => 'Permission denied. Admin access required.']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);
$userId = (int)($data['user_id'] ?? 0);
$grantAdmin = $data['grant_admin'] ?? true;

$adminId = $_SESSION['user_id'] ?? null;
$adminEmail = $_SESSION['user_email'] ?? null;

if (!$userId) {
    http_response_code(400);
    echo json_encode(['error' => 'User ID is required']);
    exit;
}

if ($userId === $adminId) {
    http_response_code(400);
    echo json_encode(['error' => 'Cannot modify your own admin access']);
    exit;
}

try {
    $stmt = $pdo->prepare("SELECT id, name, email, admin_access FROM users WHERE id = ?");
    $stmt->execute([$userId]);
    $targetUser = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$targetUser) {
        http_response_code(404);
        echo json_encode(['error' => 'User not found']);
        exit;
    }
    
    $newAdminAccess = $grantAdmin ? 1 : 0;
    $newRole = $grantAdmin ? 'admin' : 'user';
    
    $pdo->prepare("UPDATE users SET role = ?, admin_access = ? WHERE id = ?")
        ->execute([$newRole, $newAdminAccess, $userId]);
    
    $action = $grantAdmin ? 'admin_access_granted' : 'admin_access_revoked';
    AuditLogger::log($action, [
        'target_user_id' => $userId,
        'target_user_email' => $targetUser['email'],
        'target_user_name' => $targetUser['name'],
        'granted_by' => $adminEmail
    ], $adminId, $adminEmail);
    
    $message = $grantAdmin 
        ? 'Admin access granted successfully' 
        : 'Admin access revoked successfully';
    
    echo json_encode([
        'success' => true,
        'message' => $message
    ]);
    
} catch (Exception $e) {
    error_log('setAdminAccess error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Operation failed']);
}