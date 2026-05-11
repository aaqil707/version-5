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
$name = Security::sanitizeInput($data['name'] ?? '');
$email = Security::sanitizeInput($data['email'] ?? '');
$password = $data['password'] ?? '';

$rateLimit = Security::checkRateLimit('signup_' . ($_SERVER['REMOTE_ADDR'] ?? 'unknown'));
if (!$rateLimit['allowed']) {
    http_response_code(429);
    echo json_encode([
        'error' => 'Too many signup attempts. Please try again later.',
        'retry_after' => $rateLimit['retry_after']
    ]);
    exit;
}

$csrfToken = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
if (!Security::validateCsrfToken($csrfToken)) {
    http_response_code(403);
    echo json_encode(['error' => 'Invalid CSRF token']);
    exit;
}

if (!Security::validateRequired($name) || !Security::validateRequired($email) || !Security::validateRequired($password)) {
    http_response_code(400);
    echo json_encode(['error' => 'Name, email and password are required']);
    exit;
}

$passwordValidation = Security::validatePasswordStrength($password);
if (!empty($passwordValidation)) {
    http_response_code(400);
    echo json_encode(['error' => implode('. ', $passwordValidation)]);
    exit;
}

if (!Security::validateEmail($email)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid email format']);
    exit;
}

if (!preg_match('/@(vdartinc\.com|vdartdigital\.com)$/', $email) && $email !== 'admin@example.com') {
    http_response_code(400);
    echo json_encode(['error' => 'Only @vdartinc.com or @vdartdigital.com email addresses are allowed (or admin@example.com)']);
    exit;
}

try {
    $stmt = $pdo->prepare("SELECT id, is_verified FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $existingUser = $stmt->fetch();
    
    if ($existingUser) {
        if ($existingUser['is_verified'] == 1) {
            http_response_code(409);
            echo json_encode(['error' => 'Email already registered']);
            exit;
        }
        $stmt = $pdo->prepare("DELETE FROM users WHERE email = ?");
        $stmt->execute([$email]);
    }

    $hashedPassword = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
    $otp = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);
    $otpHash = password_hash($otp, PASSWORD_BCRYPT);
    $otpExpiry = date('Y-m-d H:i:s', strtotime('+10 minutes'));
    
    $stmt = $pdo->prepare("INSERT INTO users (name, email, password, role, verification_otp, otp_expiry, is_verified) VALUES (?, ?, ?, 'user', ?, ?, 0)");
    $stmt->execute([$name, $email, $hashedPassword, $otpHash, $otpExpiry]);
    $userId = $pdo->lastInsertId();
    
    require_once __DIR__ . '/../middleware/AuditLogger.php';
    AuditLogger::log('user_signup', ['email' => $email, 'name' => $name], $userId, $email);
    
    $emailSent = false;
    try {
        $smtpConfig = getSmtpConfig();
        if (!empty($smtpConfig['smtp_host']) && !empty($smtpConfig['from_email'])) {
            require_once __DIR__ . '/../PHPMailer/sendEmail.php';
            $mailer = new SendEmail($smtpConfig);
            $result = $mailer->sendOTPEmail($email, $otp, $name);
            $emailSent = $result['success'] ?? false;
            if (!$emailSent) {
                error_log('OTP email failed: ' . ($result['error'] ?? 'unknown'));
            }
        } else {
            error_log('OTP email skipped: SMTP not configured in admin Email Settings');
        }
    } catch (Exception $e) {
        error_log('OTP email error: ' . $e->getMessage());
    }
    
    if ($emailSent) {
        echo json_encode([
            'success' => true,
            'verify_required' => true,
            'message' => 'Account created. Please verify your email with the OTP sent to ' . Security::sanitizeOutput($email) . '.',
            'user' => ['id' => $userId, 'email' => Security::sanitizeOutput($email)]
        ]);
    } else {
        // Account created — SMTP simply not configured yet.
        // Advance to OTP screen so user can retry after admin sets up Email Settings.
        echo json_encode([
            'success' => true,
            'verify_required' => true,
            'email_failed' => true,
            'message' => 'Account created, but the verification email could not be sent. Ask your administrator to configure SMTP in Email Settings, then click "Resend OTP".',
            'user' => ['id' => $userId, 'email' => Security::sanitizeOutput($email)]
        ]);
    }
} catch (Exception $e) {
    error_log('signup error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Signup failed. Please try again later.']);
}
