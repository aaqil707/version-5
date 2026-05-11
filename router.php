<?php
// Router script to serve React frontend and PHP API from single port

// Suppress PHP deprecation warnings
error_reporting(E_ALL & ~E_DEPRECATED & ~E_USER_DEPRECATED);

// Security Headers
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('X-XSS-Protection: 1; mode=block');
if (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') {
    header('Strict-Transport-Security: max-age=31536000; includeSubDomains');
}
header('Referrer-Policy: strict-origin-when-cross-origin');
header('Permissions-Policy: geolocation=(), microphone=(), camera=()');
header("Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://fonts.googleapis.com https://fonts.gstatic.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' http://localhost:* https://*; frame-ancestors 'none'; base-uri 'self';");
header('X-Permitted-Cross-Domain-Policies: none');
header('X-Powered-By:');

$requestUri = $_SERVER['REQUEST_URI'];
$requestMethod = $_SERVER['REQUEST_METHOD'];

// Prevent path traversal attacks
$requestUri = str_replace(['../', '..\\', '%2e%2e', '%2e%2e%2f', '%252e%252e%252f', '%2e%2e%5c', '%252e%252e%5c'], '', $requestUri);
$requestUri = str_replace(["\0"], '', $requestUri);
if (preg_match('/\.\./i', $requestUri)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid request']);
    exit;
}

$requestPath = parse_url($requestUri, PHP_URL_PATH);

// API routes
$apiPrefixes = ['/auth/', '/tools/', '/portal/', '/notifications/'];
foreach ($apiPrefixes as $prefix) {
    if (strpos($requestPath, $prefix) === 0) {
        $apiFile = realpath(__DIR__ . '/backend' . $requestPath);
        if ($apiFile && file_exists($apiFile) && is_file($apiFile)) {
            include $apiFile;
            exit;
        }
    }
}

// Serve PHPMailer images
if (strpos($requestPath, '/PHPMailer/images/') === 0) {
    $imagePath = __DIR__ . '/backend' . $requestPath;
    if (file_exists($imagePath)) {
        $extension = pathinfo($imagePath, PATHINFO_EXTENSION);
        $mimeTypes = ['jpg' => 'image/jpeg', 'jpeg' => 'image/jpeg', 'png' => 'image/png', 'gif' => 'image/gif'];
        header('Content-Type: ' . ($mimeTypes[$extension] ?? 'application/octet-stream'));
        readfile($imagePath);
        exit;
    }
}

// React build folder path
$buildPath = __DIR__ . '/frontend/build';

// Serve index.html for root
if ($requestPath === '/' || $requestPath === '') {
    readfile($buildPath . '/index.html');
    exit;
}

// Check if file exists in build folder
$filePath = $buildPath . $requestPath;
if (file_exists($filePath) && is_file($filePath)) {
    $extension = pathinfo($filePath, PATHINFO_EXTENSION);
    $mimeTypes = [
        'js' => 'application/javascript',
        'css' => 'text/css',
        'png' => 'image/png',
        'jpg' => 'image/jpeg',
        'jpeg' => 'image/jpeg',
        'gif' => 'image/gif',
        'svg' => 'image/svg+xml',
        'ico' => 'image/x-icon',
        'woff' => 'font/woff',
        'woff2' => 'font/woff2',
        'ttf' => 'font/ttf',
        'map' => 'application/json',
        'json' => 'application/json',
        'webmanifest' => 'application/json'
    ];
    if (isset($mimeTypes[$extension])) {
        header('Content-Type: ' . $mimeTypes[$extension]);
    }
    readfile($filePath);
    exit;
}

// Default - serve React index.html for SPA routing
readfile($buildPath . '/index.html');
