<?php
/**
 * Security Helper - Input validation, sanitization, CSRF protection, RBAC
 */

class Security {
    private static $csrfTokenName = 'csrf_token';
    private static $rateLimitFile = null;
    
    private static function getRateLimitFile() {
        if (self::$rateLimitFile === null) {
            $privateDir = dirname(__DIR__, 2) . '/private';
            if (!is_dir($privateDir)) {
                @mkdir($privateDir, 0700, true);
            }
            self::$rateLimitFile = $privateDir . '/rate_limit.json';
            if (file_exists(self::$rateLimitFile)) {
                @chmod(self::$rateLimitFile, 0600);
            }
        }
        return self::$rateLimitFile;
    }
    
    // Permission constants
    const PERM_VIEW_TOOLS = 'view_tools';
    const PERM_ADD_TOOLS = 'add_tools';
    const PERM_EDIT_TOOLS = 'edit_tools';
    const PERM_DELETE_TOOLS = 'delete_tools';
    const PERM_VIEW_PORTAL = 'view_portal';
    const PERM_MANAGE_USERS = 'manage_users';
    const PERM_VIEW_ALERTS = 'view_alerts';
    
    // Role-permission mapping
    private static $rolePermissions = [
        'admin' => [
            'view_tools', 'add_tools', 'edit_tools', 'delete_tools',
            'view_portal', 'manage_users', 'view_alerts'
        ],
        'editor' => [
            'view_tools', 'add_tools', 'edit_tools', 'view_portal', 'view_alerts'
        ],
        'viewer' => [
            'view_tools', 'view_portal', 'view_alerts'
        ],
        'user' => [
            'view_tools', 'view_portal', 'view_alerts'
        ]
    ];
    
    public static function initSession() {
        if (session_status() === PHP_SESSION_NONE) {
            ini_set('session.cookie_httponly', 1);
            ini_set('session.use_strict_mode', 1);
            ini_set('session.cookie_samesite', 'Strict');
            ini_set('session.gc_maxlifetime', 3600);
            
            $isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || 
                        $_SERVER['SERVER_PORT'] == 443;
            ini_set('session.cookie_secure', $isHttps ? 1 : 0);
            
            session_start();
            
            if (!isset($_SESSION['initiated'])) {
                session_regenerate_id(true);
                $_SESSION['initiated'] = true;
                // Clear any CSRF token that existed before ID rotation
                unset($_SESSION[self::$csrfTokenName]);
            }
            // If session already has a CSRF token, do NOT regenerate the session ID
            // (doing so destroys the token before the next request can validate it)
        }
    }
    
    public static function generateCsrfToken() {
        self::initSession();
        if (!isset($_SESSION[self::$csrfTokenName])) {
            $_SESSION[self::$csrfTokenName] = bin2hex(random_bytes(32));
        }
        return $_SESSION[self::$csrfTokenName];
    }
    
    public static function validateCsrfToken($token) {
        self::initSession();
        if (empty($token)) {
            return false;
        }
        if (!isset($_SESSION[self::$csrfTokenName]) || empty($_SESSION[self::$csrfTokenName])) {
            return false;
        }
        return hash_equals($_SESSION[self::$csrfTokenName], $token);
    }
    
    public static function validateEmail($email) {
        return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
    }
    
    public static function validateRequired($value) {
        return isset($value) && trim($value) !== '';
    }
    
    public static function validateInteger($value) {
        return filter_var($value, FILTER_VALIDATE_INT) !== false;
    }
    
    public static function validateDate($date, $format = 'Y-m-d') {
        $d = DateTime::createFromFormat($format, $date);
        return $d && $d->format($format) === $date;
    }
    
    public static function validateEnum($value, $allowedValues) {
        return in_array($value, $allowedValues, true);
    }
    
    // RBAC: Check if user has a specific permission
    public static function hasPermission($permission) {
        self::initSession();
        if (!isset($_SESSION['user_role'])) {
            return false;
        }
        $role = $_SESSION['user_role'];
        return isset(self::$rolePermissions[$role]) && 
               in_array($permission, self::$rolePermissions[$role]);
    }
    
    // Check if user is admin
    public static function isAdmin() {
        self::initSession();
        return isset($_SESSION['admin_access']) && $_SESSION['admin_access'] == 1;
    }
    
    // Admin IP whitelist - configure allowed IPs for admin access
    private static $adminIpWhitelist = [
        '127.0.0.1',
        '::1',
        // Add more IPs as needed: '192.168.1.100', etc.
    ];
    
    // Check if current IP is allowed for admin access
    public static function isAdminIpAllowed() {
        $ip = $_SERVER['REMOTE_ADDR'] ?? '';
        // Allow if whitelist is empty (disabled) or IP matches
        return empty(self::$adminIpWhitelist) || in_array($ip, self::$adminIpWhitelist);
    }
    
    // Require admin with IP check
    public static function requireAdminWithIpCheck() {
        self::initSession();
        if (!isset($_SESSION['admin_access']) || $_SESSION['admin_access'] != 1) {
            http_response_code(403);
            echo json_encode(['error' => 'Admin access required']);
            exit;
        }
        if (!self::isAdminIpAllowed()) {
            http_response_code(403);
            echo json_encode(['error' => 'Access denied from this IP address']);
            exit;
        }
    }
    
    // Check if user can edit (admin only)
    public static function canEdit() {
        return self::isAdmin();
    }
    
    // Require admin role - exits if not admin
    public static function requireAdmin() {
        if (!self::isAdmin()) {
            http_response_code(403);
            echo json_encode(['error' => 'Admin access required']);
            exit;
        }
    }
    
    // RBAC: Require specific permission - exits if denied
    public static function checkPermission($permission) {
        if (!self::hasPermission($permission)) {
            http_response_code(403);
            echo json_encode(['error' => 'Permission denied: ' . $permission]);
            exit;
        }
    }
    
    // RBAC: Require specific role
    public static function requireRole($role) {
        $user = self::requireAuth();
        if (!isset($_SESSION['user_role']) || $_SESSION['user_role'] !== $role) {
            http_response_code(403);
            echo json_encode(['error' => 'Role required: ' . $role]);
            exit;
        }
        return $user;
    }
    
    // Password strength validation (OWASP compliant)
    public static function validatePasswordStrength($password) {
        $errors = [];
        
        if (strlen($password) < 8) {
            $errors[] = 'Password must be at least 8 characters';
        }
        if (!preg_match('/[A-Z]/', $password)) {
            $errors[] = 'Password must contain at least one uppercase letter';
        }
        if (!preg_match('/[a-z]/', $password)) {
            $errors[] = 'Password must contain at least one lowercase letter';
        }
        if (!preg_match('/[0-9]/', $password)) {
            $errors[] = 'Password must contain at least one number';
        }
        if (!preg_match('/[^A-Za-z0-9]/', $password)) {
            $errors[] = 'Password must contain at least one special character';
        }
        
        return $errors;
    }
    
    // Enhanced XSS protection
    public static function sanitizeInput($data) {
        if (is_array($data)) {
            return array_map(['self', 'sanitizeInput'], $data);
        }
        
        $data = $data ?? '';
        
        // Remove tags and special characters
        $data = strip_tags($data);
        
        // Convert special HTML entities
        $data = htmlspecialchars(trim((string)$data), ENT_QUOTES, 'UTF-8');
        
        return $data;
    }
    
    public static function sanitizeOutput($data) {
        if (is_array($data)) {
            return array_map(['self', 'sanitizeOutput'], $data);
        }
        return htmlspecialchars($data ?? '', ENT_QUOTES, 'UTF-8');
    }
    
    public static function checkRateLimit($identifier, $maxAttempts = 5, $timeWindow = 300) {
        $data = self::getRateLimitData();
        $now = time();
        
        if (!isset($data[$identifier])) {
            $data[$identifier] = ['attempts' => 0, 'first_attempt' => $now, 'locked_until' => null];
        }
        
        $record = &$data[$identifier];
        
        if ($record['locked_until'] && $now < $record['locked_until']) {
            $remaining = $record['locked_until'] - $now;
            return ['allowed' => false, 'remaining_attempts' => 0, 'retry_after' => $remaining];
        }
        
        if ($now - $record['first_attempt'] > $timeWindow) {
            $record = ['attempts' => 0, 'first_attempt' => $now, 'locked_until' => null];
        }
        
        $record['attempts']++;
        
        if ($record['attempts'] > $maxAttempts) {
            $record['locked_until'] = $now + $timeWindow;
            self::saveRateLimitData($data);
            return ['allowed' => false, 'remaining_attempts' => 0, 'retry_after' => $timeWindow];
        }
        
        $remaining = $maxAttempts - $record['attempts'];
        self::saveRateLimitData($data);
        
        return ['allowed' => true, 'remaining_attempts' => $remaining];
    }
    
    private static function getRateLimitData() {
        $rateFile = self::getRateLimitFile();
        if (file_exists($rateFile)) {
            $fp = fopen($rateFile, 'r');
            if ($fp && flock($fp, LOCK_SH)) {
                $content = fread($fp, filesize($rateFile));
                flock($fp, LOCK_UN);
                fclose($fp);
                $data = json_decode($content, true);
                if (is_array($data)) {
                    $now = time();
                    foreach ($data as $key => $record) {
                        if (isset($record['locked_until']) && $record['locked_until'] < $now) {
                            unset($data[$key]);
                        } elseif (isset($record['first_attempt']) && ($now - $record['first_attempt']) > 600) {
                            unset($data[$key]);
                        }
                    }
                    return $data;
                }
            }
        }
        return [];
    }
    
    private static function saveRateLimitData($data) {
        $rateFile = self::getRateLimitFile();
        $fp = fopen($rateFile, 'c');
        if ($fp && flock($fp, LOCK_EX)) {
            ftruncate($fp, 0);
            fwrite($fp, json_encode($data));
            fflush($fp);
            flock($fp, LOCK_UN);
            fclose($fp);
        }
    }
    
    public static function requireAuth() {
        self::initSession();
        if (!isset($_SESSION['user_id'])) {
            http_response_code(401);
            echo json_encode(['error' => 'Authentication required']);
            exit;
        }
        return $_SESSION;
    }
    
    public static function logout() {
        self::initSession();
        $_SESSION = [];
        if (ini_get('session.use_cookies')) {
            $params = session_get_cookie_params();
            setcookie(session_name(), '', time() - 42000,
                $params['path'], $params['domain'],
                $params['secure'], $params['httponly']
            );
        }
        session_destroy();
    }
    
    private static function getEncryptionKey() {
        $privateDir = dirname(__DIR__, 2) . '/private';
        $keyFile = $privateDir . '/encryption.key';
        
        if (file_exists($keyFile)) {
            $hexKey = trim(file_get_contents($keyFile));
            if (strlen($hexKey) >= 64) {
                return hex2bin($hexKey);
            }
        }
        
        if (!is_dir($privateDir)) {
            @mkdir($privateDir, 0700, true);
        }
        
        $key = random_bytes(32);
        file_put_contents($keyFile, bin2hex($key), LOCK_EX);
        @chmod($keyFile, 0600);
        return $key;
    }
    
    public static function encrypt($data) {
        $key = self::getEncryptionKey();
        $iv = random_bytes(16);
        $encrypted = openssl_encrypt($data, 'aes-256-cbc', $key, OPENSSL_RAW_DATA, $iv);
        return base64_encode($iv . $encrypted);
    }
    
    public static function decrypt($data) {
        if (empty($data)) return '';
        
        $decoded = base64_decode($data);
        if ($decoded === false || strlen($decoded) < 32) {
            throw new Exception('Invalid encrypted data format');
        }
        
        $iv = substr($decoded, 0, 16);
        $ciphertext = substr($decoded, 16);
        
        // Get the key using the same method as encrypt()
        $key = self::getEncryptionKey();
        
        $result = openssl_decrypt($ciphertext, 'aes-256-cbc', $key, OPENSSL_RAW_DATA, $iv);
        
        if ($result !== false) {
            return $result;
        }
        
        throw new Exception('Decryption failed');
    }
}

function sanitizeOutput($data) {
    if (is_array($data)) {
        return array_map('sanitizeOutput', $data);
    }
    return htmlspecialchars($data, ENT_QUOTES, 'UTF-8');
}