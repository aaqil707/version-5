<?php
/**
 * Test Email using PHPMailer
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

Security::requireAdmin();

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

$data = json_decode(file_get_contents('php://input'), true);
$email = isset($data['email']) ? trim($data['email']) : '';

if (empty($email)) {
    http_response_code(400);
    echo json_encode(['error' => 'Email address is required']);
    exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid email format']);
    exit;
}

try {
    require_once __DIR__ . '/../notifications/getSmtpConfig.php';
    $smtpSettings = getSmtpConfig();

    if (empty($smtpSettings['smtp_host']) || empty($smtpSettings['smtp_username']) || empty($smtpSettings['smtp_password'])) {
        http_response_code(400);
        echo json_encode(['error' => 'SMTP not configured. Please contact your administrator.']);
        exit;
    }

    $mailer = new SendEmail($smtpSettings);
    $result = $mailer->sendTest($email);

    if ($result['success']) {
        require_once __DIR__ . '/../middleware/AuditLogger.php';
        AuditLogger::log('test_email_sent', ['sent_to' => $email], $_SESSION['user_id'], $_SESSION['user_email']);
        
        echo json_encode([
            'success' => true,
            'message' => 'Test email sent to ' . $email
        ]);
    } else {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => $result['error']
        ]);
    }
} catch (Exception $e) {
    $errorMsg = $e->getMessage();
    if (empty($errorMsg)) {
        $errorMsg = 'Failed to send test email. Check SMTP settings and network connectivity.';
    }
    error_log('testEmail error: ' . $errorMsg);
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $errorMsg
    ]);
}
