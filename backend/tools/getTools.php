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

$page   = isset($_GET['page'])   ? max(1, (int)$_GET['page'])                 : 1;
$limit  = isset($_GET['limit'])  ? min(max(1, (int)$_GET['limit']), 100)      : 50;
$offset = ($page - 1) * $limit;

$statusFilter = isset($_GET['status']) ? $_GET['status'] : null;

try {
    $countSql = "SELECT COUNT(*) as total FROM tools WHERE deleted_at IS NULL";

        $sql = "SELECT
                    id, year, tool_name, type, no_of_license, resume_views, job_slots, bulk_mail,
                    cost, revenue, monthly_cost, quarterly_cost, annual_cost,
                    currency, geography, payment_frequency,
                    last_renewal, next_renewal, comments,
                    spoc_1, spoc_1_contact, spoc_1_email, spoc_1_timezone, spoc_1_best_time,
                    spoc_2, spoc_2_contact, spoc_2_email, spoc_2_timezone, spoc_2_best_time,
                    contact_no, email_id,
                    status, reason_for_using, deactivation_reason
                FROM tools
                WHERE deleted_at IS NULL";

    if ($statusFilter && in_array($statusFilter, ['Active', 'Inactive'])) {
        $countSql .= " AND status = :status";
        $sql      .= " AND status = :status";
    }

    $sql .= " ORDER BY id DESC LIMIT :limit OFFSET :offset";

    $countStmt = $pdo->prepare($countSql);
    if ($statusFilter && in_array($statusFilter, ['Active', 'Inactive'])) {
        $countStmt->bindValue(':status', $statusFilter, PDO::PARAM_STR);
    }
    $countStmt->execute();
    $totalCount = $countStmt->fetch(PDO::FETCH_ASSOC)['total'];

    $stmt = $pdo->prepare($sql);
    if ($statusFilter && in_array($statusFilter, ['Active', 'Inactive'])) {
        $stmt->bindValue(':status', $statusFilter, PDO::PARAM_STR);
    }
    $stmt->bindValue(':limit',  $limit,  PDO::PARAM_INT);
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
    $stmt->execute();
    $tools = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $sanitizedTools = array_map(function ($tool) {
        return [
            'id'                  => (int)$tool['id'],
            'year'                => (int)$tool['year'],
            'tool_name'           => Security::sanitizeOutput($tool['tool_name']),
            'type'                => Security::sanitizeOutput($tool['type']),
            'no_of_license'       => (int)$tool['no_of_license'],
            'resume_views'        => (int)$tool['resume_views'],
            'job_slots'           => (int)$tool['job_slots'],
            'bulk_mail'           => (int)$tool['bulk_mail'],
            'cost'                => (float)$tool['cost'],
            'revenue'             => (float)$tool['revenue'],
            'monthly_cost'        => (float)$tool['monthly_cost'],
            'quarterly_cost'      => (float)$tool['quarterly_cost'],
            'annual_cost'         => (float)$tool['annual_cost'],
            'currency'            => $tool['currency'],
            'geography'           => $tool['geography'],
            'payment_frequency'   => $tool['payment_frequency'],
            'last_renewal'        => $tool['last_renewal'],
            'next_renewal'        => $tool['next_renewal'],
            'comments'            => Security::sanitizeOutput($tool['comments']),
            'spoc_1'              => Security::sanitizeOutput($tool['spoc_1']),
            'spoc_1_contact'      => Security::sanitizeOutput($tool['spoc_1_contact']),
            'spoc_1_email'        => Security::sanitizeOutput($tool['spoc_1_email']),
            'spoc_1_timezone'       => Security::sanitizeOutput($tool['spoc_1_timezone']),
            'spoc_1_best_time'      => Security::sanitizeOutput($tool['spoc_1_best_time']),
            'spoc_2'                => Security::sanitizeOutput($tool['spoc_2']),
            'spoc_2_contact'      => Security::sanitizeOutput($tool['spoc_2_contact']),
            'spoc_2_email'        => Security::sanitizeOutput($tool['spoc_2_email']),
            'spoc_2_timezone'       => Security::sanitizeOutput($tool['spoc_2_timezone']),
            'spoc_2_best_time'      => Security::sanitizeOutput($tool['spoc_2_best_time']),
            'contact_no'            => Security::sanitizeOutput($tool['contact_no']),
            'email_id'            => Security::sanitizeOutput($tool['email_id']),
            'status'              => $tool['status'],
            'reason_for_using'    => Security::sanitizeOutput($tool['reason_for_using']),
            'deactivation_reason' => Security::sanitizeOutput($tool['deactivation_reason']),
        ];
    }, $tools);

    echo json_encode([
        'success' => true,
        'tools'   => $sanitizedTools,
        'pagination' => [
            'page'       => $page,
            'limit'      => $limit,
            'total'      => (int)$totalCount,
            'totalPages' => (int)ceil($totalCount / $limit),
        ]
    ]);
} catch (Exception $e) {
    error_log('getTools error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Failed to fetch tools']);
}