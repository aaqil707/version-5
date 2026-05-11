<?php
/**
 * Audit Logger - Records all important user actions
 */

class AuditLogger {
    
    private static $pdo = null;
    
    private static function getPdo() {
        if (self::$pdo === null) {
            require_once __DIR__ . '/../config/db.php';
            global $pdo;
            self::$pdo = $pdo;
        }
        return self::$pdo;
    }
    
    /**
     * Log an action
     * @param string $action Action name
     * @param string|array $details Details about the action
     * @param int|null $userId User ID if logged in
     * @param string|null $userEmail User email
     */
    public static function log($action, $details = '', $userId = null, $userEmail = null) {
        try {
            $pdo = self::getPdo();
            
            if ($userId === null && isset($_SESSION['user_id'])) {
                $userId = $_SESSION['user_id'];
            }
            if ($userEmail === null && isset($_SESSION['user_email'])) {
                $userEmail = $_SESSION['user_email'];
            }
            
            $detailsJson = is_array($details) ? json_encode($details) : $details;
            $ipAddress = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
            $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? '';
            
            $stmt = $pdo->prepare("INSERT INTO audit_logs (user_id, user_email, action, details, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?)");
            $stmt->execute([$userId, $userEmail, $action, $detailsJson, $ipAddress, $userAgent]);
            
        } catch (Exception $e) {
            error_log('Audit log error: ' . $e->getMessage());
        }
    }
    
    /**
     * Log login attempt
     */
    public static function loginAttempt($email, $success, $reason = '') {
        self::log('login_attempt', [
            'email' => $email,
            'success' => $success,
            'reason' => $reason
        ], null, $email);
    }
    
    /**
     * Log successful login
     */
    public static function loginSuccess($userId, $email) {
        self::log('login_success', 'User logged in', $userId, $email);
    }
    
    /**
     * Log logout
     */
    public static function logout($userId, $email) {
        self::log('logout', 'User logged out', $userId, $email);
    }
    
    /**
     * Log tool action
     */
    public static function toolAction($action, $toolId, $toolName, $userId, $email) {
        self::log('tool_' . $action, [
            'tool_id' => $toolId,
            'tool_name' => $toolName
        ], $userId, $email);
    }
    
    /**
     * Log password change
     */
    public static function passwordChange($userId, $email, $type = 'reset') {
        self::log('password_' . $type, 'Password ' . $type, $userId, $email);
    }
    
    /**
     * Log security event
     */
    public static function securityEvent($event, $details) {
        self::log('security_' . $event, $details);
    }
    
    /**
     * Log password change by user
     */
    public static function logPasswordChange($userId, $email, $changedBy = 'user') {
        self::log('password_changed', [
            'changed_by' => $changedBy,
            'user_id' => $userId
        ], $userId, $email);
    }
    
    /**
     * Log failed login attempt
     */
    public static function failedLogin($email, $reason = '') {
        self::log('login_failed', [
            'email' => $email,
            'reason' => $reason,
            'ip' => $_SERVER['REMOTE_ADDR'] ?? 'unknown'
        ], null, $email);
    }
    
    /**
     * Log sensitive data access
     */
    public static function sensitiveDataAccess($userId, $email, $dataType, $action) {
        self::log('sensitive_data_access', [
            'data_type' => $dataType,
            'action' => $action
        ], $userId, $email);
    }
    
    /**
     * Log bulk operation
     */
    public static function bulkOperation($userId, $email, $operation, $count) {
        self::log('bulk_operation', [
            'operation' => $operation,
            'count' => $count
        ], $userId, $email);
    }
    
    /**
     * Log permission denied
     */
    public static function permissionDenied($userId, $email, $permission) {
        self::log('permission_denied', [
            'permission' => $permission,
            'user_id' => $userId
        ], $userId, $email);
    }
    
    /**
     * Log rate limit exceeded
     */
    public static function rateLimitExceeded($identifier, $type) {
        self::log('rate_limit_exceeded', [
            'identifier' => $identifier,
            'type' => $type,
            'ip' => $_SERVER['REMOTE_ADDR'] ?? 'unknown'
        ]);
    }
    
    /**
     * Log sensitive admin action
     */
    public static function adminAction($userId, $email, $action, $target = '') {
        self::log('admin_action', [
            'action' => $action,
            'target' => $target
        ], $userId, $email);
    }
    
    /**
     * Get recent audit logs
     */
    public static function getLogs($limit = 100, $userId = null, $action = null) {
        try {
            $pdo = self::getPdo();
            
            $sql = "SELECT * FROM audit_logs WHERE 1=1";
            $params = [];
            
            if ($userId) {
                $sql .= " AND user_id = ?";
                $params[] = $userId;
            }
            
            if ($action) {
                $sql .= " AND action LIKE ?";
                $params[] = $action . '%';
            }
            
            $sql .= " ORDER BY created_at DESC LIMIT ?";
            $params[] = $limit;
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
            
        } catch (Exception $e) {
            error_log('Get audit logs error: ' . $e->getMessage());
            return [];
        }
    }
}