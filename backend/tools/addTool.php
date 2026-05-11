<?php
require_once __DIR__ . '/../middleware/CorsMiddleware.php';
CorsMiddleware::handle();
header('Content-Type: application/json');

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../middleware/security.php';
require_once __DIR__ . '/../middleware/AuditLogger.php';

Security::initSession();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405); echo json_encode(['error' => 'Method not allowed']); exit;
}
$csrfToken = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
if (!Security::validateCsrfToken($csrfToken)) {
    http_response_code(403); echo json_encode(['error' => 'Invalid CSRF token']); exit;
}
Security::requireAuth();
Security::checkPermission(Security::PERM_ADD_TOOLS);
if (!Security::isAdmin()) {
    http_response_code(403); echo json_encode(['error' => 'Admin access required']); exit;
}

$data = json_decode(file_get_contents('php://input'), true);

$allowedCurrencies  = ['USD','INR','MYR','AED','EUR','GBP','CAD'];
$allowedStatuses    = ['Active','Inactive'];
$allowedFrequencies = ['Monthly','Quarterly','Annual'];
$allowedGeographies = ['USA','INDIA','CANADA','MALAYSIA','UAE','UK'];
$allowedTimezones   = [
    'Asia/Kolkata','America/New_York','America/Chicago','America/Denver','America/Los_Angeles',
    'America/Toronto','America/Winnipeg','America/Edmonton','America/Vancouver',
    'Asia/Kuala_Lumpur','Asia/UAE','Europe/London','UTC',
    'Europe/Paris','Asia/Singapore','Australia/Sydney',
];

$year             = isset($data['year'])            ? (int)$data['year']            : date('Y');
$toolName         = Security::sanitizeInput($data['tool_name']         ?? '');
$type             = Security::sanitizeInput($data['type']              ?? 'NA');
$noOfLicense      = isset($data['no_of_license'])   ? (int)$data['no_of_license']   : 1;
$jobSlots         = isset($data['job_slots'])        ? (int)$data['job_slots']       : 0;
$resumeViews      = isset($data['resume_views'])     ? (int)$data['resume_views']    : 0;
$bulkMail         = isset($data['bulk_mail'])        ? (int)$data['bulk_mail']       : 0;
$cost             = isset($data['cost'])             ? (float)$data['cost']          : 0;
$revenue          = isset($data['revenue'])          ? (float)$data['revenue']       : 0;
$monthlyCost      = isset($data['monthly_cost'])     ? (float)$data['monthly_cost']  : 0;
$quarterlyCost    = isset($data['quarterly_cost'])   ? (float)$data['quarterly_cost']: 0;
$annualCost       = isset($data['annual_cost'])      ? (float)$data['annual_cost']   : 0;
$currency         = Security::sanitizeInput($data['currency']          ?? 'USD');
$geography        = Security::sanitizeInput($data['geography']         ?? 'USA');
$paymentFrequency = Security::sanitizeInput($data['payment_frequency'] ?? 'Monthly');
$lastRenewal      = Security::sanitizeInput($data['last_renewal']      ?? '');
$nextRenewal      = Security::sanitizeInput($data['next_renewal']      ?? '');
$comments         = Security::sanitizeInput($data['comments']          ?? '');
$spoc1Name        = Security::sanitizeInput($data['spoc_1']            ?? '');
$spoc1Contact     = Security::sanitizeInput($data['spoc_1_contact']    ?? '');
$spoc1Email       = Security::sanitizeInput($data['spoc_1_email']      ?? '');
$spoc1Timezone    = Security::sanitizeInput($data['spoc_1_timezone']   ?? '');
$spoc1BestTime    = Security::sanitizeInput($data['spoc_1_best_time']   ?? '');
$spoc2Name        = Security::sanitizeInput($data['spoc_2']            ?? '');
$spoc2Contact     = Security::sanitizeInput($data['spoc_2_contact']    ?? '');
$spoc2Email       = Security::sanitizeInput($data['spoc_2_email']      ?? '');
$spoc2Timezone    = Security::sanitizeInput($data['spoc_2_timezone']   ?? '');
$spoc2BestTime    = Security::sanitizeInput($data['spoc_2_best_time']   ?? '');
$contactNo        = Security::sanitizeInput($data['contact_no']        ?? '');
$emailId          = Security::sanitizeInput($data['email_id']          ?? '');
$status              = Security::sanitizeInput($data['status']              ?? 'Active');
$reasonForUsing      = Security::sanitizeInput($data['reason_for_using']    ?? '');
$deactivationReason  = Security::sanitizeInput($data['deactivation_reason'] ?? '');

// Mandatory checks
if (!Security::validateRequired($toolName))      { http_response_code(400); echo json_encode(['error'=>'Tool name is required']); exit; }
if (!Security::validateRequired($spoc1Name))     { http_response_code(400); echo json_encode(['error'=>'SPOC 1 name is required']); exit; }
if (empty($lastRenewal))                         { http_response_code(400); echo json_encode(['error'=>'Last Renewal date is required']); exit; }
if (empty($nextRenewal))                         { http_response_code(400); echo json_encode(['error'=>'Next Renewal date is required']); exit; }
if (!Security::validateRequired($comments))      { http_response_code(400); echo json_encode(['error'=>'Comments are required']); exit; }
if (!Security::validateRequired($reasonForUsing)){ http_response_code(400); echo json_encode(['error'=>'Reason for using is required']); exit; }
if ($annualCost <= 0)                            { http_response_code(400); echo json_encode(['error'=>'Annual cost must be > 0']); exit; }
if ($status === 'Inactive' && !Security::validateRequired($deactivationReason)) {
    http_response_code(400); echo json_encode(['error'=>'Deactivation reason required when Inactive']); exit;
}

// Enum validation
if (!Security::validateEnum($currency,$allowedCurrencies))         { http_response_code(400); echo json_encode(['error'=>'Invalid currency']); exit; }
if (!Security::validateEnum($geography,$allowedGeographies))       { http_response_code(400); echo json_encode(['error'=>'Invalid geography']); exit; }
if (!Security::validateEnum($status,$allowedStatuses))             { http_response_code(400); echo json_encode(['error'=>'Invalid status']); exit; }
if (!Security::validateEnum($paymentFrequency,$allowedFrequencies)){ http_response_code(400); echo json_encode(['error'=>'Invalid payment frequency']); exit; }
if (!empty($spoc1Timezone) && !in_array($spoc1Timezone,$allowedTimezones)) { http_response_code(400); echo json_encode(['error'=>'Invalid SPOC 1 timezone']); exit; }
if (!empty($spoc2Timezone) && !in_array($spoc2Timezone,$allowedTimezones)) { http_response_code(400); echo json_encode(['error'=>'Invalid SPOC 2 timezone']); exit; }
if (!empty($spoc1Email) && !Security::validateEmail($spoc1Email))  { http_response_code(400); echo json_encode(['error'=>'Invalid SPOC 1 email']); exit; }
if (!empty($spoc2Email) && !Security::validateEmail($spoc2Email))  { http_response_code(400); echo json_encode(['error'=>'Invalid SPOC 2 email']); exit; }
if (!Security::validateDate($lastRenewal))                         { http_response_code(400); echo json_encode(['error'=>'Invalid last renewal date']); exit; }
if (!Security::validateDate($nextRenewal))                         { http_response_code(400); echo json_encode(['error'=>'Invalid next renewal date']); exit; }
if (strtotime($nextRenewal) <= strtotime($lastRenewal))            { http_response_code(400); echo json_encode(['error'=>'Next Renewal must be after Last Renewal']); exit; }
if ($year < 2000 || $year > 2100)                                  { http_response_code(400); echo json_encode(['error'=>'Invalid year']); exit; }

try {
    $stmt = $pdo->prepare("
        INSERT INTO tools (
            year, tool_name, type, no_of_license, job_slots, resume_views, bulk_mail,
            cost, revenue, monthly_cost, quarterly_cost, annual_cost,
            currency, geography, payment_frequency, last_renewal, next_renewal, comments,
            spoc_1, spoc_1_contact, spoc_1_email, spoc_1_timezone, spoc_1_best_time,
            spoc_2, spoc_2_contact, spoc_2_email, spoc_2_timezone, spoc_2_best_time,
            contact_no, email_id, status, reason_for_using, deactivation_reason
        ) VALUES (
            ?,?,?,?,?,?,?,  ?,?,?,?,?,  ?,?,?,?,?,?,
            ?,?,?,?,?,  ?,?,?,?,?,  ?,?,?,?,?
        )
    ");
    $stmt->execute([
        $year,$toolName,$type,$noOfLicense,$jobSlots,$resumeViews,$bulkMail,
        $cost,$revenue,$monthlyCost,$quarterlyCost,$annualCost,
        $currency,$geography,$paymentFrequency,$lastRenewal,$nextRenewal,$comments,
        $spoc1Name,$spoc1Contact,$spoc1Email,$spoc1Timezone ?: null, $spoc1BestTime ?: null,
        $spoc2Name,$spoc2Contact,$spoc2Email,$spoc2Timezone ?: null, $spoc2BestTime ?: null,
        $contactNo,$emailId,$status,$reasonForUsing,$deactivationReason,
    ]);
    $toolId = $pdo->lastInsertId();
    AuditLogger::toolAction('created',$toolId,$toolName,$_SESSION['user_id']??null,$_SESSION['user_email']??null);
    echo json_encode(['success'=>true,'tool'=>['id'=>$toolId,'tool_name'=>Security::sanitizeOutput($toolName)]]);
} catch (Exception $e) {
    error_log('addTool error: '.$e->getMessage());
    http_response_code(500); echo json_encode(['error'=>'Failed to add tool']);
}