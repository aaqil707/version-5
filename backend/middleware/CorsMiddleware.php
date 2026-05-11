<?php
/**
 * CORS Middleware - Secure CORS configuration with security headers
 * Implements OWASP security recommendations
 */

class CorsMiddleware {
    private static $allowedOrigins = [
        'http://localhost:8080',
        'http://localhost:3000',
        'http://localhost:80',
        'http://localhost',
        'http://127.0.0.1:8080',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:80',
        'http://127.0.0.1'
    ];
    
    private static $productionOrigins = [];
    
    public static function handle() {
        header('X-Content-Type-Options: nosniff');
        header('X-Frame-Options: DENY');
        header('X-XSS-Protection: 1; mode=block');
        if (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') {
            header('Strict-Transport-Security: max-age=31536000; includeSubDomains');
        }
        header('Referrer-Policy: strict-origin-when-cross-origin');
        header('Permissions-Policy: geolocation=(), microphone=(), camera=()');
        
        $envOrigins = getenv('CORS_ORIGINS');
        if (!empty($envOrigins)) {
            self::$productionOrigins = array_map('trim', explode(',', $envOrigins));
        }
        
        // Stronger CSP
        header("Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' http://localhost:* https://*; frame-ancestors 'none'; base-uri 'self';");
        
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
        $host = $_SERVER['HTTP_HOST'] ?? '';
        
        $allowedOrigins = array_merge(self::$allowedOrigins, self::$productionOrigins);
        
        if (!empty($origin)) {
            if (in_array($origin, $allowedOrigins)) {
                // Only allow credentials for HTTPS origins in production
                if (strpos($origin, 'https://') === 0 || getenv('APP_ENV') !== 'production' || strpos($origin, 'http://localhost') === 0 || strpos($origin, 'http://127.0.0.1') === 0) {
                    header('Access-Control-Allow-Origin: ' . $origin);
                    header('Access-Control-Allow-Credentials: true');
                }
            } elseif ($origin === 'http://' . $host || $origin === 'https://' . $host) {
                header('Access-Control-Allow-Origin: ' . $origin);
                header('Access-Control-Allow-Credentials: true');
            } else {
                error_log('CORS rejected: ' . $origin);
            }
        }
        
        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH');
        header('Access-Control-Allow-Headers: Content-Type, X-CSRF-Token, Authorization, Accept, Cookie, X-Requested-With');
        header('Access-Control-Expose-Headers: Content-Length, Content-Type');
        header('Access-Control-Max-Age: 86400');
        
        // Handle preflight
        if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
            http_response_code(200);
            exit;
        }
    }
    
    public static function setAllowedOrigins($origins) {
        self::$allowedOrigins = $origins;
    }
    
    public static function addAllowedOrigin($origin) {
        if (!in_array($origin, self::$allowedOrigins)) {
            self::$allowedOrigins[] = $origin;
        }
    }
}