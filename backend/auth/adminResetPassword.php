<?php
require_once __DIR__ . '/../middleware/CorsMiddleware.php';
CorsMiddleware::handle();
header('Content-Type: application/json');

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../middleware/security.php';
require_once __DIR__ . '/../middleware/AuditLogger.php';
require_once __DIR__ . '/../notifications/getSmtpConfig.php';

Security::initSession();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

Security::requireAuth();
Security::checkPermission(Security::PERM_MANAGE_USERS);

$csrfToken = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
if (!Security::validateCsrfToken($csrfToken)) {
    http_response_code(403);
    echo json_encode(['error' => 'Invalid CSRF token']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);
$action = $data['action'] ?? '';

$adminId = $_SESSION['user_id'] ?? null;
$adminEmail = $_SESSION['user_email'] ?? null;

try {
    if ($action === 'create_user') {
        $name = Security::sanitizeInput($data['name'] ?? '');
        $email = Security::sanitizeInput($data['email'] ?? '');
        $password = $data['password'] ?? '';
        $role = $data['role'] ?? 'user';
        $makeAdmin = $data['make_admin'] ?? false;
        
        if (empty($name) || empty($email) || empty($password)) {
            http_response_code(400);
            echo json_encode(['error' => 'Name, email, and password are required']);
            exit;
        }
        
        if (!Security::validateEmail($email)) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid email format']);
            exit;
        }
        
        $passwordValidation = Security::validatePasswordStrength($password);
        if (!empty($passwordValidation)) {
            http_response_code(400);
            echo json_encode(['error' => implode('. ', $passwordValidation)]);
            exit;
        }
        
        $checkStmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
        $checkStmt->execute([$email]);
        if ($checkStmt->fetch()) {
            http_response_code(400);
            echo json_encode(['error' => 'Email already exists']);
            exit;
        }
        
        $hashedPassword = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
        $isAdmin = ($role === 'admin' || $makeAdmin) ? 1 : 0;
        
        $stmt = $pdo->prepare("INSERT INTO users (name, email, password, role, admin_access, is_verified) VALUES (?, ?, ?, ?, ?, 1)");
        $stmt->execute([$name, $email, $hashedPassword, $role, $isAdmin]);
        
        $newUserId = $pdo->lastInsertId();
        
        AuditLogger::log('user_created', [
            'new_user_id' => $newUserId,
            'new_user_email' => $email,
            'role' => $role,
            'admin_access' => $isAdmin
        ], $adminId, $adminEmail);
        
        echo json_encode([
            'success' => true,
            'message' => 'User created successfully',
            'user_id' => (int)$newUserId
        ]);
        
    } elseif ($action === 'send_reset_link') {
        $userId = (int)$data['user_id'];
        
        $stmt = $pdo->prepare("SELECT id, name, email, is_verified FROM users WHERE id = ?");
        $stmt->execute([$userId]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$user) {
            http_response_code(404);
            echo json_encode(['error' => 'User not found']);
            exit;
        }
        
        if ($user['is_verified'] != 1) {
            http_response_code(400);
            echo json_encode(['error' => 'Cannot reset password for unverified user']);
            exit;
        }
        
        $token = bin2hex(random_bytes(32));
        $expiresAt = date('Y-m-d H:i:s', strtotime('+1 hour'));
        
        $pdo->prepare("DELETE FROM password_reset_tokens WHERE user_id = ? AND used_at IS NULL")
            ->execute([$userId]);
        
        $stmt = $pdo->prepare("INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)");
        $stmt->execute([$userId, password_hash($token, PASSWORD_BCRYPT), $expiresAt]);
        
        $baseUrl = getenv('APP_BASE_URL') ?: 'http://localhost:8080';
        $resetLink = $baseUrl . "/reset-password?token=" . $token . "&email=" . urlencode($user['email']);
        
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
                            <p>Your password reset was requested by an administrator.</p>
                            
                            <div class='warning'>
                                <strong>Important:</strong><br>
                                This link will expire in <strong>1 hour</strong>.
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
                
                $result = $mailer->send($user['email'], 'Password Reset - Tool Management System', $body);
                $emailSent = $result['success'] ?? false;
            }
        } catch (Exception $e) {
            error_log('Password reset email error: ' . $e->getMessage());
        }
        
        AuditLogger::log('password_reset_initiated', [
            'target_user_id' => $userId,
            'target_user_email' => $user['email'],
            'initiated_by' => $adminEmail
        ], $adminId, $adminEmail);
        
        if ($emailSent) {
            echo json_encode(['success' => true, 'message' => 'Password reset link sent to user\'s email']);
        } else {
            echo json_encode(['success' => true, 'message' => 'Password reset link sent (email service may be unavailable)']);
        }
        
    } else {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid action. Use "create_user" or "send_reset_link"']);
    }
    
} catch (Exception $e) {
    error_log('adminResetPassword error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Operation failed']);
}