-- Tool Management Application Database Schema (Fresh Setup)
-- No sample data included. Includes default Admin user.

CREATE DATABASE IF NOT EXISTS tool_management;
USE tool_management;

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('user', 'admin') DEFAULT 'user',
    admin_access TINYINT(1) DEFAULT 0,
    is_verified TINYINT(1) DEFAULT 0,
    verification_otp VARCHAR(255),
    otp_expiry DATETIME,
    status ENUM('Active', 'Inactive') DEFAULT 'Active',
    failed_login_attempts INT DEFAULT 0,
    locked_until DATETIME DEFAULT NULL,
    last_login_at DATETIME DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tools Table
CREATE TABLE IF NOT EXISTS tools (
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
    spoc_1_contact VARCHAR(255),
    spoc_1_email VARCHAR(255),
    spoc_1_timezone VARCHAR(60),
    spoc_1_best_time VARCHAR(100),
    spoc_2 VARCHAR(255),
    spoc_2_contact VARCHAR(255),
    spoc_2_email VARCHAR(255),
    spoc_2_timezone VARCHAR(60),
    spoc_2_best_time VARCHAR(100),
    contact_no VARCHAR(50),
    email_id VARCHAR(255),
    status ENUM('Active', 'Inactive') DEFAULT 'Active',
    reason_for_using TEXT,
    deactivation_reason TEXT,
    deleted_at DATETIME NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Email Settings Table (Reserved for potential future UI-based settings)
CREATE TABLE IF NOT EXISTS email_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    smtp_host VARCHAR(255),
    smtp_port INT DEFAULT 587,
    smtp_username VARCHAR(255),
    smtp_password_encrypted TEXT,
    from_email VARCHAR(255),
    from_name VARCHAR(255),
    notification_email VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Delete Logs Table
CREATE TABLE IF NOT EXISTS delete_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tool_id INT NOT NULL,
    tool_name VARCHAR(255) NOT NULL,
    action_type ENUM('soft_delete', 'permanent_delete', 'restore') NOT NULL,
    deleted_by_id INT,
    deleted_by_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    previous_data JSON
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Password Reset Tokens Table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token VARCHAR(255) NOT NULL,
    expires_at DATETIME NOT NULL,
    used_at DATETIME DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    user_email VARCHAR(255),
    action VARCHAR(100) NOT NULL,
    details TEXT,
    ip_address VARCHAR(45),
    user_agent VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert valid Admin user with admin_access = 1
INSERT INTO users (name, email, password, role, admin_access, is_verified, status)
VALUES ('Admin', 'admin@example.com', '$2y$12$xwLgMyszeNEawxauE3/.Yu/FT4KxymVa7EfyYvlSqAMi8ZFGX.BBC', 'admin', 1, 1, 'Active');

-- Initialize empty email settings
INSERT INTO email_settings (id) VALUES (1);
