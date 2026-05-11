<?php
require_once __DIR__ . '/../middleware/CorsMiddleware.php';
CorsMiddleware::handle();
header('Content-Type: application/json');

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../middleware/security.php';

Security::initSession();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

Security::requireAuth();
Security::checkPermission(Security::PERM_VIEW_TOOLS);

try {
    $stmt = $pdo->prepare("SELECT id, year, tool_name, type, no_of_license, cost, revenue, currency, geography, payment_frequency, last_renewal, next_renewal, comments, spoc_1, spoc_2, contact_no, email_id, status, reason_for_using, deleted_at FROM tools WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC");
    $stmt->execute();
    $tools = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $sanitizedTools = array_map(function($tool) {
        return [
            'id' => (int)$tool['id'],
            'year' => (int)$tool['year'],
            'tool_name' => Security::sanitizeOutput($tool['tool_name']),
            'type' => Security::sanitizeOutput($tool['type']),
            'no_of_license' => (int)$tool['no_of_license'],
            'cost' => (float)$tool['cost'],
            'revenue' => (float)$tool['revenue'],
            'currency' => $tool['currency'],
            'geography' => $tool['geography'],
            'payment_frequency' => $tool['payment_frequency'],
            'last_renewal' => $tool['last_renewal'],
            'next_renewal' => $tool['next_renewal'],
            'comments' => Security::sanitizeOutput($tool['comments']),
            'spoc_1' => Security::sanitizeOutput($tool['spoc_1']),
            'spoc_2' => Security::sanitizeOutput($tool['spoc_2']),
            'contact_no' => Security::sanitizeOutput($tool['contact_no']),
            'email_id' => Security::sanitizeOutput($tool['email_id']),
            'status' => $tool['status'],
            'reason_for_using' => Security::sanitizeOutput($tool['reason_for_using']),
            'deleted_at' => $tool['deleted_at']
        ];
    }, $tools);

    echo json_encode([
        'success' => true,
        'tools' => $sanitizedTools,
        'count' => count($sanitizedTools)
    ]);
} catch (Exception $e) {
    error_log('getRecycleBin error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Failed to fetch recycle bin']);
}