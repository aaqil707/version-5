# Tool Management System - Complete Developer Documentation

---

## 1. DATABASE TABLES

### Table: users

**Tables included :** 
- `users` (User accounts and authentication data)

**table name:** `users`

**File:** `backend/config/db.php` (table creation), `backend/auth/*.php` (usage)

**parameters:**
| Column | Type | Description |
|--------|------|-------------|
| `id` | INT AUTO_INCREMENT PRIMARY KEY | Unique user identifier |
| `name` | VARCHAR(255) NOT NULL | User's full name |
| `email` | VARCHAR(255) UNIQUE NOT NULL | Email address (login credential) |
| `password` | VARCHAR(255) NOT NULL | Bcrypt hashed password |
| `role` | ENUM('user', 'admin') DEFAULT 'user' | User role |
| `admin_access` | TINYINT(1) DEFAULT 0 | Admin privileges flag (0/1) |
| `is_verified` | TINYINT(1) DEFAULT 0 | Email verification status (0/1) |
| `verification_otp` | VARCHAR(255) | Hashed OTP for email verification |
| `otp_expiry` | DATETIME | OTP expiration timestamp |
| `status` | ENUM('Active', 'Inactive') DEFAULT 'Active' | Account status |
| `failed_login_attempts` | INT DEFAULT 0 | Count of failed login attempts |
| `locked_until` | DATETIME DEFAULT NULL | Account lockout expiry |
| `last_login_at` | DATETIME DEFAULT NULL | Last successful login timestamp |
| `created_at` | TIMESTAMP DEFAULT CURRENT_TIMESTAMP | Account creation timestamp |

**api call:**
```sql
SELECT * FROM users WHERE email = ?;
INSERT INTO users (name, email, password, role, verification_otp, otp_expiry, is_verified) VALUES (?, ?, ?, 'user', ?, ?, 0);
UPDATE users SET is_verified = 1, verification_otp = NULL, otp_expiry = NULL WHERE id = ?;
```

**response:**
```json
{
  "id": 1,
  "name": "John Doe",
  "email": "user@vdartinc.com",
  "role": "user",
  "is_verified": 1
}
```

---

### Table: tools

**Tables included :** 
- `tools` (Tool/software license information)

**table name:** `tools`

**File:** `backend/tools/*.php`, `backend/config/db.php`

**parameters:**
| Column | Type | Description |
|--------|------|-------------|
| `id` | INT AUTO_INCREMENT PRIMARY KEY | Unique tool identifier |
| `year` | INT DEFAULT 2026 | Year of tool record |
| `tool_name` | VARCHAR(255) NOT NULL | Name of the tool/software |
| `type` | VARCHAR(100) DEFAULT 'NA' | Tool type (Job Portal, Development, etc.) |
| `no_of_license` | INT DEFAULT 1 | Number of licenses |
| `resume_views` | INT DEFAULT 0 | Resume view count |
| `job_slots` | INT DEFAULT 0 | Job slot count |
| `bulk_mail` | INT DEFAULT 0 | Bulk mail capability |
| `cost` | DECIMAL(12,2) DEFAULT 0 | Tool cost |
| `revenue` | DECIMAL(12,2) DEFAULT 0 | Revenue generated |
| `monthly_cost` | DECIMAL(12,2) DEFAULT 0 | Monthly cost |
| `quarterly_cost` | DECIMAL(12,2) DEFAULT 0 | Quarterly cost |
| `annual_cost` | DECIMAL(12,2) DEFAULT 0 | Annual cost |
| `currency` | VARCHAR(10) DEFAULT 'USD' | Currency code |
| `geography` | VARCHAR(50) DEFAULT 'USA' | Geographic region |
| `payment_frequency` | VARCHAR(50) DEFAULT 'Monthly' | Payment frequency |
| `last_renewal` | DATE | Last renewal date |
| `next_renewal` | DATE | Next renewal date |
| `comments` | TEXT | Additional comments |
| `spoc_1` | VARCHAR(255) | Internal SPOC |
| `spoc_1_contact` | VARCHAR(255) | SPOC 1 contact number |
| `spoc_1_email` | VARCHAR(255) | SPOC 1 email address |
| `spoc_1_timezone` | VARCHAR(60) | SPOC 1 timezone |
| `spoc_1_best_time` | VARCHAR(100) | SPOC 1 best contact time |
| `spoc_2` | VARCHAR(255) | External SPOC |
| `spoc_2_contact` | VARCHAR(255) | SPOC 2 contact number |
| `spoc_2_email` | VARCHAR(255) | SPOC 2 email address |
| `spoc_2_timezone` | VARCHAR(60) | SPOC 2 timezone |
| `spoc_2_best_time` | VARCHAR(100) | SPOC 2 best contact time |
| `contact_no` | VARCHAR(50) | Contact number |
| `email_id` | VARCHAR(255) | Contact email |
| `status` | ENUM('Active', 'Inactive') DEFAULT 'Active' | Tool status |
| `reason_for_using` | TEXT | Reason for using the tool |
| `deactivation_reason` | TEXT | Reason for deactivation |
| `deleted_at` | DATETIME NULL DEFAULT NULL | Soft delete timestamp |
| `created_at` | TIMESTAMP DEFAULT CURRENT_TIMESTAMP | Record creation |
| `updated_at` | TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE | Last update |

**api call:**
```sql
SELECT * FROM tools WHERE deleted_at IS NULL;
INSERT INTO tools (year, tool_name, type, ...) VALUES (?, ?, ?, ...);
UPDATE tools SET tool_name = ?, ... WHERE id = ?;
DELETE FROM tools WHERE id = ?; -- Soft delete: UPDATE tools SET deleted_at = NOW()
```

**response:**
```json
{
  "id": 1,
  "tool_name": "LinkedIn Premium",
  "type": "Job Portal",
  "annual_cost": "999.00",
  "currency": "USD",
  "geography": "USA",
  "status": "Active"
}
```

---

### Table: email_settings

**Tables included :** 
- `email_settings` (SMTP configuration for notifications)

**table name:** `email_settings`

**File:** `backend/notifications/getEmailSettings.php`, `backend/notifications/getSmtpConfig.php`

**parameters:**
| Column | Type | Description |
|--------|------|-------------|
| `id` | INT AUTO_INCREMENT PRIMARY KEY | Setting ID (always 1) |
| `smtp_host` | VARCHAR(255) | SMTP server hostname |
| `smtp_port` | INT DEFAULT 587 | SMTP port |
| `smtp_username` | VARCHAR(255) | SMTP username (email) |
| `smtp_password_encrypted` | TEXT | Encrypted SMTP password |
| `from_email` | VARCHAR(255) | Sender email address |
| `from_name` | VARCHAR(255) | Sender display name |
| `notification_email` | VARCHAR(255) | Where to send alerts |
| `created_at` | TIMESTAMP DEFAULT CURRENT_TIMESTAMP | Record creation |
| `updated_at` | TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE | Last update |

**api call:**
```sql
SELECT * FROM email_settings WHERE id = 1;
UPDATE email_settings SET smtp_host = ?, smtp_port = ?, ... WHERE id = 1;
```

**response:**
```json
{
  "smtp_host": "smtp.gmail.com",
  "smtp_port": 587,
  "smtp_username": "javid.j@vdartinc.com",
  "from_email": "javid.j@vdartinc.com",
  "from_name": "Tool Management System",
  "notification_email": "javid.j@vdartinc.com"
}
```

---

### Table: password_reset_tokens

**Tables included :** 
- `password_reset_tokens` (Password reset tokens)

**table name:** `password_reset_tokens`

**File:** `backend/auth/resetPassword.php`, `backend/auth/verifyResetToken.php`

**parameters:**
| Column | Type | Description |
|--------|------|-------------|
| `id` | INT AUTO_INCREMENT PRIMARY KEY | Unique token identifier |
| `user_id` | INT NOT NULL | User requesting reset |
| `token` | VARCHAR(255) NOT NULL | Hashed reset token |
| `expires_at` | DATETIME NOT NULL | Token expiration |
| `used_at` | DATETIME DEFAULT NULL | When token was used |
| `created_at` | TIMESTAMP DEFAULT CURRENT_TIMESTAMP | Token creation |

**api call:**
```sql
INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?);
SELECT * FROM password_reset_tokens WHERE token = ? AND used_at IS NULL AND expires_at > NOW();
UPDATE password_reset_tokens SET used_at = NOW() WHERE id = ?;
```

**response:**
```json
{
  "id": 1,
  "user_id": 42,
  "expires_at": "2026-04-30 15:30:00"
}
```

---

### Table: delete_logs

**Tables included :** 
- `delete_logs` (Audit trail for tool delete/restore actions)

**table name:** `delete_logs`

**File:** `backend/tools/deleteTool.php`, `backend/tools/restoreTool.php`, `backend/tools/getDeleteLogs.php`

**parameters:**
| Column | Type | Description |
|--------|------|-------------|
| `id` | INT AUTO_INCREMENT PRIMARY KEY | Unique log identifier |
| `tool_id` | INT NOT NULL | ID of the affected tool |
| `tool_name` | VARCHAR(255) NOT NULL | Name of the tool |
| `action_type` | ENUM('soft_delete', 'permanent_delete', 'restore') | Action performed |
| `deleted_by_id` | INT | User ID who performed action |
| `deleted_by_name` | VARCHAR(255) | Name of user who performed action |
| `created_at` | TIMESTAMP DEFAULT CURRENT_TIMESTAMP | When action occurred |
| `previous_data` | JSON | Snapshot of tool data before action |

**api call:**
```sql
INSERT INTO delete_logs (tool_id, tool_name, action_type, deleted_by_id, deleted_by_name, previous_data) VALUES (?, ?, ?, ?, ?, ?);
SELECT * FROM delete_logs WHERE action_type = ?;
```

**response:**
```json
{
  "id": 1,
  "tool_name": "LinkedIn Premium",
  "action_type": "soft_delete",
  "deleted_by_name": "Admin User",
  "previous_data": "{...}"
}
```

---

### Table: audit_logs

**Tables included :** 
- `audit_logs` (Comprehensive audit trail for all system actions)

**table name:** `audit_logs`

**File:** `backend/middleware/AuditLogger.php`, `backend/auth/*.php`, `backend/tools/*.php`

**parameters:**
| Column | Type | Description |
|--------|------|-------------|
| `id` | INT AUTO_INCREMENT PRIMARY KEY | Unique log identifier |
| `user_id` | INT | User who performed action (NULL for system) |
| `user_email` | VARCHAR(255) | Email of user |
| `action` | VARCHAR(100) NOT NULL | Action name (login_success, user_created, etc.) |
| `details` | TEXT | JSON or text details about action |
| `ip_address` | VARCHAR(45) | IP address of user |
| `user_agent` | VARCHAR(500) | Browser/user agent string |
| `created_at` | TIMESTAMP DEFAULT CURRENT_TIMESTAMP | When action occurred |

**api call:**
```sql
INSERT INTO audit_logs (user_id, user_email, action, details, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?);
SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT ? OFFSET ?;
```

**response:**
```json
{
  "id": 1,
  "user_email": "user@vdartinc.com",
  "action": "user_signup",
  "details": "{\"email\": \"user@vdartinc.com\", \"name\": \"John Doe\"}",
  "ip_address": "127.0.0.1",
  "created_at": "2026-04-30 10:00:00"
}
```

---

## 2. AUTHENTICATION API ENDPOINTS

### Login API

**Tables included :** 
- `users`

**table name:** `users`

**File:** `backend/auth/login.php`

**parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `email` | string | Yes | User's email address |
| `password` | string | Yes | User's password |

**api call:**
```http
POST /auth/login.php
Content-Type: application/json
X-CSRF-Token: <token>

{
  "email": "user@vdartinc.com",
  "password": "SecurePass123!"
}
```

**response:**
Success (200):
```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "user@vdartinc.com",
    "role": "user"
  },
  "csrf_token": "abc123..."
}
```

Error (400/401/403):
```json
{
  "error": "Invalid credentials"
}
```

---

### Signup API

**Tables included :** 
- `users`
- `email_settings`

**table name:** `users`

**File:** `backend/auth/signup.php`

**parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes | User's full name |
| `email` | string | Yes | Email (must be @vdartinc.com or @vdartdigital.com) |
| `password` | string | Yes | Min 8 chars, uppercase, lowercase, number, special char |

**api call:**
```http
POST /auth/signup.php
Content-Type: application/json
X-CSRF-Token: <token>

{
  "name": "John Doe",
  "email": "user@vdartinc.com",
  "password": "SecurePass123!"
}
```

**response:**
Success (200):
```json
{
  "success": true,
  "verify_required": true,
  "message": "Account created. Please verify your email with the OTP sent to your email.",
  "user": {
    "id": 42,
    "email": "user@vdartinc.com"
  }
}
```

Error (400/409/429/503):
```json
{
  "error": "Unable to send verification email. Please try again later or contact administrator."
}
```

---

### Verify OTP API

**Tables included :** 
- `users`
- `email_settings`

**table name:** `users`

**File:** `backend/auth/verifyOTP.php`

**parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `email` | string | Yes | User's email address |
| `otp` | string | Yes | 6-digit OTP code |

**api call:**
```http
POST /auth/verifyOTP.php
Content-Type: application/json

{
  "email": "user@vdartinc.com",
  "otp": "123456"
}
```

**response:**
Success (200):
```json
{
  "success": true,
  "message": "Email verified successfully! You can now login.",
  "user": {
    "id": 42,
    "name": "John Doe",
    "email": "user@vdartinc.com",
    "role": "user"
  },
  "csrf_token": "abc123..."
}
```

Error (400/404/429):
```json
{
  "error": "Invalid OTP. Please try again."
}
```

---

### Resend OTP API

**Tables included :** 
- `users`
- `email_settings`

**table name:** `users`

**File:** `backend/auth/resendOTP.php`

**parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `email` | string | Yes | User's email address |

**api call:**
```http
POST /auth/resendOTP.php
Content-Type: application/json

{
  "email": "user@vdartinc.com"
}
```

**response:**
Success (200):
```json
{
  "success": true,
  "message": "New OTP sent to your email. OTP expires in 10 minutes."
}
```

Error (400/404/429):
```json
{
  "error": "Failed to send OTP email. Please try again."
}
```

---

### Check Auth API

**Tables included :** 
- `users`

**table name:** `users`

**File:** `backend/auth/check.php`

**parameters:** None (uses session)

**api call:**
```http
GET /auth/check.php
```

**response:**
Success (200):
```json
{
  "authenticated": true,
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "user@vdartinc.com",
    "role": "user"
  }
}
```

Not authenticated:
```json
{
  "authenticated": false
}
```

---

### Logout API

**Tables included :** 
- `audit_logs`

**table name:** `audit_logs`

**File:** `backend/auth/logout.php`

**parameters:** None

**api call:**
```http
POST /auth/logout.php
```

**response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### Get Users API (Admin)

**Tables included :** 
- `users`

**table name:** `users`

**File:** `backend/auth/getUsers.php`

**parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `status` | string | No | Filter by status (all/Active/Inactive) |

**api call:**
```http
GET /auth/getUsers.php?status=Active
X-CSRF-Token: <token>
```

**response:**
```json
{
  "users": [
    {
      "id": 1,
      "name": "John Doe",
      "email": "user@vdartinc.com",
      "role": "user",
      "status": "Active",
      "is_verified": 1,
      "last_login_at": "2026-04-30 10:00:00"
    }
  ]
}
```

---

### Get Audit Logs API (Admin)

**Tables included :** 
- `audit_logs`

**table name:** `audit_logs`

**File:** `backend/auth/getAuditLogs.php`

**parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `action` | string | No | Filter by action type |
| `user_id` | int | No | Filter by user |
| `date_from` | string | No | Start date |
| `date_to` | string | No | End date |
| `page` | int | No | Page number |
| `limit` | int | No | Records per page |

**api call:**
```http
GET /auth/getAuditLogs.php?page=1&limit=50
X-CSRF-Token: <token>
```

**response:**
```json
{
  "logs": [
    {
      "id": 1,
      "user_email": "user@vdartinc.com",
      "action": "user_signup",
      "details": "{\"email\": \"user@vdartinc.com\", \"name\": \"John Doe\"}",
      "ip_address": "127.0.0.1",
      "created_at": "2026-04-30 10:00:00"
    }
  ],
  "total": 100
}
```

---

### Get Activity Logs API

**Tables included :** 
- `audit_logs`

**table name:** `audit_logs`

**File:** `backend/auth/getActivityLogs.php`

**parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `action` | string | No | Filter by action type |
| `date_from` | string | No | Start date |
| `date_to` | string | No | End date |
| `page` | int | No | Page number |

**api call:**
```http
GET /auth/getActivityLogs.php?page=1
X-CSRF-Token: <token>
```

**response:**
```json
{
  "logs": [
    {
      "id": 1,
      "user_name": "John Doe",
      "user_email": "user@vdartinc.com",
      "user_role": "user",
      "action": "login_success",
      "details": "Login successful",
      "ip_address": "127.0.0.1",
      "created_at": "2026-04-30 10:00:00"
    }
  ]
}
```

---

### Admin Reset Password API

**Tables included :** 
- `users`
- `password_reset_tokens`

**table name:** `users`, `password_reset_tokens`

**File:** `backend/auth/adminResetPassword.php`

**parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `action` | string | Yes | "create_user" or "send_reset_link" |
| `name` | string | Conditional | Required for create_user |
| `email` | string | Yes | User's email |
| `role` | string | No | Role for new user |
| `user_id` | int | Conditional | Required for send_reset_link |

**api call:**
```http
POST /auth/adminResetPassword.php
Content-Type: application/json
X-CSRF-Token: <token>

{
  "action": "create_user",
  "name": "New User",
  "email": "newuser@vdartinc.com",
  "role": "user"
}
```

**response:**
```json
{
  "success": true,
  "message": "User created and reset link sent",
  "user": {
    "id": 43,
    "email": "newuser@vdartinc.com"
  }
}
```

---

### Toggle User Status API (Admin)

**Tables included :** 
- `users`

**table name:** `users`

**File:** `backend/auth/toggleUserStatus.php`

**parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_id` | int | Yes | User ID |
| `action` | string | Yes | activate/deactivate/promote |

**api call:**
```http
POST /auth/toggleUserStatus.php
Content-Type: application/json
X-CSRF-Token: <token>

{
  "user_id": 42,
  "action": "deactivate"
}
```

**response:**
```json
{
  "success": true,
  "message": "User deactivated"
}
```

---

### Set Admin Access API (Admin)

**Tables included :** 
- `users`

**table name:** `users`

**File:** `backend/auth/setAdminAccess.php`

**parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_id` | int | Yes | User ID |
| `grant_admin` | boolean | Yes | true to grant, false to revoke |

**api call:**
```http
POST /auth/setAdminAccess.php
Content-Type: application/json
X-CSRF-Token: <token>

{
  "user_id": 42,
  "grant_admin": true
}
```

**response:**
```json
{
  "success": true,
  "message": "Admin access granted"
}
```

---

### Get CSRF Token API

**Tables included :** 
- None

**table name:** N/A

**File:** `backend/auth/getCsrfToken.php`

**parameters:** None

**api call:**
```http
GET /auth/getCsrfToken.php
```

**response:**
```json
{
  "csrf_token": "abc123..."
}
```

---

### Request Password Reset API

**Tables included :** 
- `users`
- `password_reset_tokens`

**table name:** `password_reset_tokens`

**File:** `backend/auth/resetPassword.php`

**parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `action` | string | Yes | "request" |
| `email` | string | Yes | User's email |

**api call:**
```http
POST /auth/resetPassword.php
Content-Type: application/json

{
  "action": "request",
  "email": "user@vdartinc.com"
}
```

**response:**
Success (200):
```json
{
  "success": true,
  "message": "Password reset link sent to your email"
}
```

---

### Verify Reset Token & Set Password API

**Tables included :** 
- `users`
- `password_reset_tokens`

**table name:** `users`, `password_reset_tokens`

**File:** `backend/auth/verifyResetToken.php` OR `backend/auth/resetPassword.php` (action: "reset")

**parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `email` | string | Yes | User's email |
| `token` | string | Yes | Reset token |
| `new_password` | string | Yes | New password |
| `confirm_password` | string | Yes | Confirm new password |

**api call:**
```http
POST /auth/verifyResetToken.php
Content-Type: application/json

{
  "email": "user@vdartinc.com",
  "token": "abc123...",
  "new_password": "NewPass123!",
  "confirm_password": "NewPass123!"
}
```

**response:**
```json
{
  "success": true,
  "message": "Password reset successfully"
}
```

---

## 3. TOOLS API ENDPOINTS

### Get Tools API

**Tables included :** 
- `tools`

**table name:** `tools`

**File:** `backend/tools/getTools.php`

**parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | int | No | Page number (default: 1) |
| `limit` | int | No | Records per page (default: 50) |
| `status` | string | No | Filter by status (All/Active/Inactive) |

**api call:**
```http
GET /tools/getTools.php?page=1&limit=50&status=Active
X-CSRF-Token: <token>
```

**response:**
```json
{
  "tools": [
    {
      "id": 1,
      "tool_name": "LinkedIn Premium",
      "type": "Job Portal",
      "annual_cost": "999.00",
      "currency": "USD",
      "geography": "USA",
      "status": "Active",
      "next_renewal": "2026-05-15"
    }
  ],
  "total": 45,
  "page": 1,
  "limit": 50
}
```

---

### Get Tools For Portal API

**Tables included :** 
- `tools`

**table name:** `tools`

**File:** `backend/tools/getToolsForPortal.php`

**parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `year` | int | No | Filter by year |
| `status` | string | No | Filter by status |

**api call:**
```http
GET /tools/getToolsForPortal.php?year=2026
X-CSRF-Token: <token>
```

**response:**
```json
{
  "tools": [
    {
      "id": 1,
      "tool_name": "LinkedIn Premium",
      "type": "Job Portal",
      "annual_cost": "999.00",
      "revenue": "5000.00",
      "geography": "USA"
    }
  ],
  "summary": {
    "total_tools": 10,
    "total_cost": "10000.00",
    "total_revenue": "50000.00",
    "expiring_tools": 2
  },
  "years": [2024, 2025, 2026],
  "types": ["Job Portal", "Development"]
}
```

---

### Add Tool API (Admin)

**Tables included :** 
- `tools`
- `audit_logs`

**table name:** `tools`

**File:** `backend/tools/addTool.php`

**parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tool_name` | string | Yes | Name of tool |
| `type` | string | Yes | Tool type |
| `year` | int | No | Year (default: 2026) |
| `geography` | string | No | Region (default: USA) |
| `annual_cost` | decimal | No | Annual cost |
| `currency` | string | No | Currency (USD/INR/MYR/AED/EUR/GBP/CAD) |
| `last_renewal` | date | No | Last renewal date |
| `next_renewal` | date | No | Next renewal date |
| `spoc_1` | string | No | Internal SPOC |
| `email_id` | string | No | Contact email |
| ... | ... | No | (20+ fields available) |

**api call:**
```http
POST /tools/addTool.php
Content-Type: application/json
X-CSRF-Token: <token>

{
  "tool_name": "New Tool",
  "type": "Analytics",
  "year": 2026,
  "annual_cost": 500.00,
  "currency": "USD",
  "geography": "USA",
  "status": "Active"
}
```

**response:**
```json
{
  "success": true,
  "message": "Tool added successfully",
  "tool_id": 15
}
```

---

### Update Tool API (Admin)

**Tables included :** 
- `tools`
- `delete_logs` (stores previous data)
- `audit_logs`

**table name:** `tools`

**File:** `backend/tools/updateTool.php`

**parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | int | Yes | Tool ID to update |
| `tool_name` | string | Yes | Name of tool |
| ... | ... | No | (All tool fields) |

**api call:**
```http
POST /tools/updateTool.php
Content-Type: application/json
X-CSRF-Token: <token>

{
  "id": 15,
  "tool_name": "Updated Tool",
  "annual_cost": 600.00
}
```

**response:**
```json
{
  "success": true,
  "message": "Tool updated successfully"
}
```

---

### Delete Tool API (Admin - Soft Delete)

**Tables included :** 
- `tools` (sets deleted_at)
- `delete_logs`
- `audit_logs`

**table name:** `tools`

**File:** `backend/tools/deleteTool.php`

**parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | int | Yes | Tool ID to delete |

**api call:**
```http
POST /tools/deleteTool.php
Content-Type: application/json
X-CSRF-Token: <token>

{
  "id": 15
}
```

**response:**
```json
{
  "success": true,
  "message": "Tool deleted successfully"
}
```

---

### Get Recycle Bin API

**Tables included :** 
- `tools` (where deleted_at IS NOT NULL)

**table name:** `tools`

**File:** `backend/tools/getRecycleBin.php`

**parameters:** None

**api call:**
```http
GET /tools/getRecycleBin.php
X-CSRF-Token: <token>
```

**response:**
```json
{
  "tools": [
    {
      "id": 15,
      "tool_name": "Deleted Tool",
      "deleted_at": "2026-04-30 10:00:00",
      "days_since_deleted": 2
    }
  ]
}
```

---

### Restore Tool API (Admin)

**Tables included :** 
- `tools` (clears deleted_at)
- `delete_logs`
- `audit_logs`

**table name:** `tools`

**File:** `backend/tools/restoreTool.php`

**parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | int | Yes | Tool ID to restore |

**api call:**
```http
POST /tools/restoreTool.php
Content-Type: application/json
X-CSRF-Token: <token>

{
  "id": 15
}
```

**response:**
```json
{
  "success": true,
  "message": "Tool restored successfully"
}
```

---

### Permanent Delete Tool API (Admin)

**Tables included :** 
- `tools` (permanent removal)
- `delete_logs`
- `audit_logs`

**table name:** `tools`

**File:** `backend/tools/permanentDeleteTool.php`

**parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | int | Yes | Tool ID to permanently delete |

**api call:**
```http
DELETE /tools/permanentDeleteTool.php
Content-Type: application/json
X-CSRF-Token: <token>

{
  "id": 15
}
```

**response:**
```json
{
  "success": true,
  "message": "Tool permanently deleted"
}
```

---

### Get Delete Logs API

**Tables included :** 
- `delete_logs`

**table name:** `delete_logs`

**File:** `backend/tools/getDeleteLogs.php`

**parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `action` | string | No | Filter by action (all/soft_delete/restore) |
| `date_from` | string | No | Start date |
| `date_to` | string | No | End date |

**api call:**
```http
GET /tools/getDeleteLogs.php?action=soft_delete
X-CSRF-Token: <token>
```

**response:**
```json
{
  "logs": [
    {
      "id": 1,
      "tool_name": "Deleted Tool",
      "action_type": "soft_delete",
      "deleted_by_name": "Admin User",
      "created_at": "2026-04-30 10:00:00",
      "previous_data": "{...}"
    }
  ],
  "total": 10,
  "soft_delete": 6,
  "restore": 3,
  "permanent_delete": 1
}
```

---

## 4. PORTAL API ENDPOINTS

### Get Portal Stats API

**Tables included :** 
- `tools`

**table name:** `tools`

**File:** `backend/portal/getPortalStats.php`

**parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `year` | int | No | Filter by year |
| `month` | int | No | Filter by month (1-12) |
| `geography` | string | No | Filter by region |

**api call:**
```http
GET /portal/getPortalStats.php?year=2026&month=4&geography=USA
X-CSRF-Token: <token>
```

**response:**
```json
{
  "tools": [
    {
      "id": 1,
      "tool_name": "LinkedIn Premium",
      "type": "Job Portal",
      "annual_cost": "999.00",
      "revenue": "5000.00",
      "geography": "USA"
    }
  ],
  "summary": {
    "total_tools": 10,
    "total_cost": "10000.00",
    "total_revenue": "50000.00",
    "total_closures": 50,
    "total_starts": 100,
    "avg_roi": "400.00"
  },
  "expiring_this_month": 2
}
```

---

## 5. NOTIFICATIONS API ENDPOINTS

### Get Alerts API

**Tables included :** 
- `tools`

**table name:** `tools`

**File:** `backend/notifications/getAlerts.php`

**parameters:** None

**api call:**
```http
GET /notifications/getAlerts.php
X-CSRF-Token: <token>
```

**response:**
```json
{
  "this_month": [
    {
      "id": 1,
      "tool_name": "LinkedIn Premium",
      "next_renewal": "2026-04-15",
      "days_until_renewal": 5
    }
  ],
  "next_30_days": [...],
  "next_7_days": [...]
}
```

---

### Test Email API (Admin)

**Tables included :** 
- `email_settings`

**table name:** `email_settings`

**File:** `backend/notifications/testEmail.php`

**parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `email` | string | Yes | Email to send test to |

**api call:**
```http
POST /notifications/testEmail.php
Content-Type: application/json
X-CSRF-Token: <token>

{
  "email": "javid.j@vdartinc.com"
}
```

**response:**
```json
{
  "success": true,
  "message": "Test email sent successfully"
}
```

---

### Send Auto Reminders API (Admin)

**Tables included :** 
- `email_settings`

**table name:** `email_settings`

**File:** `backend/notifications/testEmail.php`

**parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `email` | string | Yes | Email to send test to |

**api call:**
```http
POST /notifications/testEmail.php
Content-Type: application/json
X-CSRF-Token: <token>

{
  "email": "javid.j@vdartinc.com"
}
```

**response:**
```json
{
  "success": true,
  "message": "Test email sent successfully"
}
```

---

### Send Auto Reminders API (Admin)

**Tables included :** 
- `tools`
- `email_settings`

**table name:** `tools`

**File:** `backend/notifications/sendAutoReminders.php`

**parameters:** None

**api call:**
```http
POST /notifications/sendAutoReminders.php
X-CSRF-Token: <token>
```

**response:**
```json
{
  "success": true,
  "message": "Reminders sent",
  "sent": 5,
  "failed": 0
}
```

---

### Send Tool Reminder API

**Tables included :** 
- `tools`
- `email_settings`

**table name:** `tools`

**File:** `backend/notifications/sendToolReminder.php`

**parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tool_id` | int | Yes | Tool ID to send reminder for |

**api call:**
```http
POST /notifications/sendToolReminder.php
Content-Type: application/json
X-CSRF-Token: <token>

{
  "tool_id": 1
}
```

**response:**
```json
{
  "success": true,
  "message": "Reminder sent successfully"
}
```

---

### Get SMTP Config (Helper Function)

**Tables included :** 
- `email_settings`

**table name:** `email_settings`

**File:** `backend/notifications/getSmtpConfig.php`

**parameters:** None (internal helper function)

**api call:**
```php
$smtpConfig = getSmtpConfig();
```

**response:**
```php
[
  'smtp_host' => 'smtp.gmail.com',
  'smtp_port' => 587,
  'smtp_username' => 'javid.j@vdartinc.com',
  'smtp_password' => 'dnyn lfep avwr cxwx',
  'from_email' => 'javid.j@vdartinc.com',
  'from_name' => 'Tool Management System',
  'notification_email' => 'javid.j@vdartinc.com'
]
```

---

## 6. FRONTEND PAGES

### Landing Page

**Tables included :** 
- None (public page)

**table name:** N/A

**File:** `frontend/src/pages/Auth/Landing.js`

**parameters:** None

**api call:** None (displays static content)

**response:** Renders landing page with:
- Hero section
- Statistics (Tools Managed, Active Users, Renewal Success)
- Feature cards
- Login/Signup CTA buttons

---

### Login Page

**Tables included :** 
- `users`

**table name:** `users`

**File:** `frontend/src/pages/Auth/Login.js`

**parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `email` | string | Yes | User's email |
| `password` | string | Yes | User's password |

**api call:**
```javascript
api.login(email, password)
// -> POST /auth/login.php
```

**response:**
Success: Redirects to `/dashboard`
Error: Displays error message

---

### Signup Page

**Tables included :** 
- `users`
- `email_settings`

**table name:** `users`

**File:** `frontend/src/pages/Auth/Signup.js`

**parameters (Step 1):**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes | Full name |
| `email` | string | Yes | Email address |
| `password` | string | Yes | Password |

**parameters (Step 2 - OTP Verification):**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `otp` | string | Yes | 6-digit OTP |

**api call:**
```javascript
// Step 1
api.signup(name, email, password)
// -> POST /auth/signup.php

// Step 2
api.verifyOTP(email, otp)
// -> POST /auth/verifyOTP.php

// Resend OTP
api.resendOTP(email)
// -> POST /auth/resendOTP.php
```

**response:**
Step 1 Success: Moves to Step 2 (OTP input)
Step 2 Success: Redirects to `/login` after 2 seconds
Error: Displays error message

---

### Reset Password Page

**Tables included :** 
- `users`
- `password_reset_tokens`

**table name:** `password_reset_tokens`

**File:** `frontend/src/pages/Auth/ResetPassword.js`

**parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `email` | string | Yes | User's email (from URL) |
| `token` | string | Yes | Reset token (from URL) |
| `new_password` | string | Yes | New password |
| `confirm_password` | string | Yes | Confirm new password |

**api call:**
```javascript
api.verifyResetToken(email, token, newPassword, confirmPassword)
// -> POST /auth/verifyResetToken.php
```

**response:**
Success: Redirects to `/login`
Error: Displays error message

---

### Dashboard Layout

**Tables included :** 
- `users` (for user info in sidebar)

**table name:** `users`

**File:** `frontend/src/components/Layout.js`

**parameters:** None (wrapper component)

**api call:**
```javascript
api.checkAuth()
// -> GET /auth/check.php
```

**response:** Renders sidebar + navbar + content area

---

### Tool Management Page

**Tables included :** 
- `tools`

**table name:** `tools`

**File:** `frontend/src/pages/Dashboard/ToolManagement.js`

**parameters (Filters):**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | int | No | Page number |
| `status` | string | No | Active/Inactive filter |

**api call:**
```javascript
api.getTools(page, limit, status)
// -> GET /tools/getTools.php

api.addTool(toolData)
// -> POST /tools/addTool.php

api.updateTool(toolData)
// -> POST /tools/updateTool.php

api.deleteTool(id)
// -> POST /tools/deleteTool.php
```

**response:** Renders tool table, modals for add/edit, CSV export

---

### Portal Analysis Page


**Tables included :** 
- `tools`

**table name:** `tools`

**File:** `frontend/src/pages/Dashboard/PortalAnalysis.js`

**parameters (Filters):**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `year` | int | No | Filter by year |
| `month` | int | No | Filter by month |
| `geography` | string | No | Filter by region |

**api call:**
```javascript
api.getPortalStats({year, month, geography})
// -> GET /portal/getPortalStats.php

api.getToolsForPortal({year, status})
// -> GET /tools/getToolsForPortal.php
```

**response:** Renders KPI cards, charts (Cost/Revenue/ROI), tool table

---

### Email Settings Page (Admin)

**Tables included :** 
- `email_settings`

**table name:** `email_settings`

**File:** `frontend/src/pages/Dashboard/EmailSettings.js`

**parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `smtp_host` | string | Yes | SMTP server |
| `smtp_port` | int | Yes | SMTP port |
| `smtp_username` | string | Yes | SMTP username |
| `smtp_password` | string | No | App Password |
| ... | ... | ... | ... |

**api call:**
```javascript
api.getEmailSettings()
// -> GET /notifications/getEmailSettings.php

api.updateEmailSettings(settings)
// -> POST /notifications/getEmailSettings.php

api.sendTestEmail(email)
// -> POST /notifications/testEmail.php
```

**response:** Renders SMTP config form, test email button

---

### History Logs Page

**Tables included :** 
- `tools` (Recycle Bin)
- `delete_logs`
- `audit_logs`

**table name:** `delete_logs`, `audit_logs`

**File:** `frontend/src/pages/Dashboard/HistoryLogs.js`

**parameters (Filters):**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `action` | string | No | Filter by action |
| `date_from` | string | No | Start date |
| `date_to` | string | No | End date |

**api call:**
```javascript
api.getRecycleBin()
// -> GET /tools/getRecycleBin.php

api.getDeleteLogs(filters)
// -> GET /tools/getDeleteLogs.php

api.getActivityLogs(filters)
// -> GET /auth/getActivityLogs.php

api.restoreTool(id)
// -> POST /tools/restoreTool.php
```

**response:** Renders three tabs: Recycle Bin, Delete Logs, Activity Log

---

### User Management Page (Admin)

**Tables included :** 
- `users`
- `audit_logs`

**table name:** `users`

**File:** `frontend/src/pages/Dashboard/UserManagement.js`

**parameters (Filters):**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `status` | string | No | All/Active/Inactive |

**api call:**
```javascript
api.getUsers(status)
// -> GET /auth/getUsers.php

api.createUser(userData)
// -> POST /auth/adminResetPassword.php (action: create_user)

api.toggleUserStatus(userId, action)
// -> POST /auth/toggleUserStatus.php

api.setAdminAccess(userId, grantAdmin)
// -> POST /auth/setAdminAccess.php

api.adminResetPassword(userId)
// -> POST /auth/adminResetPassword.php (action: send_reset_link)
```

**response:** Renders user table with admin actions

---

## 7. EMAIL TEMPLATES

### OTP Verification Email

**File:** `backend/PHPMailer/sendEmail.php` (method: `sendOTPEmail()`)

**Triggered by:** 
- `backend/auth/signup.php`
- `backend/auth/resendOTP.php`

**Tables included :** 
- `users` (gets name, email)
- `email_settings` (SMTP config)

**parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `to` | string | Recipient email |
| `otp` | string | 6-digit OTP code |
| `name` | string | User's name |

**api call (internal):**
```php
$mailer->sendOTPEmail($email, $otp, $name);
```

**response:**
- Subject: `Verify Your Account - OTP for Tool Management System`
- Body: Contains OTP code, expires in 10 minutes

---

### Welcome/Registration Complete Email

**File:** `backend/PHPMailer/sendEmail.php` (method: `sendRegistrationCompleteEmail()`)

**Triggered by:** 
- `backend/auth/verifyOTP.php` (after OTP verification)

**Tables included :** 
- `users` (gets name, email)
- `email_settings` (SMTP config)

**parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `to` | string | Recipient email |
| `name` | string | User's name |

**api call (internal):**
```php
$mailer->sendRegistrationCompleteEmail($email, $user['name']);
```

**response:**
- Subject: `Welcome to Tool Management System - Registration Complete`
- Body: Account verified, can now login, date in MM/DD/YYYY format

---

### Password Reset Email

**File:** `backend/PHPMailer/sendEmail.php` (method: `send()` via `resetPassword.php`)

**Triggered by:** 
- `backend/auth/resetPassword.php` (action: "request")
- `backend/auth/adminResetPassword.php` (action: "send_reset_link")

**Tables included :** 
- `users`
- `password_reset_tokens`
- `email_settings`

**parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `to` | string | Recipient email |
| `token` | string | Reset token |
| `name` | string | User's name (for admin resets) |

**api call (internal):**
```php
$mailer->send($email, "Password Reset", $body);
```

**response:**
- Subject: `Password Reset Request - Tool Management System`
- Body: Reset link (valid 1 hour), initiated by admin notification

### Admin Notification Email

**File:** `backend/PHPMailer/sendEmail.php` (method: `sendAdminNotification()`)

**Triggered by:** 
- `backend/auth/signup.php`

**Tables included :** 
- `email_settings` (SMTP config)

**parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `adminEmail` | string | Administrator's email address |
| `newUserEmail` | string | Email of the newly registered user |
| `newUserName` | string | Name of the newly registered user |

**api call (internal):**
```php
$mailer->sendAdminNotification($adminEmail, $newUserEmail, $newUserName);
```

**response:**
- Subject: `New User Registration - <user_email>`
- Body: Notifies administrator about a new user registration with name and timestamp

---

### Renewal Reminder Email

**File:** `backend/PHPMailer/sendEmail.php` (method: `sendRenewalReminder()`)

**Triggered by:** 
- `backend/notifications/sendToolReminder.php`
- `backend/notifications/sendAutoReminders.php`

**Tables included :** 
- `tools`
- `email_settings`

**parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `to` | string | Recipient email |
| `tool` | array | Tool details (name, dates, cost, etc.) |

**api call (internal):**
```php
$mailer->sendRenewalReminder($email, $toolData);
```

**response:**
- Subject: `Renewal Reminder: [Tool Name]`
- Body: Tool details, days remaining, dates in MM/DD/YYYY format

---

### Test Email

**File:** `backend/PHPMailer/sendEmail.php` (method: `sendTest()`)

**Triggered by:** 
- `backend/notifications/testEmail.php`

**Tables included :** 
- `email_settings`

**parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `to` | string | Recipient email |

**api call (internal):**
```php
$mailer->sendTest($email);
```

**response:**
- Subject: `Test Email from Tool Management System`
- Body: Confirmation that SMTP is configured correctly

---

## 8. SUPPORTING FILES

### Security Middleware

**Tables included :** 
- `users` (rate limiting)
- `audit_logs` (logging)

**table name:** `users`, `audit_logs`

**File:** `backend/middleware/security.php`

**parameters:** N/A (class with static methods)

**api call (internal usage):**
```php
Security::initSession();
Security::validateCsrfToken($token);
Security::validateEmail($email);
Security::validatePasswordStrength($password);
Security::checkRateLimit($identifier);
Security::encrypt($data);
Security::decrypt($data);
```

**response:** Various (validation results, encrypted/decrypted data)

---

### Email Sender Class

**Tables included :** 
- `email_settings` (via getSmtpConfig())

**table name:** `email_settings`

**File:** `backend/PHPMailer/sendEmail.php`

**parameters (constructor):**
| Parameter | Type | Description |
|-----------|------|-------------|
| `config` | array | SMTP configuration array |

**api call (internal usage):**
```php
$mailer = new SendEmail($smtpConfig);
$mailer->send($to, $subject, $body);
$mailer->sendOTPEmail($to, $otp, $name);
$mailer->sendRegistrationCompleteEmail($to, $name);
$mailer->sendRenewalReminder($to, $tool);
$mailer->sendTest($to);
```

**response:**
```json
{
  "success": true,
  "message": "Email sent successfully"
}
```

---

### Database Config

**Tables included :** 
- All tables (creates if not exists)

**table name:** All tables

**File:** `backend/config/db.php`

**parameters:** N/A (initializes $pdo global)

**api call (internal usage):**
```php
global $pdo; // Access database connection
```

**response:** PDO database connection object

---

### CORS Middleware

**Tables included :** 
- None

**table name:** N/A

**File:** `backend/middleware/CorsMiddleware.php`

**parameters:** None

**api call (internal usage):**
```php
CorsMiddleware::handle();
```

**response:** Sets CORS headers

---

### Audit Logger

**Tables included :** 
- `audit_logs`

**table name:** `audit_logs`

**File:** `backend/middleware/AuditLogger.php`

**parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `action` | string | Action name |
| `details` | array | Action details |
| `user_id` | int | User ID |
| `user_email` | string | User email |

**api call (internal usage):**
```php
AuditLogger::log('user_signup', ['email' => $email], $userId, $email);
```

**response:** Logs entry to `audit_logs` table

---

## 9. USER ROLES & PERMISSIONS

**Tables included :** 
- `users`

**table name:** `users`

**File:** `backend/middleware/security.php` (role permissions mapping)

**parameters:**

| Permission | Admin | Editor | Viewer | User |
|------------|-------|--------|---------|------|
| `view_tools` | ✅ | ✅ | ✅ | ✅ |
| `add_tools` | ✅ | ✅ | ❌ | ❌ |
| `edit_tools` | ✅ | ✅ | ❌ | ❌ |
| `delete_tools` | ✅ | ❌ | ❌ | ❌ |
| `view_portal` | ✅ | ✅ | ✅ | ✅ |
| `manage_users` | ✅ | ❌ | ❌ | ❌ |
| `email_settings` | ✅ | ❌ | ❌ | ❌ |
| `view_alerts` | ✅ | ✅ | ✅ | ✅ |

**api call (check permission):**
```php
Security::hasPermission('add_tools');
Security::isAdmin();
```

**response:**
```json
{
  "allowed": true // or false
}
```

---

## 10. FRONTEND ROUTING

**Tables included :** 
- `users` (for auth checks)

**table name:** `users`

**File:** `frontend/src/App.js`

**parameters:**

| Path | Component | Protection | Description |
|------|-----------|-------------|-------------|
| `/` | `Landing` | Public | Landing/marketing page |
| `/login` | `Login` | Public | User login form |
| `/signup` | `Signup` | Public | Registration + OTP |
| `/reset-password` | `ResetPassword` | Public | Password reset |
| `/dashboard` | `Layout` | Private | Dashboard wrapper |
| `/dashboard/portal-analysis` | `PortalAnalysis` | Private | Analytics |
| `/dashboard/tool-management` | `ToolManagement` | Private | Tool CRUD |
| `/dashboard/email-settings` | `EmailSettings` | Private + Admin | SMTP config |
| `/dashboard/history-logs` | `HistoryLogs` | Private | Logs |
| `/dashboard/user-management` | `UserManagement` | Private + Admin | User admin |

**api call (routing check):**
```javascript
<Route path="/dashboard" element={<ProtectedRoute />}>
  <Route index element={<ToolManagement />} />
  <Route path="tool-management" element={<ToolManagement />} />
  ...
</Route>
```

**response:** Renders appropriate component based on route

---

## 11. API SERVICE METHODS

**Tables included :** 
- All tables (via backend API calls)

**table name:** All tables

**File:** `frontend/src/services/api.js`

**parameters:** See individual API sections above.

**api call (usage):**
```javascript
import api from './services/api';

// Auth
await api.signup(name, email, password);
await api.login(email, password);
await api.verifyOTP(email, otp);

// Tools
await api.getTools(page, limit, status);
await api.addTool(toolData);

// Portal
await api.getPortalStats(filters);

// Notifications
await api.getEmailSettings();
await api.sendTestEmail(email);
```

**response:** See individual API endpoint responses above.

---

## 12. FILE STRUCTURE REFERENCE

```
C:\xampp\htdocs\new project\
│
├── backend\
│   ├── auth\ (14 files)
│   │   ├── login.php
│   │   ├── signup.php
│   │   ├── verifyOTP.php
│   │   ├── resendOTP.php
│   │   ├── resetPassword.php
│   │   ├── verifyResetToken.php
│   │   ├── check.php
│   │   ├── logout.php
│   │   ├── getUsers.php
│   │   ├── getAuditLogs.php
│   │   ├── getActivityLogs.php
│   │   ├── adminResetPassword.php
│   │   ├── toggleUserStatus.php
│   │   ├── setAdminAccess.php
│   │   └── getCsrfToken.php
│   │
│   ├── tools\ (9 files)
│   │   ├── getTools.php
│   │   ├── getToolsForPortal.php
│   │   ├── addTool.php
│   │   ├── updateTool.php
│   │   ├── deleteTool.php
│   │   ├── getRecycleBin.php
│   │   ├── restoreTool.php
│   │   ├── permanentDeleteTool.php
│   │   └── getDeleteLogs.php
│   │
│   ├── portal\ (1 file)
│   │   └── getPortalStats.php
│   │
│   ├── notifications\ (6 files)
│   │   ├── getAlerts.php
│   │   ├── getEmailSettings.php
│   │   ├── testEmail.php
│   │   ├── sendAutoReminders.php
│   │   ├── sendToolReminder.php
│   │   └── getSmtpConfig.php
│   │
│   ├── middleware\ (3 files)
│   │   ├── security.php
│   │   ├── CorsMiddleware.php
│   │   └── AuditLogger.php
│   │
│   ├── config\
│   │   └── db.php
│   │
│   ├── PHPMailer\
│   │   ├── sendEmail.php
│   │   └── src\ (PHPMailer library)
│   │
│   └── database.sql
│
├── frontend\
│   └── src\
│       ├── pages\
│       │   ├── Auth\ (4 files)
│       │   │   ├── Landing.js
│       │   │   ├── Login.js
│       │   │   ├── Signup.js
│       │   │   └── ResetPassword.js
│       │   │
│       │   └── Dashboard\ (5 files)
│       │       ├── ToolManagement.js
│       │       ├── PortalAnalysis.js
│       │       ├── EmailSettings.js
│       │       ├── HistoryLogs.js
│       │       └── UserManagement.js
│       │
│       ├── services\
│       │   └── api.js
│       │
│       ├── components\
│       │   └── Layout.js
│       │
│       └── App.js
│
├── private\
│   └── encryption.key (600 permissions)
│
├── update_smtp.sql
├── database.sql
└── DEVELOPER_DOCS.md (this file)
```

---

## 13. SECURITY FEATURES SUMMARY

| Feature | Implementation | Location |
|---------|-----------------|----------|
| **Password Hashing** | BCRYPT cost 12 | `password_hash()` in signup.php |
| **OTP Hashing** | BCRYPT | `password_hash()` in signup.php |
| **CSRF Protection** | Token validation | `Security::validateCsrfToken()` |
| **Rate Limiting** | File-based JSON | `Security::checkRateLimit()` |
| **SMTP Encryption** | AES-256-CBC | `Security::encrypt/decrypt()` |
| **Input Validation** | Multiple methods | `Security::validate*()` methods |
| **Session Security** | HttpOnly, Secure | `Security::initSession()` |
| **Email Domain Restriction** | Regex check | signup.php line 60 |

---

**End of Developer Documentation**


