<?php
require_once __DIR__ . '/../middleware/CorsMiddleware.php';
CorsMiddleware::handle();
header('Content-Type: application/json');

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../middleware/security.php';
require_once __DIR__ . '/../notifications/getSmtpConfig.php';

Security::initSession();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);
$email = Security::sanitizeInput($data['email'] ?? '');

if (!Security::validateRequired($email)) {
    http_response_code(400);
    echo json_encode(['error' => 'Email is required']);
    exit;
}

$rateLimit = Security::checkRateLimit('resend_otp_' . $email);
if (!$rateLimit['allowed']) {
    http_response_code(429);
    echo json_encode([
        'error' => 'Too many OTP requests. Please try again later.',
        'retry_after' => $rateLimit['retry_after']
    ]);
    exit;
}

try {
    $stmt = $pdo->prepare("SELECT id, name, is_verified FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch();
    
    if (!$user) {
        http_response_code(404);
        echo json_encode(['error' => 'User not found']);
        exit;
    }
    
    if ($user['is_verified'] == 1) {
        http_response_code(400);
        echo json_encode(['error' => 'Account already verified. Please login.']);
        exit;
    }
    
    $otp = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);
    $otpHash = password_hash($otp, PASSWORD_BCRYPT);
    $otpExpiry = date('Y-m-d H:i:s', strtotime('+10 minutes'));
    
    $stmt = $pdo->prepare("UPDATE users SET verification_otp = ?, otp_expiry = ? WHERE id = ?");
    $stmt->execute([$otpHash, $otpExpiry, $user['id']]);
    
    require_once __DIR__ . '/../middleware/AuditLogger.php';
    AuditLogger::log('otp_resent', ['email' => $email], $user['id'], $email);
    
    $emailSent = false;
    try {
        $smtpConfig = getSmtpConfig();
        
        if (!empty($smtpConfig['smtp_host']) && !empty($smtpConfig['from_email'])) {
            require_once __DIR__ . '/../PHPMailer/sendEmail.php';
            $mailer = new SendEmail($smtpConfig);
            
            $result = $mailer->sendOTPEmail($email, $otp, $user['name']);
            $emailSent = $result['success'] ?? false;
        }
    } catch (Exception $e) {
        error_log('Resend OTP email error: ' . $e->getMessage());
    }
    
    if ($emailSent) {
        echo json_encode([
            'success' => true,
            'message' => 'New OTP sent to your email. OTP expires in 10 minutes.'
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'error' => 'Failed to send OTP email. Please try again.'
        ]);
    }
} catch (Exception $e) {
    error_log('resendOTP error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Failed to resend OTP']);
}