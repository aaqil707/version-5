<?php
/**
 * Get Renewal Alerts for Notification Bell
 * Returns alerts for tools expiring within 30 and 7 days
 * Protected by authentication
 */

require_once __DIR__ . '/../middleware/CorsMiddleware.php';
CorsMiddleware::handle();
header('Content-Type: application/json');

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../middleware/security.php';

Security::initSession();

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Please login first']);
    exit;
}

Security::checkPermission(Security::PERM_VIEW_ALERTS);

try {
    $today = new DateTime();
    $currentMonthEnd = new DateTime();
    $currentMonthEnd->modify('last day of this month');
    
    $thirtyDays = new DateTime();
    $thirtyDays->modify('+30 days');
    $sevenDays = new DateTime();
    $sevenDays->modify('+7 days');
    
    // Get tools expiring this month
    $stmtMonth = $pdo->prepare("
        SELECT id, tool_name, next_renewal, cost, payment_frequency, email_id, spoc_1, annual_cost
        FROM tools 
        WHERE next_renewal IS NOT NULL 
        AND next_renewal != ''
        AND status = 'Active'
        AND next_renewal >= CURDATE()
        AND next_renewal <= LAST_DAY(CURDATE())
        ORDER BY next_renewal ASC
    ");
    $stmtMonth->execute();
    $toolsMonth = $stmtMonth->fetchAll(PDO::FETCH_ASSOC);
    
    // Get tools expiring within 30 days
    $stmt = $pdo->prepare("
        SELECT id, tool_name, next_renewal, cost, payment_frequency, email_id, spoc_1, annual_cost
        FROM tools 
        WHERE next_renewal IS NOT NULL 
        AND next_renewal != ''
        AND status = 'Active'
        AND next_renewal >= CURDATE()
        AND next_renewal <= DATE_ADD(CURDATE(), INTERVAL 30 DAY)
        ORDER BY next_renewal ASC
    ");
    $stmt->execute();
    $tools = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $alertsThisMonth = [];
    $alerts30Days = [];
    $alerts7Days = [];
    
    foreach ($toolsMonth as $tool) {
        $renewalDate = new DateTime($tool['next_renewal']);
        $daysUntil = $today->diff($renewalDate)->days;
        
        $alert = [
            'id' => $tool['id'],
            'tool_name' => Security::sanitizeOutput($tool['tool_name']),
            'next_renewal' => $tool['next_renewal'],
            'days_until_renewal' => $daysUntil,
            'cost' => $tool['cost'],
            'annual_cost' => $tool['annual_cost'],
            'payment_frequency' => $tool['payment_frequency'],
            'email_id' => Security::sanitizeOutput($tool['email_id']),
            'spoc_1' => Security::sanitizeOutput($tool['spoc_1'])
        ];
        $alertsThisMonth[] = $alert;
    }
    
    foreach ($tools as $tool) {
        $renewalDate = new DateTime($tool['next_renewal']);
        $daysUntil = $today->diff($renewalDate)->days;
        
        // Skip tools already in this month
        $toolDate = date('Y-m', strtotime($tool['next_renewal']));
        $currentMonth = date('Y-m');
        if ($toolDate === $currentMonth) {
            continue;
        }
        
        $message = "Reminder: Your tool {$tool['tool_name']} will expire on " . 
                   date('F j, Y', strtotime($tool['next_renewal'])) . 
                   ". Please renew soon.";
        
        $alert = [
            'id' => $tool['id'],
            'tool_name' => Security::sanitizeOutput($tool['tool_name']),
            'next_renewal' => $tool['next_renewal'],
            'days_until_renewal' => $daysUntil,
            'cost' => $tool['cost'],
            'annual_cost' => $tool['annual_cost'],
            'payment_frequency' => $tool['payment_frequency'],
            'email_id' => Security::sanitizeOutput($tool['email_id']),
            'spoc_1' => Security::sanitizeOutput($tool['spoc_1']),
            'message' => $message
        ];
        
        if ($daysUntil <= 7) {
            $alerts7Days[] = $alert;
        } else {
            $alerts30Days[] = $alert;
        }
    }
    
    echo json_encode([
        'success' => true,
        'total_alerts' => count($alertsThisMonth) + count($alerts30Days) + count($alerts7Days),
        'alerts' => [
            'this_month' => $alertsThisMonth,
            '30_days' => $alerts30Days,
            '7_days' => $alerts7Days
        ]
    ]);
    
} catch (Exception $e) {
    error_log('getAlerts error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Failed to fetch alerts'
    ]);
}
