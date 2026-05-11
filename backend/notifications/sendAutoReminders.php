<?php
/**
 * Send Auto Reminders - Bulk email to all expiring tools
 * Triggered from AlertBell component
 */

require_once __DIR__ . '/../middleware/CorsMiddleware.php';
CorsMiddleware::handle();
header('Content-Type: application/json');

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../middleware/security.php';
require_once __DIR__ . '/../PHPMailer/sendEmail.php';

Security::initSession();

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Please login first']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST' && $_SERVER['REQUEST_METHOD'] !== 'GET') {
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

Security::requireAdmin();

try {
    require_once __DIR__ . '/../notifications/getSmtpConfig.php';
    $smtpSettings = getSmtpConfig();
    
    if (empty($smtpSettings['smtp_host']) || empty($smtpSettings['smtp_username']) || empty($smtpSettings['smtp_password'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'SMTP settings not configured. Please contact your administrator.']);
        exit;
    }
    
    $toolsStmt = $pdo->prepare("
        SELECT * FROM tools 
        WHERE next_renewal IS NOT NULL 
        AND next_renewal != ''
        AND status = 'Active'
        AND next_renewal >= CURDATE()
        AND next_renewal <= DATE_ADD(CURDATE(), INTERVAL 30 DAY)
        AND (email_id IS NOT NULL AND email_id != '')
        ORDER BY next_renewal ASC
    ");
    $toolsStmt->execute();
    $tools = $toolsStmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (empty($tools)) {
        echo json_encode([
            'success' => true,
            'message' => 'No tools expiring within 30 days with email addresses',
            'total_emails_sent' => 0,
            'total_tools_expiring' => 0
        ]);
        exit;
    }
    
    $sent = 0;
    $failed = 0;
    $failedList = [];
    
    foreach ($tools as $tool) {
        $today = new DateTime();
        $renewalDate = new DateTime($tool['next_renewal']);
        $daysUntil = $today->diff($renewalDate)->days;
        
        $isUrgent = $daysUntil <= 7;
        
        $toolData = [
            'tool_name' => Security::sanitizeOutput($tool['tool_name']),
            'next_renewal' => date('F j, Y', strtotime($tool['next_renewal'])),
            'days_until_renewal' => $daysUntil,
            'cost' => (float)$tool['cost'],
            'payment_frequency' => $tool['payment_frequency'],
            'last_renewal' => !empty($tool['last_renewal']) ? date('F j, Y', strtotime($tool['last_renewal'])) : 'N/A',
            'annual_cost' => (float)$tool['annual_cost'],
            'previous_cost' => (float)$tool['cost'],
            'spoc_details' => (!empty($tool['spoc_1']) ? $tool['spoc_1'] : '') . (!empty($tool['spoc_2']) ? ', ' . $tool['spoc_2'] : ''),
            'phone_number' => $tool['contact_no'] ?? 'N/A',
            'type' => $tool['type'] ?? 'N/A'
        ];
        
        try {
            $mailer = new SendEmail($smtpSettings);
            $result = $mailer->sendRenewalReminder($tool['email_id'], $toolData);
            
            if ($result['success']) {
                $sent++;
            } else {
                $failed++;
                $failedList[] = $tool['tool_name'] . ' (' . ($result['error'] ?? 'Failed to send') . ')';
                error_log('Email send failed for tool ' . $tool['tool_name'] . ': ' . ($result['error'] ?? 'Unknown error'));
            }
        } catch (Exception $emailError) {
            $failed++;
            $failedList[] = $tool['tool_name'] . ' (' . $emailError->getMessage() . ')';
            error_log('Email exception for tool ' . $tool['tool_name'] . ': ' . $emailError->getMessage());
        }
    }
    
    $response = [
        'success' => $sent > 0,
        'total_emails_sent' => $sent,
        'total_tools_expiring' => count($tools),
        'failed' => $failed,
        'failed_list' => $failedList
    ];

    if ($sent === 0 && $failed > 0) {
        $response['success'] = false;
        $response['error'] = 'Failed to send ' . $failed . ' email(s). Check SMTP settings or network.';
        $response['message'] = implode('; ', $failedList);
    } elseif ($sent > 0) {
        $response['message'] = "Sent $sent reminders";
    } else {
        $response['message'] = 'No tools expiring within 30 days';
    }

    echo json_encode($response);
    
    if ($sent > 0) {
        require_once __DIR__ . '/../middleware/AuditLogger.php';
        AuditLogger::bulkOperation(
            $_SESSION['user_id'],
            $_SESSION['user_email'],
            'send_auto_reminders',
            ['sent' => $sent, 'failed' => $failed, 'total_tools' => count($tools)]
        );
    }
    
} catch (Exception $e) {
    $errorMsg = $e->getMessage();
    if (empty($errorMsg)) {
        $errorMsg = 'Failed to send reminders. Check SMTP settings and network connectivity.';
    }
    error_log('sendAutoReminders error: ' . $errorMsg);
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $errorMsg
    ]);
}
