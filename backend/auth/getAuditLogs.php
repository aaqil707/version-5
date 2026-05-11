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

$limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 100;
$offset = isset($_GET['offset']) ? (int)$_GET['offset'] : 0;
$action = $_GET['action'] ?? null;
$userId = isset($_GET['user_id']) ? (int)$_GET['user_id'] : null;
$dateFrom = $_GET['date_from'] ?? null;
$dateTo = $_GET['date_to'] ?? null;

try {
    $sql = "SELECT * FROM audit_logs WHERE 1=1";
    $params = [];
    
    if ($action) {
        $sql .= " AND action = ?";
        $params[] = $action;
    }
    
    if ($userId) {
        $sql .= " AND user_id = ?";
        $params[] = $userId;
    }
    
    if ($dateFrom) {
        $sql .= " AND created_at >= ?";
        $params[] = $dateFrom . ' 00:00:00';
    }
    
    if ($dateTo) {
        $sql .= " AND created_at <= ?";
        $params[] = $dateTo . ' 23:59:59';
    }
    
    $countSql = "SELECT COUNT(*) FROM audit_logs WHERE 1=1";
    $countParams = [];
    
    if ($action) {
        $countSql .= " AND action = ?";
        $countParams[] = $action;
    }
    
    if ($userId) {
        $countSql .= " AND user_id = ?";
        $countParams[] = $userId;
    }
    
    if ($dateFrom) {
        $countSql .= " AND created_at >= ?";
        $countParams[] = $dateFrom . ' 00:00:00';
    }
    
    if ($dateTo) {
        $countSql .= " AND created_at <= ?";
        $countParams[] = $dateTo . ' 23:59:59';
    }
    
    $stmt = $pdo->prepare($countSql);
    $stmt->execute($countParams);
    $total = $stmt->fetchColumn();
    
    $sql .= " ORDER BY created_at DESC LIMIT ? OFFSET ?";
    $params[] = $limit;
    $params[] = $offset;
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $logs = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $sanitizedLogs = array_map(function($log) {
        return [
            'id' => (int)$log['id'],
            'user_id' => $log['user_id'] ? (int)$log['user_id'] : null,
            'user_email' => Security::sanitizeOutput($log['user_email']),
            'action' => $log['action'],
            'details' => $log['details'],
            'ip_address' => $log['ip_address'],
            'user_agent' => Security::sanitizeOutput($log['user_agent']),
            'created_at' => $log['created_at']
        ];
    }, $logs);
    
    echo json_encode([
        'success' => true,
        'logs' => $sanitizedLogs,
        'total' => (int)$total,
        'limit' => $limit,
        'offset' => $offset
    ]);
    
} catch (Exception $e) {
    error_log('getAuditLogs error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Failed to fetch audit logs']);
}