<?php
require_once __DIR__ . '/../middleware/CorsMiddleware.php';
CorsMiddleware::handle();
header('Content-Type: application/json');

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../middleware/security.php';
require_once __DIR__ . '/../middleware/AuditLogger.php';

Security::initSession();

if ($_SERVER['REQUEST_METHOD'] !== 'DELETE' && $_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$csrfToken = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
if (!Security::validateCsrfToken($csrfToken)) {
    http_response_code(403);
    echo json_encode(['error' => 'Invalid CSRF token']);
    exit;
}

Security::requireAuth();
Security::checkPermission(Security::PERM_DELETE_TOOLS);

// Admin only - users cannot delete tools
if (!Security::isAdmin()) {
    http_response_code(403);
    echo json_encode(['error' => 'Permission denied. Admin access required to delete tools.']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);
$id = isset($data['id']) ? (int)$data['id'] : 0;

if (!$id) {
    http_response_code(400);
    echo json_encode(['error' => 'Tool ID is required']);
    exit;
}

try {
    $userId = $_SESSION['user_id'] ?? 0;
    $userName = $_SESSION['user_name'] ?? 'Unknown';
    
    $stmtCheck = $pdo->prepare("SELECT id, tool_name, type, cost, revenue, geography, status FROM tools WHERE id = ? AND deleted_at IS NULL");
    $stmtCheck->execute([$id]);
    $tool = $stmtCheck->fetch(PDO::FETCH_ASSOC);
    
    if (!$tool) {
        http_response_code(404);
        echo json_encode(['error' => 'Tool not found']);
        exit;
    }
    
    $previousData = json_encode($tool);
    
    $logStmt = $pdo->prepare("INSERT INTO delete_logs (tool_id, tool_name, action_type, deleted_by_id, deleted_by_name, previous_data) VALUES (?, ?, 'soft_delete', ?, ?, ?)");
    $logStmt->execute([$id, $tool['tool_name'], $userId, $userName, $previousData]);
    
    $stmt = $pdo->prepare("UPDATE tools SET deleted_at = NOW() WHERE id = ?");
    $stmt->execute([$id]);

    if ($stmt->rowCount() === 0) {
        http_response_code(404);
        echo json_encode(['error' => 'Tool not found']);
        exit;
    }
    
    AuditLogger::toolAction('deleted', $id, $tool['tool_name'], $userId, $userName);
    
    echo json_encode([
        'success' => true,
        'message' => 'Tool moved to Recycle Bin'
    ]);
} catch (Exception $e) {
    error_log('deleteTool error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Failed to delete tool']);
}
