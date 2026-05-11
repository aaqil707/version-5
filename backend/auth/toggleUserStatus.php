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

$data = json_decode(file_get_contents('php://input'), true);
$userId = (int)($data['user_id'] ?? 0);
$action = $data['action'] ?? '';

$adminId = $_SESSION['user_id'] ?? null;
$adminEmail = $_SESSION['user_email'] ?? null;

if (!$userId) {
    http_response_code(400);
    echo json_encode(['error' => 'User ID is required']);
    exit;
}

if ($userId === $adminId) {
    http_response_code(400);
    echo json_encode(['error' => 'Cannot modify your own account']);
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
        
        if ($action === 'deactivate') {
            $pdo->prepare("UPDATE users SET failed_login_attempts = 999, locked_until = '2099-12-31 23:59:59', status = 'Inactive' WHERE id = ?")
                ->execute([$userId]);
        
        AuditLogger::log('user_deactivated', [
            'target_user_id' => $userId,
            'target_user_email' => $targetUser['email']
        ], $adminId, $adminEmail);
        
        echo json_encode(['success' => true, 'message' => 'User deactivated successfully']);
        
    } elseif ($action === 'activate') {
        $pdo->prepare("UPDATE users SET failed_login_attempts = 0, locked_until = NULL, status = 'Active' WHERE id = ?")
            ->execute([$userId]);
        
        AuditLogger::log('user_activated', [
            'target_user_id' => $userId,
            'target_user_email' => $targetUser['email']
        ], $adminId, $adminEmail);
        
        echo json_encode(['success' => true, 'message' => 'User activated successfully']);
        
    } elseif ($action === 'inactivate') {
        $pdo->prepare("UPDATE users SET status = 'Inactive' WHERE id = ?")
            ->execute([$userId]);
        
        AuditLogger::log('user_inactivated', [
            'target_user_id' => $userId,
            'target_user_email' => $targetUser['email']
        ], $adminId, $adminEmail);
        
        echo json_encode(['success' => true, 'message' => 'User inactivated successfully']);
        
    } elseif ($action === 'activate_status') {
        $pdo->prepare("UPDATE users SET status = 'Active', failed_login_attempts = 0, locked_until = NULL WHERE id = ?")
            ->execute([$userId]);
        
        AuditLogger::log('user_status_activated', [
            'target_user_id' => $userId,
            'target_user_email' => $targetUser['email']
        ], $adminId, $adminEmail);
        
        echo json_encode(['success' => true, 'message' => 'User status activated successfully']);
        
    } elseif ($action === 'promote') {
        $newAccess = $targetUser['admin_access'] ? 0 : 1;
        $newRole = $newAccess ? 'admin' : 'user';
        
        $pdo->prepare("UPDATE users SET role = ?, admin_access = ? WHERE id = ?")
            ->execute([$newRole, $newAccess, $userId]);
        
        AuditLogger::log('user_promoted', [
            'target_user_id' => $userId,
            'target_user_email' => $targetUser['email'],
            'new_access' => $newAccess
        ], $adminId, $adminEmail);
        
        echo json_encode([
            'success' => true, 
            'message' => $newAccess ? 'User promoted to admin' : 'User demoted from admin'
        ]);
        
    } else {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid action. Use "activate", "deactivate", or "promote"']);
    }
    
} catch (Exception $e) {
    error_log('toggleUserStatus error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Operation failed']);
}