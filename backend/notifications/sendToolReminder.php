<?php
/**
 * Send Tool Renewal Reminder using PHPMailer
 */

require_once __DIR__ . '/../middleware/CorsMiddleware.php';
CorsMiddleware::handle();
header('Content-Type: application/json');

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../middleware/security.php';
require_once __DIR__ . '/../PHPMailer/sendEmail.php';

Security::initSession();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
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

$data = json_decode(file_get_contents('php://input'), true);
$toolId = isset($data['tool_id']) ? (int)$data['tool_id'] : 0;

if (!$toolId) {
    http_response_code(400);
    echo json_encode(['error' => 'Tool ID is required']);
    exit;
}

try {
    $stmt = $pdo->prepare("SELECT * FROM tools WHERE id = ?");
    $stmt->execute([$toolId]);
    $tool = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$tool) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Tool not found']);
        exit;
    }
    
    $today = new DateTime();
    $renewalDate = new DateTime($tool['next_renewal']);
    $daysUntil = $today->diff($renewalDate)->days;
    
    require_once __DIR__ . '/../notifications/getSmtpConfig.php';
    $smtpSettings = getSmtpConfig();
    
    if (empty($smtpSettings['smtp_host']) || empty($smtpSettings['smtp_username']) || empty($smtpSettings['smtp_password'])) {
        http_response_code(400);
        echo json_encode(['error' => 'SMTP settings not configured']);
        exit;
    }
    
    $toolData = [
        'tool_name' => Security::sanitizeOutput($tool['tool_name']),
        'type' => $tool['type'] ?? 'N/A',
        'no_of_license' => $tool['no_of_license'] ?? 'N/A',
        'job_slots' => $tool['job_slots'] ?? 'N/A',
        'bulk_mail' => $tool['bulk_mail'] ?? 'N/A',
        'cost' => $tool['cost'] ?? 0,
        'monthly_cost' => $tool['monthly_cost'] ?? 0,
        'quarterly_cost' => $tool['quarterly_cost'] ?? 0,
        'annual_cost' => $tool['annual_cost'] ?? 0,
        'currency' => $tool['currency'] ?? '$',
        'payment_frequency' => $tool['payment_frequency'] ?? 'N/A',
        'last_renewal' => !empty($tool['last_renewal']) ? date('F j, Y', strtotime($tool['last_renewal'])) : 'N/A',
        'next_renewal' => !empty($tool['next_renewal']) ? date('F j, Y', strtotime($tool['next_renewal'])) : 'N/A',
        'previous_cost' => $tool['cost'] ?? 0,
        'days_until_renewal' => $daysUntil,
        'spoc_details' => (!empty($tool['spoc_1']) ? $tool['spoc_1'] : '') . (!empty($tool['spoc_2']) ? ', ' . $tool['spoc_2'] : ''),
        'phone_number' => $tool['contact_no'] ?? 'N/A',
        'email_id' => $tool['email_id'] ?? 'N/A'
    ];
    
    $sentTo = [];
    $failedTo = [];
    
    if (!empty($tool['email_id'])) {
        $mailer = new SendEmail($smtpSettings);
        $result = $mailer->sendRenewalReminder($tool['email_id'], $toolData);
        
        if ($result['success']) {
            $sentTo[] = Security::sanitizeOutput($tool['email_id']);
            require_once __DIR__ . '/../middleware/AuditLogger.php';
            AuditLogger::log('tool_reminder_sent', [
                'tool_id' => $toolId,
                'tool_name' => $tool['tool_name'],
                'sent_to' => $tool['email_id']
            ], $_SESSION['user_id'] ?? null, $_SESSION['user_email'] ?? null);
        } else {
            $failedTo[] = Security::sanitizeOutput($tool['email_id']);
        }
    }
    
    if (!empty($settings['notification_email'])) {
        $mailer = new SendEmail($smtpSettings);
        $result = $mailer->sendRenewalReminder($settings['notification_email'], $toolData);
        
        if ($result['success']) {
            $sentTo[] = Security::sanitizeOutput($settings['notification_email']);
        } else {
            $failedTo[] = Security::sanitizeOutput($settings['notification_email']);
        }
    }
    
    echo json_encode([
        'success' => count($sentTo) > 0,
        'message' => count($sentTo) > 0 ? 'Reminder sent' : 'Failed to send',
        'tool_name' => $toolData['tool_name'],
        'sent_to' => $sentTo,
        'failed_to' => $failedTo,
        'days_until_renewal' => $daysUntil
    ]);
    
} catch (Exception $e) {
    error_log('sendToolReminder error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Failed to send reminder'
    ]);
}
