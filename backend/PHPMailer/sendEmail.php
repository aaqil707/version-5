<?php
/**
 * PHPMailer Email Sender
 * Uses PHPMailer library to send emails via SMTP
 */

// Suppress PHP deprecation warnings
error_reporting(E_ALL & ~E_DEPRECATED & ~E_USER_DEPRECATED);

// Load PHPMailer classes manually
require_once __DIR__ . '/src/Exception.php';
require_once __DIR__ . '/src/PHPMailer.php';
require_once __DIR__ . '/src/SMTP.php';
require_once __DIR__ . '/src/LoggerInterface.php';

// Create shorter aliases for the namespaced classes
class_alias('PHPMailer\PHPMailer\PHPMailer', 'MyPHPMailer');
class_alias('PHPMailer\PHPMailer\SMTP', 'MySMTP');
class_alias('PHPMailer\PHPMailer\Exception', 'MyException');

class SendEmail {
    private $mailer;
    private $config;
    
    public function __construct($config = []) {
        $this->config = $config;
        $this->mailer = new MyPHPMailer(true);
    }
    
    /**
     * Send email using PHPMailer
     */
    public function send($to, $subject, $body) {
        try {
            // Server settings
            $this->mailer->SMTPDebug = MySMTP::DEBUG_OFF;
            $this->mailer->isSMTP();
            $this->mailer->Host       = $this->config['smtp_host'] ?? 'smtp.gmail.com';
            $this->mailer->SMTPAuth   = true;
            $this->mailer->Username   = $this->config['smtp_username'] ?? '';
            $this->mailer->Password   = $this->config['smtp_password'] ?? '';
            $this->mailer->SMTPSecure = MyPHPMailer::ENCRYPTION_STARTTLS;
            $this->mailer->Port       = $this->config['smtp_port'] ?? 587;
            
            // Recipients
            $this->mailer->setFrom(
                $this->config['from_email'] ?? 'noreply@toolmanagement.com',
                $this->config['from_name'] ?? 'Tool Management System'
            );
            $this->mailer->addAddress($to);
            
            // Content
            $this->mailer->isHTML(true);
            $this->mailer->Subject = $subject;
            $this->mailer->Body    = $body;
            $this->mailer->AltBody = strip_tags($body);
            
            $this->mailer->send();
            
            return [
                'success' => true,
                'message' => 'Email sent successfully'
            ];
            
        } catch (MyException $e) {
            $errorMsg = $this->mailer->ErrorInfo;
            if (empty($errorMsg)) {
                $errorMsg = $e->getMessage();
            }
            if (empty($errorMsg)) {
                $errorMsg = 'SMTP connection failed. Check SMTP settings and network connectivity.';
            }
            error_log('PHPMailer Error: ' . $errorMsg);
            return [
                'success' => false,
                'error' => $errorMsg
            ];
        }
    }
    
    /**
     * Get company logo URL
     */
    private function getLogoUrl() {
        return 'https://www.vdart.com/wp-content/uploads/2020/02/vdart.svg';
    }
    
    /**
     * Get email signature
     */
    private function getSignature() {
        return '
        <div style="font-family: Arial, sans-serif; font-size: 12px; color: #333; margin-top: 20px; padding-top: 15px; border-top: 1px solid #ddd;">
            <p style="margin: 5px 0;"><strong>Best Regards,</strong></p>
            <p style="margin: 5px 0;"><strong>Delivery Team</strong></p>
            <p style="margin: 5px 0;"><strong>Tools Management</strong></p>
        </div>';
    }
    
    /**
     * Send test email
     */
    public function sendTest($to) {
        $logoUrl = $this->getLogoUrl();
        
        $body = '
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #2196F3; color: white; padding: 30px; text-align: center; }
                .content { padding: 30px; background: #f5f5f5; text-align: center; }
                .message { font-size: 16px; color: #333; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <img src="' . $logoUrl . '" alt="Tool Management" style="max-width: 200px; height: auto;">
                </div>
                <div class="content">
                    <p class="message">This is a test email from your Tool Management System.</p>
                    <p class="message">If you received this email, your SMTP settings are configured correctly!</p>
                </div>
                ' . $this->getSignature() . '
            </div>
        </body>
        </html>
        ';
        
        return $this->send(
            $to,
            'Test Email from Tool Management System',
            $body
        );
    }
    
    /**
     * Send renewal reminder with tool details
     */
    public function sendRenewalReminder($to, $tool) {
        $subject = "Renewal Reminder: " . $tool['tool_name'];
        $logoUrl = $this->getLogoUrl();
        
        // Format currency
        $currency = $tool['currency'] ?? '$';
        $annualCost = $currency . number_format($tool['annual_cost'] ?? 0, 2);
        $previousCost = $currency . number_format($tool['previous_cost'] ?? 0, 2);
        $daysRemaining = $tool['days_until_renewal'] ?? 'N/A';
        $spocDetails = $tool['spoc_details'] ?? 'N/A';
        $phoneNumber = $tool['phone_number'] ?? 'N/A';
        
        $body = '
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #2196F3; color: white; padding: 20px; text-align: center; }
                .content { padding: 20px; background: #f5f5f5; }
                .tool-name { font-size: 24px; font-weight: bold; color: #333; margin-bottom: 15px; }
                .info-table { width: 100%; border-collapse: collapse; margin: 15px 0; background: white; }
                .info-table th, .info-table td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #ddd; font-size: 14px; }
                .info-table th { background: #e9ecef; color: #333; font-weight: 600; width: 40%; }
                .info-table td { color: #555; }
                .days-badge { background: #dc3545; color: white; padding: 5px 12px; border-radius: 15px; font-weight: bold; }
                .cost-value { font-size: 16px; font-weight: bold; color: #2196F3; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <img src="' . $logoUrl . '" alt="Tool Management" style="max-width: 200px; height: auto;">
                </div>
                <div class="content">
                    <div class="tool-name">' . $tool['tool_name'] . '</div>
                    
                    <table class="info-table">
                        <tr>
                            <th>Days Remaining:</th>
                            <td><span class="days-badge">' . $daysRemaining . ' days</span></td>
                        </tr>
                     <tr>
                             <th>Start Date:</th>
                             <td>' . (!empty($tool['last_renewal']) ? date('m/d/Y', strtotime($tool['last_renewal'])) : 'N/A') . '</td>
                         </tr>
                         <tr>
                             <th>End Date:</th>
                             <td>' . (!empty($tool['next_renewal']) ? date('m/d/Y', strtotime($tool['next_renewal'])) : 'N/A') . '</td>
                         </tr>
                        <tr>
                            <th>Annual Cost:</th>
                            <td><span class="cost-value">USD ' . number_format($tool['annual_cost'] ?? 0, 2) . '</span></td>
                        </tr>
                        <tr>
                            <th>Previous Cost:</th>
                            <td><span class="cost-value">USD ' . number_format($tool['previous_cost'] ?? 0, 2) . '</span></td>
                        </tr>
                        <tr>
                            <th>Payment Frequency:</th>
                            <td>' . ($tool['payment_frequency'] ?? 'N/A') . '</td>
                        </tr>
                        <tr>
                            <th>SPOC Details:</th>
                            <td>' . $spocDetails . '</td>
                        </tr>
                        <tr>
                            <th>Phone Number:</th>
                            <td>' . $phoneNumber . '</td>
                        </tr>
                    </table>
                    
                    <p style="margin-top: 15px; color: #dc3545; font-weight: bold;">Please renew your subscription to avoid service interruption.</p>
                    
                    <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #ddd;">
                        <p style="margin: 0; font-weight: bold;">Best Regards,<br>BY TOOLS MANAGEMENT SYSTEM</p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        ';
        
        return $this->send($to, $subject, $body);
    }
    
    /**
     * Send registration complete email after OTP verification
     */
    public function sendRegistrationCompleteEmail($to, $name) {
        $logoUrl = $this->getLogoUrl();
        $currentDate = date('m/d/Y');
        
        $body = '
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #2196F3; color: white; padding: 20px; text-align: center; }
                .content { padding: 20px; background: #f5f5f5; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <img src="' . $logoUrl . '" alt="Tool Management" style="max-width: 200px; height: auto;">
                    <h2>Welcome to Tool Management System!</h2>
                </div>
                <div class="content">
                    <p>Hello <strong>' . $name . '</strong>,</p>
                    <p>Your account has been successfully verified!</p>
                    <p>You can now log in to the Tool Management System.</p>
                    <p><strong>Verification Date:</strong> ' . $currentDate . '</p>
                </div>
                ' . $this->getSignature() . '
            </div>
        </body>
        </html>
        ';
        
        return $this->send(
            $to,
            'Welcome to Tool Management System - Registration Complete',
            $body
        );
    }
    
    /**
     * Send admin notification
     */
    public function sendAdminNotification($adminEmail, $newUserEmail, $newUserName) {
        $logoUrl = $this->getLogoUrl();
        $registrationTime = date('m/d/Y H:i:s');
        
        $body = '
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #dc3545; color: white; padding: 20px; text-align: center; }
                .content { padding: 20px; background: #f5f5f5; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <img src="' . $logoUrl . '" alt="Tool Management" style="max-width: 80px; height: auto;">
                    <h2>New User Registration Alert</h2>
                </div>
                <div class="content">
                    <p><strong>New user registered!</strong></p>
                    <p><strong>Name:</strong> ' . $newUserName . '</p>
                    <p><strong>Email:</strong> ' . $newUserEmail . '</p>
                    <p><strong>Registered:</strong> ' . $registrationTime . '</p>
                </div>
                ' . $this->getSignature() . '
            </div>
        </body>
        </html>
        ';
        
        return $this->send(
            $adminEmail,
            'New User Registration - ' . $newUserEmail,
            $body
        );
    }
    
    /**
     * Send OTP verification email
     */
    public function sendOTPEmail($to, $otp, $name) {
        $logoUrl = $this->getLogoUrl();
        
        $body = '
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #2196F3; color: white; padding: 20px; text-align: center; }
                .content { padding: 20px; background: #f5f5f5; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <img src="' . $logoUrl . '" alt="Tool Management" style="max-width: 150px; height: auto;">
                    <h2>Verify Your Account</h2>
                </div>
                <div class="content">
                    <p>Hello <strong>' . $name . '</strong>,</p>
                    <p>Your OTP is: <strong>' . $otp . '</strong></p>
                    <p>This OTP will expire in 10 minutes.</p>
                </div>
                ' . $this->getSignature() . '
            </div>
        </body>
        </html>
        ';
        
        return $this->send(
            $to,
            'Verify Your Account - OTP for Tool Management System',
            $body
        );
    }
}