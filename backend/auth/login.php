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

$rawInput = file_get_contents('php://input');
$data = json_decode($rawInput, true);
if (!$data) {
    $data = $_POST;
}
$email = Security::sanitizeInput($data['email'] ?? '');
$password = $data['password'] ?? '';

$rateLimit = Security::checkRateLimit('login_' . $email);
if (!$rateLimit['allowed']) {
    http_response_code(429);
    echo json_encode([
        'error' => 'Too many login attempts. Please try again later.',
        'retry_after' => $rateLimit['retry_after']
    ]);
    exit;
}

if (empty($email) || empty($password)) {
    http_response_code(400);
    echo json_encode(['error' => 'Email and password are required']);
    exit;
}

if (!Security::validateEmail($email)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid email format']);
    exit;
}

// Allow admin@example.com, @vdartinc.com, or @vdartdigital.com emails
if (!preg_match('/@(vdartinc\.com|vdartdigital\.com)$/', $email) && $email !== 'admin@example.com') {
    http_response_code(401);
    echo json_encode(['error' => 'Only @vdartinc.com or @vdartdigital.com email addresses are allowed (or admin@example.com)']);
    exit;
}

try {
    $stmt = $pdo->prepare("SELECT id, name, email, password, role, is_verified, admin_access, failed_login_attempts, locked_until FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($user && $user['locked_until'] && strtotime($user['locked_until']) > time()) {
        AuditLogger::loginAttempt($email, false, 'Account locked');
        http_response_code(423);
        echo json_encode(['error' => 'Account temporarily locked due to too many failed attempts. Try again later.']);
        exit;
    }
    
    if (!$user) {
        AuditLogger::loginAttempt($email, false, 'Invalid credentials');
        http_response_code(401);
        echo json_encode(['error' => 'Invalid email or password']);
        exit;
    }
    
    if (!password_verify($password, $user['password'])) {
        AuditLogger::loginAttempt($email, false, 'Invalid credentials');
        if ($user) {
            $newAttempts = ($user['failed_login_attempts'] ?? 0) + 1;
            $lockAccount = $newAttempts >= 5;
            $pdo->prepare("UPDATE users SET failed_login_attempts = ?, locked_until = ? WHERE id = ?")
                ->execute([$newAttempts, $lockAccount ? date('Y-m-d H:i:s', strtotime('+30 seconds')) : null, $user['id']]);
            
            if ($lockAccount) {
                http_response_code(423);
                echo json_encode(['error' => 'Account locked due to too many failed attempts. Try again in 30 seconds.']);
                exit;
            }
        }
        http_response_code(401);
        echo json_encode(['error' => 'Invalid email or password']);
        exit;
    }
    
    if ($user['is_verified'] != 1) {
        http_response_code(401);
        echo json_encode([
            'error' => 'Please verify your email before logging in. Check your email for the OTP.',
            'not_verified' => true,
            'email' => $email
        ]);
        exit;
    }

    session_regenerate_id(true);
    
    $_SESSION['user_id'] = $user['id'];
    $_SESSION['user_name'] = $user['name'];
    $_SESSION['user_email'] = $user['email'];
    $_SESSION['user_role'] = $user['role'];
    $_SESSION['admin_access'] = $user['admin_access'] ?? 0;
    $_SESSION['created'] = time();

    $pdo->prepare("UPDATE users SET failed_login_attempts = 0, locked_until = NULL, last_login_at = NOW() WHERE id = ?")
        ->execute([$user['id']]);
    
    AuditLogger::loginSuccess($user['id'], $email);

    echo json_encode([
        'success' => true,
        'user' => [
            'id' => (int)$user['id'],
            'name' => Security::sanitizeOutput($user['name']),
            'email' => Security::sanitizeOutput($user['email']),
            'role' => $user['role'],
            'admin_access' => (bool)($user['admin_access'] ?? false)
        ],
        'csrf_token' => Security::generateCsrfToken()
    ]);
} catch (Exception $e) {
    error_log('Login error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Login failed']);
}
