<?php
namespace AfyaClass\Utils;

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;
use PHPMailer\PHPMailer\SMTP;

require_once __DIR__ . '/../vendor/autoload.php';

class Mailer {
    private $mail;

    public function __construct() {
        $this->mail = new PHPMailer(true);
        // Server settings
        $this->mail->isSMTP();

        // Validate and set SMTP Host
        if (!isset($_ENV['SMTP_HOST'])) {
            throw new Exception('SMTP_HOST environment variable is not set.');
        }
        $this->mail->Host = $_ENV['SMTP_HOST'];

        $this->mail->SMTPAuth = true;

        // Validate and set SMTP Username
        if (!isset($_ENV['SMTP_USERNAME'])) {
            throw new Exception('SMTP_USERNAME environment variable is not set.');
        }
        $this->mail->Username = $_ENV['SMTP_USERNAME'];

        // Validate and set SMTP Password
        if (!isset($_ENV['SMTP_PASSWORD'])) {
            throw new Exception('SMTP_PASSWORD environment variable is not set.');
        }
        $this->mail->Password = $_ENV['SMTP_PASSWORD'];

        $this->mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;

        // Validate and set SMTP Port
        if (!isset($_ENV['SMTP_PORT'])) {
            throw new Exception('SMTP_PORT environment variable is not set.');
        }
        $this->mail->Port = $_ENV['SMTP_PORT'];

        // Optional: Enable SMTP debugging if an environment variable is set
        if (isset($_ENV['SMTP_DEBUG_LEVEL']) && $_ENV['SMTP_DEBUG_LEVEL'] !== '0') {
            $this->mail->SMTPDebug = (int)$_ENV['SMTP_DEBUG_LEVEL'];
        }

        // Recipients
        // Validate and set SMTP From Email
        if (!isset($_ENV['SMTP_FROM_EMAIL'])) {
            throw new Exception('SMTP_FROM_EMAIL environment variable is not set.');
        }
        // Validate and set SMTP From Name
        if (!isset($_ENV['SMTP_FROM_NAME'])) {
            throw new Exception('SMTP_FROM_NAME environment variable is not set.');
        }
        $this->mail->setFrom($_ENV['SMTP_FROM_EMAIL'], $_ENV['SMTP_FROM_NAME']);
        $this->mail->isHTML(true);
    }

    public function sendOTP(string $toEmail, string $toName, string $otp): bool {
        try {
            $this->mail->clearAddresses(); // Clear all addresses for each new email
            $this->mail->addAddress($toEmail, $toName);
            $this->mail->Subject = 'Your OTP for AfyaClass Email Confirmation';
            $this->mail->Body    = "
                <p>Dear {$toName},</p>
                <p>Your One-Time Password (OTP) for email confirmation is: <strong>{$otp}</strong></p>
                <p>This OTP is valid for 5 minutes. Please do not share it with anyone.</p>
                <p>If you did not request this, please ignore this email.</p>
                <p>Regards,<br>The AfyaClass Team</p>
            ";
            $this->mail->AltBody = "Dear {$toName},\n\nYour One-Time Password (OTP) for email confirmation is: {$otp}\n\nThis OTP is valid for 5 minutes. Please do not share it with anyone.\n\nIf you did not request this, please ignore this email.\n\nRegards,\nThe AfyaClass Team";

            $this->mail->send();
            return true;
        } catch (Exception $e) {
            error_log("Message could not be sent. Mailer Error: {$this->mail->ErrorInfo}");
            return false;
        }
    }

    public function sendPasswordResetOTP(string $toEmail, string $toName, string $otp): bool {
        try {
            $this->mail->clearAddresses(); // Clear all addresses for each new email
            $this->mail->addAddress($toEmail, $toName);
            $this->mail->Subject = 'AfyaClass Password Reset OTP';
            $this->mail->Body    = "
                <p>Dear {$toName},</p>
                <p>You have requested to reset your password for your AfyaClass account.</p>
                <p>Your One-Time Password (OTP) for password reset is: <strong>{$otp}</strong></p>
                <p>This OTP is valid for 5 minutes. Please do not share it with anyone.</p>
                <p>If you did not request a password reset, please ignore this email.</p>
                <p>Regards,<br>The AfyaClass Team</p>
            ";
            $this->mail->AltBody = "Dear {$toName},\n\nYou have requested to reset your password for your AfyaClass account.\n\nYour One-Time Password (OTP) for password reset is: {$otp}\n\nThis OTP is valid for 5 minutes. Please do not share it with anyone.\n\nIf you did not request a password reset, please ignore this email.\n\nRegards,\nThe AfyaClass Team";

            $this->mail->send();
            return true;
        } catch (Exception $e) {
            error_log("Message could not be sent. Mailer Error: {$this->mail->ErrorInfo}");
            return false;
        }
    }

    public function getLastError(): string {
        return $this->mail->ErrorInfo;
    }
}
