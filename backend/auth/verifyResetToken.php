<?php
require_once __DIR__ . '/../middleware/CorsMiddleware.php';
CorsMiddleware::handle();
header('Content-Type: application/json');

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../middleware/security.php';
require_once __DIR__ . '/../middleware/AuditLogger.php';

Security::initSession();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);
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

try {
    $stmt = $pdo->prepare("SELECT id, name FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$user) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid reset request']);
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
        http_response_code(400);
        echo json_encode(['error' => 'Invalid reset token']);
        exit;
    }
    
    $hashedPassword = password_hash($newPassword, PASSWORD_BCRYPT, ['cost' => 12]);
    
    $pdo->prepare("UPDATE users SET password = ?, failed_login_attempts = 0, locked_until = NULL WHERE id = ?")
        ->execute([$hashedPassword, $user['id']]);
    
    $pdo->prepare("UPDATE password_reset_tokens SET used_at = NOW() WHERE id = ?")
        ->execute([$resetToken['id']]);
    
    AuditLogger::log('password_reset_by_admin', [
        'user_id' => $user['id'],
        'user_email' => $email
    ], $user['id'], $email);
    
    echo json_encode([
        'success' => true,
        'message' => 'Password reset successfully! You can now login with your new password.'
    ]);
    
} catch (Exception $e) {
    error_log('verifyResetToken error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Password reset failed. Please try again later.']);
}