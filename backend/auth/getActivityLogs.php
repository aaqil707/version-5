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

$limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 50;
$offset = isset($_GET['offset']) ? (int)$_GET['offset'] : 0;
$action = $_GET['action'] ?? null;
$dateFrom = $_GET['date_from'] ?? null;
$dateTo = $_GET['date_to'] ?? null;
$userId = $_GET['user_id'] ?? null;

$isAdmin = isset($_SESSION['admin_access']) && $_SESSION['admin_access'] == 1;
$currentUserId = $_SESSION['user_id'] ?? null;

try {
    $sql = "SELECT al.*, u.name as user_name, u.email as user_email, u.role as user_role 
            FROM audit_logs al 
            LEFT JOIN users u ON al.user_id = u.Id 
            WHERE 1=1";
    $params = [];
    
    if (!$isAdmin) {
        $sql .= " AND (al.user_id = ? OR al.action IN ('login_success', 'login_attempt', 'logout'))";
        $params[] = $currentUserId;
    }
    
    if ($action && $action !== 'all') {
        $sql .= " AND al.action = ?";
        $params[] = $action;
    }
    
    if ($userId) {
        $sql .= " AND al.user_id = ?";
        $params[] = $userId;
    }
    
    if ($dateFrom) {
        $sql .= " AND al.created_at >= ?";
        $params[] = $dateFrom . ' 00:00:00';
    }
    
    if ($dateTo) {
        $sql .= " AND al.created_at <= ?";
        $params[] = $dateTo . ' 23:59:59';
    }
    
    $countSql = str_replace('SELECT al.*, u.name as user_name, u.role as user_role', 'SELECT COUNT(*)', $sql);
    $stmt = $pdo->prepare($countSql);
    $stmt->execute($params);
    $total = $stmt->fetchColumn();
    
    $sql .= " ORDER BY al.created_at DESC LIMIT ? OFFSET ?";
    $params[] = $limit;
    $params[] = $offset;
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $logs = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $sanitizedLogs = array_map(function($log) use ($isAdmin) {
        $entry = [
            'id' => (int)$log['id'],
            'user_id' => $log['user_id'] ? (int)$log['user_id'] : null,
            'user_name' => Security::sanitizeOutput($log['user_name'] ?? ''),
            'user_email' => Security::sanitizeOutput($log['user_email'] ?? ''),
            'user_role' => $log['user_role'] ?? 'user',
            'action' => $log['action'],
            'details' => Security::sanitizeOutput($log['details']),
            'created_at' => $log['created_at']
        ];
        
        if ($isAdmin) {
            $entry['ip_address'] = $log['ip_address'];
            $entry['user_agent'] = Security::sanitizeOutput($log['user_agent']);
        }
        
        return $entry;
    }, $logs);
    
    echo json_encode([
        'success' => true,
        'logs' => $sanitizedLogs,
        'total' => (int)$total,
        'limit' => $limit,
        'offset' => $offset,
        'is_admin' => $isAdmin
    ]);
    
} catch (Exception $e) {
    error_log('getActivityLogs error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Failed to fetch activity logs']);
}