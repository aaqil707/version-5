<?php
require_once __DIR__ . '/../middleware/CorsMiddleware.php';
CorsMiddleware::handle();
header('Content-Type: application/json');

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../middleware/security.php';

Security::initSession();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);
$email = Security::sanitizeInput($data['email'] ?? '');
$otp = $data['otp'] ?? '';

if (!Security::validateRequired($email) || !Security::validateRequired($otp)) {
    http_response_code(400);
    echo json_encode(['error' => 'Email and OTP are required']);
    exit;
}

$rateLimit = Security::checkRateLimit('verify_otp_' . $email);
if (!$rateLimit['allowed']) {
    http_response_code(429);
    echo json_encode([
        'error' => 'Too many attempts. Please try again later.',
        'retry_after' => $rateLimit['retry_after']
    ]);
    exit;
}

try {
    $stmt = $pdo->prepare("SELECT id, name, verification_otp, otp_expiry, is_verified FROM users WHERE email = ?");
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
    
    if (strtotime($user['otp_expiry']) < time()) {
        http_response_code(400);
        echo json_encode(['error' => 'OTP has expired. Please request a new OTP.']);
        exit;
    }
    
    if (!password_verify($otp, $user['verification_otp'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid OTP. Please try again.']);
        exit;
    }
    
    $stmt = $pdo->prepare("UPDATE users SET is_verified = 1, verification_otp = NULL, otp_expiry = NULL WHERE id = ?");
    $stmt->execute([$user['id']]);
    
    require_once __DIR__ . '/../middleware/AuditLogger.php';
    AuditLogger::log('otp_verified', ['email' => $email], $user['id'], $email);
    
    // Send welcome email and admin notification after successful verification
    try {
        require_once __DIR__ . '/../notifications/getSmtpConfig.php';
        $smtpConfig = getSmtpConfig();
        
        if (!empty($smtpConfig['smtp_host']) && !empty($smtpConfig['from_email'])) {
            require_once __DIR__ . '/../PHPMailer/sendEmail.php';
            $mailer = new SendEmail($smtpConfig);
            
            // Send registration complete email to user
            $mailer->sendRegistrationCompleteEmail($email, $user['name']);

        }
    } catch (Exception $e) {
        error_log('Post-verification email error: ' . $e->getMessage());
    }
    
    session_regenerate_id(true);
    $_SESSION['user_id'] = $user['id'];
    $_SESSION['user_name'] = $user['name'];
    $_SESSION['user_email'] = $email;
    $_SESSION['user_role'] = 'user';
    $_SESSION['admin_access'] = 0;
    $_SESSION['created'] = time();
    
    echo json_encode([
        'success' => true,
        'message' => 'Email verified successfully! You can now login.',
        'user' => [
            'id' => (int)$user['id'],
            'name' => Security::sanitizeOutput($user['name']),
            'email' => Security::sanitizeOutput($email),
            'role' => 'user'
        ],
        'csrf_token' => Security::generateCsrfToken()
    ]);
} catch (Exception $e) {
    error_log('verifyOTP error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Verification failed']);
}