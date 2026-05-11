<?php
/**
 * Get Tools Data for Portal Analysis
 * Returns tools with statistics for the Tools tab in Portal Analysis
 */

require_once __DIR__ . '/../middleware/CorsMiddleware.php';
CorsMiddleware::handle();
header('Content-Type: application/json');

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../middleware/security.php';

Security::initSession();

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

Security::checkPermission(Security::PERM_VIEW_PORTAL);

$allowedStatuses = ['Active', 'Inactive'];

try {
    $year = Security::sanitizeInput($_GET['year'] ?? 'All Years');
    $status = Security::sanitizeInput($_GET['status'] ?? 'All');
    
    $whereClause = "1=1";
    $params = [];
    
    if ($year !== 'All Years') {
        $whereClause .= " AND year = ?";
        $params[] = (int)$year;
    }
    
    if ($status !== 'All') {
        if (!Security::validateEnum($status, $allowedStatuses)) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid status']);
            exit;
        }
        $whereClause .= " AND status = ?";
        $params[] = $status;
    }
    
    $stmt = $pdo->prepare("SELECT * FROM tools WHERE $whereClause ORDER BY next_renewal ASC");
    $stmt->execute($params);
    $tools = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $today = new DateTime();
    $startOfMonth = new DateTime();
    $startOfMonth->modify('first day of this month');
    $endOfMonth = new DateTime();
    $endOfMonth->modify('last day of this month');
    
    $expiringThisMonth = 0;
    $renewedThisMonth = 0;
    $activeCount = 0;
    $totalCost = 0;
    $activeCost = 0;
    $byType = [];
    
    $sanitizedTools = [];
    
    foreach ($tools as $tool) {
        $totalCost += floatval($tool['cost'] ?? 0);
        
        if ($tool['status'] === 'Active') {
            $activeCount++;
            $activeCost += floatval($tool['cost'] ?? 0);
            
            if (!empty($tool['next_renewal'])) {
                $renewalDate = new DateTime($tool['next_renewal']);
                if ($renewalDate >= $startOfMonth && $renewalDate <= $endOfMonth) {
                    $expiringThisMonth++;
                    $tool['days_until_renewal'] = $today->diff($renewalDate)->days;
                }
            }
            
            if (!empty($tool['last_renewal'])) {
                $lastRenewal = new DateTime($tool['last_renewal']);
                if ($lastRenewal >= $startOfMonth && $lastRenewal <= $endOfMonth) {
                    $renewedThisMonth++;
                }
            }
        }
        
        $type = $tool['type'] ?? 'NA';
        if (!isset($byType[$type])) {
            $byType[$type] = ['count' => 0, 'cost' => 0];
        }
        $byType[$type]['count']++;
        $byType[$type]['cost'] += floatval($tool['cost'] ?? 0);
        
        $sanitizedTools[] = [
            'id' => (int)$tool['id'],
            'year' => (int)$tool['year'],
            'tool_name' => Security::sanitizeOutput($tool['tool_name']),
            'type' => Security::sanitizeOutput($tool['type']),
            'no_of_license' => (int)$tool['no_of_license'],
            'cost' => (float)$tool['cost'],
            'geography' => $tool['geography'],
            'status' => $tool['status'],
            'next_renewal' => $tool['next_renewal'],
            'last_renewal' => $tool['last_renewal']
        ];
    }
    
    $typeDistribution = array_map(function($type, $data) {
        return ['type' => Security::sanitizeOutput($type), 'count' => $data['count'], 'cost' => $data['cost']];
    }, array_keys($byType), array_values($byType));
    
    echo json_encode([
        'success' => true,
        'tools' => $sanitizedTools,
        'summary' => [
            'total_tools' => count($tools),
            'active_tools' => $activeCount,
            'expiring_this_month' => $expiringThisMonth,
            'renewed_this_month' => $renewedThisMonth,
            'total_cost' => $totalCost,
            'active_cost' => $activeCost,
            'avg_cost_per_tool' => count($tools) > 0 ? $totalCost / count($tools) : 0
        ],
        'type_distribution' => $typeDistribution,
        'available_years' => array_unique(array_merge([date('Y')], array_column($tools, 'year'))),
        'available_types' => array_unique(array_column($tools, 'type'))
    ]);
    
} catch (Exception $e) {
    error_log('getToolsForPortal error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Failed to fetch tools']);
}
