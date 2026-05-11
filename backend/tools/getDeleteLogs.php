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
Security::checkPermission(Security::PERM_VIEW_TOOLS);

$actionFilter = $_GET['action'] ?? 'all';
$dateFrom = $_GET['date_from'] ?? null;
$dateTo = $_GET['date_to'] ?? null;

try {
    $sql = "SELECT id, tool_id, tool_name, action_type, deleted_by_id, deleted_by_name, created_at, previous_data FROM delete_logs WHERE 1=1";
    $params = [];
    
    if ($actionFilter !== 'all' && in_array($actionFilter, ['soft_delete', 'permanent_delete', 'restore'])) {
        $sql .= " AND action_type = ?";
        $params[] = $actionFilter;
    }
    
    if ($dateFrom) {
        $sql .= " AND created_at >= ?";
        $params[] = $dateFrom . ' 00:00:00';
    }
    
    if ($dateTo) {
        $sql .= " AND created_at <= ?";
        $params[] = $dateTo . ' 23:59:59';
    }
    
    $sql .= " ORDER BY created_at DESC";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $logs = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $sanitizedLogs = array_map(function($log) {
        $previousData = null;
        if (!empty($log['previous_data'])) {
            $previousData = json_decode($log['previous_data'], true);
        }
        
        $actionLabels = [
            'soft_delete' => 'Soft Delete',
            'permanent_delete' => 'Permanent Delete',
            'restore' => 'Restored'
        ];
        
        $actionColors = [
            'soft_delete' => '#f59e0b',
            'permanent_delete' => '#dc2626',
            'restore' => '#10b981'
        ];
        
        return [
            'id' => (int)$log['id'],
            'tool_id' => (int)$log['tool_id'],
            'tool_name' => Security::sanitizeOutput($log['tool_name']),
            'action_type' => $log['action_type'],
            'action_label' => $actionLabels[$log['action_type']] ?? $log['action_type'],
            'action_color' => $actionColors[$log['action_type']] ?? '#6b7280',
            'deleted_by_id' => (int)$log['deleted_by_id'],
            'deleted_by_name' => Security::sanitizeOutput($log['deleted_by_name']),
            'created_at' => $log['created_at'],
            'previous_data' => $previousData
        ];
    }, $logs);

    echo json_encode([
        'success' => true,
        'logs' => $sanitizedLogs,
        'count' => count($sanitizedLogs)
    ]);
} catch (Exception $e) {
    error_log('getDeleteLogs error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Failed to fetch delete logs']);
}