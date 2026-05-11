<?php
// Database configuration - require environment variables
$host = getenv('DB_HOST');
$user = getenv('DB_USER');
$pass = getenv('DB_PASS');
$dbname = getenv('DB_NAME') ?: 'tool_management';

// Validate required configuration
if (getenv('APP_ENV') === 'production') {
    if (empty($host) || empty($user) || $pass === false) {
        error_log("Database configuration missing. Set DB_HOST, DB_USER, DB_PASS environment variables.");
        if (!isset($_SERVER['REQUEST_URI']) || strpos($_SERVER['REQUEST_URI'], '/auth/') !== 0) {
            http_response_code(500);
            die(json_encode(['error' => 'Database configuration error']));
        }
    }
} else {
    // Development defaults
    $host = $host ?: 'localhost';
    $user = $user ?: 'root';
    $pass = $pass ?: '';
}

$schemaInitialized = false;

// Check for first-run initialization flag to avoid repeated seeding queries
$initFlagFile = dirname(__DIR__, 2) . '/private/.schema_initialized';
$firstRun = !file_exists($initFlagFile);

try {
    $pdo = new PDO("mysql:host=$host", $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false
    ]);
    
    // Validate database name - only allow alphanumeric and underscore
    if (!preg_match('/^[a-zA-Z0-9_]+$/', $dbname)) {
        throw new PDOException('Invalid database name');
    }
    $pdo->exec("CREATE DATABASE IF NOT EXISTS `" . $dbname . "`");
    $pdo->exec("USE `" . $dbname . "`");
    
    $schemaInitialized = true;
    
} catch (PDOException $e) {
    error_log("Database connection failed: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Database connection failed']);
    exit;
}

function initializeSchema($pdo, $firstRun, $initFlagFile) {
    $pdo->exec("CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role ENUM('user', 'admin') DEFAULT 'user',
        admin_access TINYINT(1) DEFAULT 0,
        is_verified TINYINT(1) DEFAULT 0,
        verification_otp VARCHAR(255),
        otp_expiry DATETIME,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )");
    
    $columns = [
        'is_verified' => 'TINYINT(1) DEFAULT 0',
        'verification_otp' => 'VARCHAR(255)',
        'otp_expiry' => 'DATETIME',
        'admin_access' => 'TINYINT(1) DEFAULT 0'
    ];
    
    foreach ($columns as $col => $def) {
        try {
            $pdo->exec("ALTER TABLE users ADD COLUMN $col $def");
        } catch (Exception $e) {
            error_log("Schema migration warning: " . $e->getMessage());
        }
    }
    
    try {
        $stmt = $pdo->query("SHOW COLUMNS FROM users LIKE 'status'");
        if ($stmt->rowCount() === 0) {
            $pdo->exec("ALTER TABLE users ADD COLUMN status ENUM('Active', 'Inactive') DEFAULT 'Active'");
        }
    } catch (Exception $e) {
        error_log("Status column migration: " . $e->getMessage());
    }
    
    try {
        $pdo->exec("UPDATE users SET status = 'Active' WHERE status IS NULL OR status = ''");
    } catch (Exception $e) {
        error_log("Status update warning: " . $e->getMessage());
    }
    
    $pdo->exec("CREATE TABLE IF NOT EXISTS tools (
        id INT AUTO_INCREMENT PRIMARY KEY,
        year INT DEFAULT 2026,
        tool_name VARCHAR(255) NOT NULL,
        type VARCHAR(100) DEFAULT 'NA',
        no_of_license INT DEFAULT 1,
        resume_views INT DEFAULT 0,
        job_slots INT DEFAULT 0,
        bulk_mail INT DEFAULT 0,
        cost DECIMAL(12, 2) DEFAULT 0,
        revenue DECIMAL(12, 2) DEFAULT 0,
        monthly_cost DECIMAL(12, 2) DEFAULT 0,
        quarterly_cost DECIMAL(12, 2) DEFAULT 0,
        annual_cost DECIMAL(12, 2) DEFAULT 0,
        currency VARCHAR(10) DEFAULT 'USD',
        geography VARCHAR(50) DEFAULT 'USA',
        payment_frequency VARCHAR(50) DEFAULT 'Monthly',
        last_renewal DATE,
        next_renewal DATE,
        comments TEXT,
        spoc_1 VARCHAR(255),
        spoc_2 VARCHAR(255),
        contact_no VARCHAR(50),
        email_id VARCHAR(255),
        status ENUM('Active', 'Inactive') DEFAULT 'Active',
        reason_for_using TEXT,
        deleted_at DATETIME NULL DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )");
    
    // First run only - seed default data
    if ($firstRun) {
        $stmt = $pdo->query("SELECT COUNT(*) as cnt FROM users WHERE email = 'admin@example.com'");
        $result = $stmt->fetch();
        
        if ($result['cnt'] == 0) {
            $defaultPassword = getenv('ADMIN_PASSWORD');
            if (empty($defaultPassword)) {
                error_log("CRITICAL: ADMIN_PASSWORD environment variable is not set!");
                error_log("Please set ADMIN_PASSWORD env var before first run. Using temporary password for development only.");
                $defaultPassword = bin2hex(random_bytes(8));
                error_log("Temporary admin password generated. CHANGE THIS AFTER FIRST LOGIN!");
            }
            $hash = password_hash($defaultPassword, PASSWORD_BCRYPT, ['cost' => 12]);
            $stmt = $pdo->prepare("INSERT INTO users (name, email, password, role, is_verified) VALUES ('Admin', 'admin@example.com', ?, 'admin', 1)");
            $stmt->execute([$hash]);
        }
        
        $stmt = $pdo->query("SELECT COUNT(*) as cnt FROM tools");
        $result = $stmt->fetch();
        
        if ($result['cnt'] == 0) {
            $pdo->exec("INSERT INTO tools (year, tool_name, type, no_of_license, cost, revenue, geography, status) VALUES 
                (2026, 'LinkedIn Recruiter', 'Job Portal', 10, 15000, 25000, 'USA', 'Active'),
                (2026, 'Indeed', 'Job Portal', 5, 5000, 8000, 'INDIA', 'Active'),
                (2026, 'Monster', 'Job Portal', 3, 3000, 4500, 'CANADA', 'Active')");
        }
        
        // Create flag file to prevent repeated seeding
        file_put_contents($initFlagFile, date('Y-m-d H:i:s'), LOCK_EX);
    }
    
    try {
        $pdo->exec("ALTER TABLE tools ADD COLUMN deleted_at DATETIME NULL DEFAULT NULL");
    } catch (Exception $e) {
        error_log("Schema migration warning: " . $e->getMessage());
    }
    
    $pdo->exec("CREATE TABLE IF NOT EXISTS delete_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tool_id INT NOT NULL,
        tool_name VARCHAR(255) NOT NULL,
        action_type ENUM('soft_delete', 'permanent_delete', 'restore') NOT NULL,
        deleted_by_id INT,
        deleted_by_name VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        previous_data JSON
    )");
    
    $pdo->exec("CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        token VARCHAR(255) NOT NULL,
        expires_at DATETIME NOT NULL,
        used_at DATETIME DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )");
    
    $pdo->exec("CREATE TABLE IF NOT EXISTS audit_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        user_email VARCHAR(255),
        action VARCHAR(100) NOT NULL,
        details TEXT,
        ip_address VARCHAR(45),
        user_agent VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )");
    
    try {
        $pdo->exec("ALTER TABLE users ADD COLUMN failed_login_attempts INT DEFAULT 0");
    } catch (Exception $e) {
        error_log("Schema migration warning: " . $e->getMessage());
    }
    try {
        $pdo->exec("ALTER TABLE users ADD COLUMN locked_until DATETIME DEFAULT NULL");
    } catch (Exception $e) {
        error_log("Schema migration warning: " . $e->getMessage());
    }
    try {
        $pdo->exec("ALTER TABLE users ADD COLUMN last_login_at DATETIME DEFAULT NULL");
    } catch (Exception $e) {
        error_log("Schema migration warning: " . $e->getMessage());
    }
}

if ($schemaInitialized && function_exists('initializeSchema')) {
    initializeSchema($pdo, $firstRun, $initFlagFile);
}