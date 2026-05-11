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

try {
    // Check if logged in
    if (!isset($_SESSION['user_id'])) {
        http_response_code(401);
        echo json_encode(['error' => 'Unauthorized']);
        exit;
    }
    
    // RBAC permission check
    Security::checkPermission(Security::PERM_VIEW_PORTAL);
    
    // Get all tools with sanitized output
    $stmt = $pdo->query("SELECT id, year, tool_name, type, no_of_license, resume_views, job_slots, bulk_mail, cost, revenue, monthly_cost, quarterly_cost, annual_cost, currency, geography, payment_frequency, last_renewal, next_renewal, comments, spoc_1, spoc_2, contact_no, email_id, status, reason_for_using FROM tools ORDER BY tool_name");
    $tools = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $sanitizedTools = array_map(function($tool) {
        return [
            'id' => (int)$tool['id'],
            'year' => (int)$tool['year'],
            'tool_name' => Security::sanitizeOutput($tool['tool_name']),
            'type' => Security::sanitizeOutput($tool['type']),
            'no_of_license' => (int)$tool['no_of_license'],
            'resume_views' => (int)$tool['resume_views'],
            'job_slots' => (int)$tool['job_slots'],
            'bulk_mail' => (int)$tool['bulk_mail'],
            'cost' => (float)$tool['cost'],
            'revenue' => (float)$tool['revenue'],
            'monthly_cost' => (float)$tool['monthly_cost'],
            'quarterly_cost' => (float)$tool['quarterly_cost'],
            'annual_cost' => (float)$tool['annual_cost'],
            'currency' => $tool['currency'],
            'geography' => $tool['geography'],
            'payment_frequency' => $tool['payment_frequency'],
            'last_renewal' => $tool['last_renewal'],
            'next_renewal' => $tool['next_renewal'],
            'comments' => Security::sanitizeOutput($tool['comments']),
            'spoc_1' => Security::sanitizeOutput($tool['spoc_1']),
            'spoc_2' => Security::sanitizeOutput($tool['spoc_2']),
            'contact_no' => Security::sanitizeOutput($tool['contact_no']),
            'email_id' => Security::sanitizeOutput($tool['email_id']),
            'status' => $tool['status'],
            'reason_for_using' => Security::sanitizeOutput($tool['reason_for_using'])
        ];
    }, $tools);
    
    // Calculate summary
    $totalCost = 0;
    $totalRevenue = 0;
    $inactiveCount = 0;
    
    foreach ($tools as $tool) {
        $totalCost += floatval($tool['cost'] ?? 0);
        $totalRevenue += floatval($tool['revenue'] ?? 0);
        if (($tool['status'] ?? '') === 'Inactive') {
            $inactiveCount++;
        }
    }
    
    echo json_encode([
        'success' => true,
        'tools' => $sanitizedTools,
        'summary' => [
            'total_tools' => count($tools),
            'total_cost' => $totalCost,
            'total_revenue' => $totalRevenue,
            'inactive_tools' => $inactiveCount,
            'active_tools' => count($tools) - $inactiveCount
        ]
    ]);
    
} catch (Exception $e) {
    error_log('getPortalStats error: ' . $e->getMessage());
    echo json_encode([
        'success' => false,
        'error' => 'Failed to fetch portal stats. Please try again later.'
    ]);
}