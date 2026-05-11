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
$action = $data['action'] ?? '';

$rateLimit = Security::checkRateLimit('password_reset_' . ($data['email'] ?? $_SERVER['REMOTE_ADDR']));
if (!$rateLimit['allowed']) {
    http_response_code(429);
    echo json_encode(['error' => 'Too many requests. Please try again later.', 'retry_after' => $rateLimit['retry_after']]);
    exit;
}

try {
    if ($action === 'request') {
        $email = Security::sanitizeInput($data['email'] ?? '');
        
        if (!Security::validateEmail($email)) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid email format']);
            exit;
        }
        
        $stmt = $pdo->prepare("SELECT id, name, email, is_verified FROM users WHERE email = ?");
        $stmt->execute([$email]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$user) {
            echo json_encode(['success' => true, 'message' => 'If this email exists, a reset link will be sent.']);
            exit;
        }
        
        if ($user['is_verified'] != 1) {
            http_response_code(400);
            echo json_encode(['error' => 'Please verify your email first before resetting password.']);
            exit;
        }
        
        $token = bin2hex(random_bytes(32));
        $expiresAt = date('Y-m-d H:i:s', strtotime('+1 hour'));
        
        $pdo->prepare("DELETE FROM password_reset_tokens WHERE user_id = ? AND used_at IS NULL")->execute([$user['id']]);
        
        $stmt = $pdo->prepare("INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)");
        $stmt->execute([$user['id'], password_hash($token, PASSWORD_BCRYPT), $expiresAt]);
        
        require_once __DIR__ . '/../middleware/AuditLogger.php';
        AuditLogger::log('password_reset_requested', ['email' => $email], $user['id'], $email);
        
        $baseUrl = getenv('APP_BASE_URL') ?: 'http://localhost:8080';
        $resetLink = $baseUrl . "/#/reset-password?token=" . $token . "&email=" . urlencode($email);
        
        $emailSent = false;
        try {
            $smtpConfig = getSmtpConfig();
            if (!empty($smtpConfig['smtp_host']) && !empty($smtpConfig['from_email'])) {
                require_once __DIR__ . '/../PHPMailer/sendEmail.php';
                $mailer = new SendEmail($smtpConfig);
                
                $logoUrl = 'https://www.vdart.com/wp-content/uploads/2020/02/vdart.svg';
                $logoHtml = '<img src="' . $logoUrl . '" alt="VDART" style="max-width: 150px;">';
                
                $body = "
                <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background: #dc3545; color: white; padding: 20px; text-align: center; }
                        .content { padding: 20px; background: #f5f5f5; }
                        .warning { background: #fff3cd; padding: 15px; border-radius: 5px; margin: 15px 0; }
                        .btn { display: inline-block; padding: 12px 24px; background: #dc3545; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
                        .footer { padding: 10px; text-align: center; font-size: 12px; color: #666; }
                    </style>
                </head>
                <body>
                    <div class='container'>
                        <div class='header'>
                            {$logoHtml}
                            <h2>Password Reset Request</h2>
                        </div>
                        <div class='content'>
                            <p>Hello <strong>{$user['name']}</strong>,</p>
                            <p>We received a request to reset your password.</p>
                            
                            <div class='warning'>
                                <strong>Important:</strong><br>
                                This link will expire in <strong>1 hour</strong>.<br>
                                If you didn't request this, please ignore this email.
                            </div>
                            
                            <p>Click the button below to reset your password:</p>
                            <a href='{$resetLink}' class='btn'>Reset Password</a>
                            
                            <p style='margin-top: 20px; font-size: 12px; color: #666;'>
                                Or copy this link: {$resetLink}
                            </p>
                        </div>
                        <div class='footer'>
                            <p>Tool Management System</p>
                        </div>
                    </div>
                </body>
                </html>
                ";
                
                $result = $mailer->send($email, 'Password Reset - Tool Management System', $body);
                $emailSent = $result['success'] ?? false;
            }
        } catch (Exception $e) {
            error_log('Password reset email error: ' . $e->getMessage());
        }
        
        if ($emailSent) {
            echo json_encode(['success' => true, 'message' => 'Password reset link sent to your email.']);
        } else {
            echo json_encode(['success' => true, 'message' => 'If this email exists, a reset link will be sent.']);
        }
        
    } elseif ($action === 'reset') {
        $email = Security::sanitizeInput($data['email'] ?? '');
        $token = $data['token'] ?? '';
        $newPassword = $data['new_password'] ?? '';
        $confirmPassword = $data['confirm_password'] ?? '';
        
        if (empty($email) || empty($token) || empty($newPassword)) {
            http_response_code(400);
            echo json_encode(['error' => 'Email, token, and new password are required']);
            exit;
        }
        
        if ($newPassword !== $confirmPassword) {
            http_response_code(400);
            echo json_encode(['error' => 'Passwords do not match']);
            exit;
        }
        
        $passwordValidation = Security::validatePasswordStrength($newPassword);
        if (!empty($passwordValidation)) {
            http_response_code(400);
            echo json_encode(['error' => implode('. ', $passwordValidation)]);
            exit;
        }
        
        $stmt = $pdo->prepare("SELECT id, name FROM users WHERE email = ?");
        $stmt->execute([$email]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$user) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid reset token']);
            exit;
        }
        
        $stmt = $pdo->prepare("SELECT id, expires_at, used_at FROM password_reset_tokens 
            WHERE user_id = ? AND used_at IS NULL 
            ORDER BY created_at DESC LIMIT 1");
        $stmt->execute([$user['id']]);
        $resetToken = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$resetToken) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid or expired reset token']);
            exit;
        }
        
        if (strtotime($resetToken['expires_at']) < time()) {
            http_response_code(400);
            echo json_encode(['error' => 'Reset token has expired. Please request a new one.']);
            exit;
        }
        
        if (!password_verify($token, $resetToken['token'])) {
            $stmt = $pdo->prepare("DELETE FROM password_reset_tokens WHERE user_id = ?");
            $stmt->execute([$user['id']]);
            http_response_code(400);
            echo json_encode(['error' => 'Invalid reset token']);
            exit;
        }
        
        $hashedPassword = password_hash($newPassword, PASSWORD_BCRYPT, ['cost' => 12]);
        
        $pdo->prepare("UPDATE users SET password = ?, failed_login_attempts = 0, locked_until = NULL WHERE id = ?")
            ->execute([$hashedPassword, $user['id']]);
        
        $pdo->prepare("UPDATE password_reset_tokens SET used_at = NOW() WHERE id = ?")
            ->execute([$resetToken['id']]);
        
        require_once __DIR__ . '/../middleware/AuditLogger.php';
        AuditLogger::log('password_reset_success', ['email' => $email], $user['id'], $email);
        
        echo json_encode(['success' => true, 'message' => 'Password reset successfully! You can now login with your new password.']);
        
    } else {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid action. Use "request" or "reset".']);
    }
    
} catch (Exception $e) {
    error_log('Password reset error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Password reset failed. Please try again later.']);
}