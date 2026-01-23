<?php

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../utils/auth.php'; // Include the authentication functions
require_once __DIR__ . '/../utils/mailer.php'; // Include the mailer functions

/**
 * Handles user login requests.
 * Detects concurrent sessions and prompts for resolution.
 *
 * @param string $requestMethod The HTTP request method (e.g., 'POST').
 */
function handle_login($requestMethod)
{
    global $pdo;

    // Wrap the entire function logic in a try-catch to catch any unexpected errors
    try {
        if ($requestMethod === 'POST') {
            $data = json_decode(file_get_contents("php://input"), true);
            $emailOrUsername = $data['emailOrUsername'] ?? '';
            $password = $data['password'] ?? '';

            error_log("Login attempt for: " . $emailOrUsername);
            error_log("Received password length: " . strlen($password));

            if (!$emailOrUsername || !$password) {
                http_response_code(400);
                echo json_encode(['message' => 'Email/username and password are required.']);
                return;
            }

            try {
                // Fetch user details
                $stmt = $pdo->prepare('SELECT id, email, username, password, college, phone, classType, classTypeNameFull, classLevel, role, hasMaterialAccess, materialTrialStartTime, materialTrialEndTime, materialPaidAccessEndTime, hasPendingPayment, isConfirmed, confirmation_token, confirmation_token_expires_at FROM users WHERE email = ? OR username = ?');
                $stmt->execute([$emailOrUsername, $emailOrUsername]);
                $user = $stmt->fetch(PDO::FETCH_ASSOC);

                if (!$user) {
                    error_log("User not found for: " . $emailOrUsername);
                    http_response_code(404);
                    echo json_encode(['message' => 'User not found.']);
                    return;
                }
                error_log("User found: " . $user['username'] . ", Hashed password from DB: " . $user['password']);
                error_log("Password provided (masked): " . str_repeat('*', strlen($password)));
                error_log("Password verify result: " . (password_verify($password, $user['password']) ? 'true' : 'false'));

                // Verify password
                if (!password_verify($password, $user['password'])) {
                    error_log("Password verification failed for user: " . $user['username']);
                    http_response_code(401);
                    echo json_encode(['message' => 'Incorrect password.']);
                    return;
                }
                error_log("Password verification successful for user: " . $user['username']);

                // Explicitly cast to boolean for consistent checking
                $user['isConfirmed'] = (bool) $user['isConfirmed'];
                error_log("DEBUG: User {$user['username']} (ID: {$user['id']}) isConfirmed value: " . var_export($user['isConfirmed'], true) . " (type: " . gettype($user['isConfirmed']) . "), cast to boolean: " . var_export($user['isConfirmed'], true));
                if (!$user['isConfirmed']) {
                    // User is not confirmed, handle OTP resend logic
                    $now = new DateTime('now', new DateTimeZone('UTC'));
                    $otpExpiry = null;
                    if ($user['confirmation_token_expires_at']) {
                        $otpExpiry = new DateTime($user['confirmation_token_expires_at'], new DateTimeZone('UTC'));
                    }

                    $otpSentTime = null;
                    if ($otpExpiry) {
                        // Calculate when the OTP was originally sent (5 minutes before expiry)
                        $otpSentTime = (clone $otpExpiry)->modify('-5 minutes');
                    }

                    $cooldownDuration = 120; // 2 minutes in seconds
                    $remainingTime = 0;

                    // Check if cooldown is active
                    if ($otpSentTime && ($now->getTimestamp() - $otpSentTime->getTimestamp() < $cooldownDuration)) {
                        $remainingTime = $cooldownDuration - ($now->getTimestamp() - $otpSentTime->getTimestamp());
                        http_response_code(429); // Too Many Requests
                        echo json_encode([
                            'message' => "Your email is not yet confirmed. Please wait {$remainingTime} seconds before attempting to resend the OTP.",
                            'userId' => $user['id'],
                            'email' => $user['email'],
                            'resendCooldown' => $remainingTime,
                            'requiresOtpVerification' => true // Flag for frontend
                        ]);
                        return;
                    }

                    // If cooldown has passed or no previous OTP, send a new one
                    $mailer = new \AfyaClass\Utils\Mailer();
                    $newOtp = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);
                    $newOtpExpiresAt = (clone $now)->modify('+5 minutes')->format('Y-m-d H:i:s');

                    // Update user with new OTP and expiry
                    $stmtUpdate = $pdo->prepare('UPDATE users SET confirmation_token = ?, confirmation_token_expires_at = ? WHERE id = ?');
                    $updateSuccess = $stmtUpdate->execute([$newOtp, $newOtpExpiresAt, $user['id']]);

                    if ($updateSuccess) {
                        // Send the new OTP email
                        if ($mailer->sendOTP($user['email'], $user['username'], $newOtp)) {
                            http_response_code(200); // OK, but requires OTP verification
                            echo json_encode([
                                'message' => 'Email unconfirmed. A new OTP has been sent. Please enter it below.',
                                'userId' => $user['id'],
                                'email' => $user['email'],
                                'resendCooldown' => $cooldownDuration, // Inform frontend about the cooldown duration
                                'requiresOtpVerification' => true // Flag for frontend
                            ]);
                        } else {
                            error_log("Login attempt for unconfirmed user: Failed to send new OTP email to {$user['email']}.");
                            http_response_code(500);
                            echo json_encode(['message' => 'Failed to send confirmation OTP. Please try again later.']);
                        }
                    } else {
                        error_log("Login attempt for unconfirmed user: Failed to update user with new OTP for {$user['email']}.");
                        http_response_code(500);
                        echo json_encode(['message' => 'Failed to process confirmation. Please try again later.']);
                    }
                    return; // Exit after handling unconfirmed user
                }

                // --- SESSION MANAGEMENT LOGIC ---
                // Deactivate sessions with no activity for more than 2 hours
                error_log("handle_login: Clearing stale sessions for user ID: " . $user['id']);
                $clearStaleSessionsStmt = $pdo->prepare('UPDATE user_sessions SET is_active = FALSE, last_activity = CURRENT_TIMESTAMP WHERE user_id = ? AND is_active = TRUE AND last_activity < (CURRENT_TIMESTAMP - INTERVAL 2 HOUR)');
                $clearStaleSessionsStmt->execute([$user['id']]);

                // Check for existing active sessions for this user
                error_log("handle_login: Checking for active sessions for user ID: " . $user['id']);
                $activeSessionsStmt = $pdo->prepare('SELECT session_id, device_info, login_time FROM user_sessions WHERE user_id = ? AND is_active = TRUE');
                $activeSessionsStmt->execute([$user['id']]);
                $activeSessions = $activeSessionsStmt->fetchAll(PDO::FETCH_ASSOC);
                error_log("handle_login: Found " . count($activeSessions) . " active sessions for user ID: " . $user['id']);

                // If the user is an admin, allow multiple concurrent sessions.
                // For regular users (students), if active sessions exist, prompt for resolution.
                // UNLESS the current session is from the same device (matched by User Agent).
                $currentUA = $_SERVER['HTTP_USER_AGENT'] ?? 'Unknown Device';
                $isSameDevice = false;
                foreach ($activeSessions as $s) {
                    if ($s['device_info'] === $currentUA) {
                        $isSameDevice = true;
                        break;
                    }
                }

                if ($user['role'] !== 'admin' && !empty($activeSessions) && !$isSameDevice) {
                    error_log("handle_login: Non-admin user {$user['username']} (ID: {$user['id']}) has active sessions. Prompting for resolution.");
                    // Generate a short-lived token for session resolution
                    $sessionResolutionToken = generateSessionResolutionToken($user['id']);

                    http_response_code(409); // Conflict
                    echo json_encode([
                        'status' => 'conflict', // Add status for frontend
                        'message' => 'You have other active sessions. Please choose to terminate them or log in to this device only.',
                        'requiresSessionResolution' => true,
                        'activeSessions' => $activeSessions,
                        'user' => ['userId' => $user['id']], // Only send userId for conflict
                        'resolutionToken' => $sessionResolutionToken,
                    ]);
                    return; // Crucially, return here to prevent further login processing
                }

                // If we reach here, it means:
                // 1. The user is an admin (multiple sessions allowed).
                // 2. The user is a student AND has no other active sessions (or they were terminated by a prior request).
                // In either case, we proceed to create a new session.
                // For non-admin users, ensure any *stale* active sessions are deactivated before creating a new one.
                // This handles cases where a previous session might have been left active due to an error,
                // or if the user chose to terminate all other sessions via a separate request.
                if ($user['role'] !== 'admin') {
                    error_log("handle_login: Deactivating all existing active sessions for non-admin user ID: {$user['id']} before creating new one.");
                    $deactivateOldSessionsStmt = $pdo->prepare('UPDATE user_sessions SET is_active = FALSE, last_activity = CURRENT_TIMESTAMP WHERE user_id = ? AND is_active = TRUE');
                    $deactivateOldSessionsStmt->execute([$user['id']]);
                }

                // Proceed to create a new session
                $sessionId = uniqid(); // Generate a unique session ID
                error_log("handle_login: Creating new session with ID: {$sessionId} for user ID: {$user['id']}");
                // Attempt to capture device info from User-Agent header, fallback to 'Unknown Device'
                $deviceInfo = $_SERVER['HTTP_USER_AGENT'] ?? 'Unknown Device';

                $insertSessionStmt = $pdo->prepare('INSERT INTO user_sessions (session_id, user_id, device_info, is_active) VALUES (?, ?, ?, TRUE)');
                $sessionInsertSuccess = $insertSessionStmt->execute([$sessionId, $user['id'], $deviceInfo]);

                if (!$sessionInsertSuccess) {
                    error_log("handle_login: Failed to insert new session for user ID: " . $user['id']);
                    http_response_code(500);
                    echo json_encode(['message' => 'Login failed: Could not create new session.']);
                    return;
                }
                error_log("handle_login: New session ID " . $sessionId . " successfully inserted for user ID: " . $user['id']);

                // Add the newly created sessionId to the user array before generating the JWT
                $user['sessionId'] = $sessionId;

                // Generate JWT token with the correct sessionId in its payload
                $token = generateJwtToken($user);

                // Prepare user data for response
                $userData = [
                    'userId' => $user['id'],
                    'email' => $user['email'],
                    'username' => $user['username'],
                    'college' => $user['college'],
                    'phone' => $user['phone'],
                    'classType' => $user['classType'],
                    'classTypeNameFull' => $user['classTypeNameFull'],
                    'classLevel' => $user['classLevel'],
                    'role' => $user['role'],
                    'isGlobalFreeAccessEnabled' => isGlobalFreeAccessEnabled(),
                    'hasMaterialAccess' => isGlobalFreeAccessEnabled() ? true : (bool) $user['hasMaterialAccess'],
                    'materialTrialStartTime' => $user['materialTrialStartTime'],
                    'materialTrialEndTime' => $user['materialTrialEndTime'],
                    'materialPaidAccessEndTime' => $user['materialPaidAccessEndTime'],
                    'hasPendingPayment' => (bool) $user['hasPendingPayment'],
                    'isConfirmed' => $user['isConfirmed'],
                ];

                // Format all date/time fields to ISO 8601 UTC
                $dateFields = [
                    'materialTrialStartTime',
                    'materialTrialEndTime',
                    'materialPaidAccessEndTime'
                ];
                foreach ($dateFields as $field) {
                    if (isset($userData[$field]) && $userData[$field] !== null) {
                        try {
                            $dateTime = new DateTime($userData[$field], new DateTimeZone('UTC'));
                            $userData[$field] = $dateTime->format(DateTime::ATOM);
                        } catch (Exception $e) {
                            error_log("Error formatting user data date field {$field} during login: " . $e->getMessage());
                            $userData[$field] = null; // Fallback to null on error
                        }
                    }
                }

                // Add isConfirmed status to user data
                $userData['isConfirmed'] = (bool) $user['isConfirmed'];

                // Prepare successful login response
                $responsePayload = [
                    'status' => 'success',
                    'message' => 'Login successful!',
                    'user' => $userData,
                    'token' => $token, // This is the JWT
                    'sessionId' => $sessionId, // This is the unique session ID for the current login
                    'requiresSessionResolution' => false, // No resolution needed if no active sessions
                    'activeSessions' => [],
                    'userId' => $user['id'],
                ];
                $jsonResponse = json_encode($responsePayload);

                if (json_last_error() !== JSON_ERROR_NONE) {
                    error_log("JSON encoding error in handle_login: " . json_last_error_msg());
                    http_response_code(500);
                    echo json_encode(['message' => 'Server error: Failed to encode login response.']);
                    return;
                }

                error_log("Login successful response payload: " . $jsonResponse);
                header('Content-Type: application/json'); // Ensure content type is set
                http_response_code(200);
                echo $jsonResponse;

            } catch (PDOException $e) {
                error_log("Login error (PDOException): " . $e->getMessage() . " in " . $e->getFile() . " on line " . $e->getLine());
                http_response_code(500);
                echo json_encode([
                    'message' => 'Login failed due to server error.',
                    'error' => $e->getMessage(),
                    'file' => $e->getFile(),
                    'line' => $e->getLine(),
                    'trace' => $e->getTraceAsString()
                ]);
            } catch (Exception $e) {
                error_log("Login general error (Exception): " . $e->getMessage() . " in " . $e->getFile() . " on line " . $e->getLine());
                http_response_code(500);
                echo json_encode([
                    'message' => 'Login failed due to an unexpected server error.',
                    'error' => $e->getMessage(),
                    'file' => $e->getFile(),
                    'line' => $e->getLine(),
                    'trace' => $e->getTraceAsString()
                ]);
            }
        } else {
            http_response_code(405);
            echo json_encode(['message' => 'Method Not Allowed']);
        }
    } catch (Throwable $e) { // Catch any Throwable (Errors and Exceptions)
        error_log("FATAL Login error (Throwable): " . $e->getMessage() . " in " . $e->getFile() . " on line " . $e->getLine());
        http_response_code(500);
        echo json_encode([
            'message' => 'A critical server error occurred during login.',
            'error' => $e->getMessage(),
            'file' => $e->getFile(),
            'line' => $e->getLine(),
            'trace' => $e->getTraceAsString()
        ]);
    }
}

/**
 * Handles starting a material trial for a user.
 *
 * @param string $requestMethod The HTTP request method (e.g., 'POST').
 */
function handle_start_material_trial($requestMethod)
{
    global $pdo;

    if ($requestMethod === 'POST') {
        $data = json_decode(file_get_contents("php://input"), true);
        $userId = $data['userId'] ?? null;

        if (!$userId) {
            http_response_code(400);
            echo json_encode(['message' => 'User ID is required.']);
            return;
        }

        try {
            // Check if user exists and if trial has already started or access granted
            $stmt = $pdo->prepare('SELECT hasMaterialAccess, materialTrialStartTime, materialPaidAccessEndTime, materialTrialEndTime FROM users WHERE id = ?');
            $stmt->execute([$userId]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$user) {
                http_response_code(404);
                echo json_encode(['message' => 'User not found.']);
                return;
            }

            $now = new DateTime('now', new DateTimeZone('UTC'));

            // Check if user has active paid material access
            if ((bool) $user['hasMaterialAccess'] && $user['materialPaidAccessEndTime'] !== null) {
                $paidAccessEndTime = new DateTime($user['materialPaidAccessEndTime'], new DateTimeZone('UTC'));
                if ($now < $paidAccessEndTime) {
                    http_response_code(409);
                    echo json_encode(['message' => 'User already has active paid material access.']);
                    return;
                }
            }

            // Check if user has an active material trial using materialTrialEndTime
            if ($user['materialTrialEndTime'] !== null) {
                try {
                    $trialEndTime = new DateTime($user['materialTrialEndTime'], new DateTimeZone('UTC'));
                    error_log("handle_start_material_trial: Existing trialEndTime: " . $trialEndTime->format(DateTime::ATOM));
                    if ($now < $trialEndTime) {
                        error_log("handle_start_material_trial: Trial still active for user ID {$userId}. Current time: " . $now->format(DateTime::ATOM));
                        http_response_code(409);
                        echo json_encode(['message' => 'Material trial already active for this user.']);
                        return;
                    }
                    error_log("handle_start_material_trial: Existing trial has expired for user ID {$userId}. Proceeding to start new trial.");
                } catch (Exception $e) {
                    error_log("Error parsing existing materialTrialEndTime '{$user['materialTrialEndTime']}': " . $e->getMessage());
                    // If parsing fails, treat as expired or invalid and proceed to start a new one
                }
            } else {
                error_log("handle_start_material_trial: No previous trial found for user ID {$userId}. Proceeding to start new trial.");
            }

            // Start the trial
            $now = new DateTime('now', new DateTimeZone('UTC'));
            // Adjust for apparent 3-hour forward offset on the server's clock/timezone
            $now->modify('-3 hours');
            $trialStartTime = $now->format(DateTime::ATOM);
            $trialEndTime = (clone $now)->modify('+15 minutes')->format(DateTime::ATOM);

            $stmtUpdate = $pdo->prepare('UPDATE users SET materialTrialStartTime = ?, materialTrialEndTime = ? WHERE id = ?');
            $success = $stmtUpdate->execute([$trialStartTime, $trialEndTime, $userId]);

            if ($success && $stmtUpdate->rowCount() > 0) {
                http_response_code(200);
                echo json_encode(['message' => 'Material trial started successfully!']);
            } else {
                http_response_code(500);
                echo json_encode(['message' => 'Failed to start material trial.']);
            }

        } catch (PDOException $e) {
            error_log("Start material trial error: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['message' => 'Failed to start material trial due to server error.']);
        }
    } else {
        http_response_code(405);
        echo json_encode(['message' => 'Method Not Allowed']);
    }
}

/**
 * Handles user registration.
 *
 * @param string $requestMethod The HTTP request method (e.g., 'POST').
 */
function handle_register($requestMethod)
{
    global $pdo;

    if ($requestMethod === 'POST') {
        $data = json_decode(file_get_contents("php://input"), true);
        $email = $data['email'] ?? '';
        $username = $data['username'] ?? '';
        $password = $data['password'] ?? '';
        $college = $data['college'] ?? null;
        $phone = $data['phone'] ?? null;
        $classType = $data['classType'] ?? null;
        $classTypeNameFull = $data['classTypeNameFull'] ?? null;
        $classLevel = $data['classLevel'] ?? null;

        if (!$email || !$username || !$password || !$classType || !$phone) {
            http_response_code(400);
            echo json_encode(['message' => 'Missing required registration fields: email, username, password, classType, phone.']);
            return;
        }

        // Backend Gmail-only validation
        if (!filter_var($email, FILTER_VALIDATE_EMAIL) || !str_ends_with($email, '@gmail.com')) {
            http_response_code(400);
            echo json_encode(['message' => 'Only Gmail accounts are allowed for registration.']);
            return;
        }

        try {
            // Check if email or username already exists
            $stmtCheck = $pdo->prepare('SELECT id FROM users WHERE email = ? OR username = ?');
            $stmtCheck->execute([$email, $username]);
            if ($stmtCheck->fetch(PDO::FETCH_ASSOC)) {
                http_response_code(409);
                echo json_encode(['message' => 'Email or username already exists.']);
                return;
            }

            $hashedPassword = password_hash($password, PASSWORD_DEFAULT); // Define hashedPassword

            // Generate a 6-digit numeric OTP
            $otp = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);
            $otpExpiresAt = (new DateTime('now', new DateTimeZone('UTC')))->modify('+5 minutes')->format('Y-m-d H:i:s');
            $isConfirmed = false; // User is not confirmed until email verification

            $stmt = $pdo->prepare(
                'INSERT INTO users (email, username, password, college, phone, classType, classTypeNameFull, classLevel, role, hasPendingPayment, hasMaterialAccess, materialTrialStartTime, isConfirmed, confirmation_token, confirmation_token_expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
            );

            error_log("DEBUG: Before executing INSERT statement.");
            $result = $stmt->execute([
                $email,
                $username,
                $hashedPassword,
                $college,
                $phone,
                $classType,
                $classTypeNameFull,
                $classLevel,
                'student',
                0, // Explicitly cast false to 0 for hasPendingPayment
                0, // Explicitly cast false to 0 for hasMaterialAccess
                null, // materialTrialStartTime
                0, // Explicitly cast false to 0 for isConfirmed
                $otp, // Use OTP instead of confirmationToken
                $otpExpiresAt // Use otpExpiresAt instead of confirmationTokenExpiresAt
            ]);
            error_log("DEBUG: After executing INSERT statement. Result: " . ($result ? 'true' : 'false'));

            if ($result) {
                $userId = $pdo->lastInsertId();
                error_log("DEBUG: User registered with ID: " . $userId);
                // Send confirmation email
                error_log("DEBUG: Attempting to send confirmation email to: " . $email);
                $mailer = new \AfyaClass\Utils\Mailer();
                if ($mailer->sendOTP($email, $username, $otp)) { // Use the generated OTP
                    error_log("DEBUG: Confirmation email sent successfully.");
                    http_response_code(201);
                    echo json_encode(['message' => 'Registration successful! Please check your email for the OTP to confirm your account.', 'userId' => $userId]);
                } else {
                    // If email sending fails, still register the user but log the error
                    error_log("ERROR: Failed to send confirmation email to {$email} during registration. Mailer Error: " . $mailer->getLastError());
                    http_response_code(201); // Still return 201 as user is created
                    echo json_encode(['message' => 'Registration successful, but failed to send confirmation OTP. Please try requesting a new one.', 'userId' => $userId]);
                }
            } else {
                error_log("ERROR: Failed to register user, stmt->execute returned false.");
                http_response_code(500);
                echo json_encode(['message' => 'Failed to register user.']);
            }

        } catch (PDOException $e) {
            error_log("ERROR: Registration PDO error: " . $e->getMessage() . " in " . $e->getFile() . " on line " . $e->getLine());
            if ($e->getCode() === '23000') {
                http_response_code(409);
                echo json_encode(['message' => 'Email or username already exists.']);
            } else {
                http_response_code(500);
                echo json_encode([
                    'message' => 'Registration failed due to server error.',
                    'error' => $e->getMessage(),
                    'file' => $e->getFile(),
                    'line' => $e->getLine(),
                    'trace' => $e->getTraceAsString()
                ]);
            }
        } catch (Exception $e) {
            error_log("ERROR: Registration general exception: " . $e->getMessage() . " in " . $e->getFile() . " on line " . $e->getLine());
            http_response_code(500);
            echo json_encode([
                'message' => 'Registration failed due to an unexpected server error.',
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString()
            ]);
        }
    } else {
        http_response_code(405);
        echo json_encode(['message' => 'Method Not Allowed']);
    }
}

/**
 * Handles user logout.
 *
 * @param string $requestMethod The HTTP request method (e.g., 'POST').
 */
function handle_logout($requestMethod)
{
    global $pdo;

    if ($requestMethod === 'POST') {
        $data = json_decode(file_get_contents("php://input"), true);
        $sessionIdToTerminate = $data['sessionId'] ?? null;

        if ($sessionIdToTerminate) {
            try {
                // Find the user_id associated with the session_id
                $stmt = $pdo->prepare('SELECT user_id FROM user_sessions WHERE session_id = ?');
                $stmt->execute([$sessionIdToTerminate]);
                $session = $stmt->fetch(PDO::FETCH_ASSOC);

                if ($session) {
                    // Mark the specific session as inactive
                    $stmtUpdate = $pdo->prepare('UPDATE user_sessions SET is_active = FALSE, last_activity = CURRENT_TIMESTAMP WHERE session_id = ?');
                    $stmtUpdate->execute([$sessionIdToTerminate]);
                    $rowCount = $stmtUpdate->rowCount();
                    error_log("handle_logout: Session ID {$sessionIdToTerminate} for user ID {$session['user_id']} marked as inactive. Rows affected: {$rowCount}.");
                } else {
                    error_log("Logout: Session ID {$sessionIdToTerminate} not found in database.");
                }
            } catch (PDOException $e) {
                error_log("Error marking session inactive on logout for session ID {$sessionIdToTerminate}: " . $e->getMessage());
                // Continue with logout even if database update fails, to ensure client-side logout
            }
        } else {
            error_log("Logout: Session ID not provided in request.");
        }

        // Clear PHP session data (if any, for good measure, though JWT is primary)
        if (session_status() == PHP_SESSION_NONE) {
            session_start();
        }
        session_unset();
        session_destroy();

        http_response_code(200);
        echo json_encode(['message' => 'Logout successful!']);
    } else {
        http_response_code(405);
        echo json_encode(['message' => 'Method Not Allowed']);
    }
}

/**
 * Handles email verification using OTP.
 *
 * @param string $requestMethod The HTTP request method (e.g., 'POST').
 */
function handle_verify_email($requestMethod)
{
    global $pdo;

    if ($requestMethod === 'POST') { // Changed to POST for OTP verification
        $data = json_decode(file_get_contents("php://input"), true);
        $email = $data['email'] ?? '';
        $otp = $data['otp'] ?? '';

        if (!$email || !$otp) {
            http_response_code(400);
            echo json_encode(['message' => 'Email and OTP are required.']);
            return;
        }

        try {
            $stmt = $pdo->prepare('SELECT id, isConfirmed, confirmation_token, confirmation_token_expires_at FROM users WHERE email = ?');
            $stmt->execute([$email]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$user) {
                http_response_code(404);
                echo json_encode(['message' => 'User not found.']);
                return;
            }

            if ($user['isConfirmed']) {
                http_response_code(200);
                echo json_encode(['message' => 'Email already verified.']);
                return;
            }

            if ($user['confirmation_token'] !== $otp) {
                http_response_code(401);
                echo json_encode(['message' => 'Invalid OTP.']);
                return;
            }

            $now = new DateTime('now', new DateTimeZone('UTC'));
            $expiresAt = new DateTime($user['confirmation_token_expires_at'], new DateTimeZone('UTC'));

            if ($now > $expiresAt) {
                http_response_code(400);
                echo json_encode(['message' => 'OTP has expired. Please request a new one.']);
                return;
            }

            $stmtUpdate = $pdo->prepare('UPDATE users SET isConfirmed = 1, confirmation_token = NULL, confirmation_token_expires_at = NULL WHERE id = ?');
            $updateSuccess = $stmtUpdate->execute([$user['id']]);
            error_log("DEBUG: handle_verify_email - User ID {$user['id']} confirmation status update result: " . ($updateSuccess ? 'Success' : 'Failure') . ", Rows affected: " . $stmtUpdate->rowCount());

            if ($updateSuccess) {
                http_response_code(200);
                echo json_encode([
                    'message' => 'Email verified successfully! You can log in now.',
                ]);
            } else {
                error_log("ERROR: handle_verify_email - Failed to update user confirmation status for ID: {$user['id']}.");
                http_response_code(500);
                echo json_encode(['message' => 'Email verified, but failed to update user status. Please try logging in.']);
            }

        } catch (PDOException $e) {
            error_log("Email verification error: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['message' => 'Email verification failed due to server error.']);
        }
    } else {
        http_response_code(405);
        echo json_encode(['message' => 'Method Not Allowed']);
    }
}

/**
 * Handles resending the confirmation email OTP.
 *
 * @param string $requestMethod The HTTP request method (e.g., 'POST').
 */
function handle_resend_confirmation_email($requestMethod)
{
    global $pdo;

    if ($requestMethod === 'POST') {
        $data = json_decode(file_get_contents("php://input"), true);
        $email = $data['email'] ?? '';

        if (!$email) {
            http_response_code(400);
            echo json_encode(['message' => 'Email is required.']);
            return;
        }

        try {
            $stmt = $pdo->prepare('SELECT id, username, isConfirmed, confirmation_token_expires_at FROM users WHERE email = ?');
            $stmt->execute([$email]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$user) {
                http_response_code(404);
                echo json_encode(['message' => 'User not found.']);
                return;
            }

            if ($user['isConfirmed']) {
                http_response_code(409);
                echo json_encode(['message' => 'Email is already confirmed.']);
                return;
            }

            $now = new DateTime('now', new DateTimeZone('UTC'));
            $lastSentTime = null;
            if ($user['confirmation_token_expires_at']) {
                $lastSentTime = (new DateTime($user['confirmation_token_expires_at'], new DateTimeZone('UTC')))->modify('-5 minutes'); // Assuming token valid for 5 mins
            }

            // Implement 2-minute cooldown for requesting new codes
            if ($lastSentTime && $now->getTimestamp() - $lastSentTime->getTimestamp() < 120) { // 120 seconds = 2 minutes
                $remainingTime = 120 - ($now->getTimestamp() - $lastSentTime->getTimestamp());
                http_response_code(429); // Too Many Requests
                echo json_encode(['message' => "Please wait {$remainingTime} seconds before requesting another confirmation OTP."]);
                return;
            }

            $newOtp = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);
            $newOtpExpiresAt = (clone $now)->modify('+5 minutes')->format('Y-m-d H:i:s');

            $stmtUpdate = $pdo->prepare('UPDATE users SET confirmation_token = ?, confirmation_token_expires_at = ? WHERE id = ?');
            $stmtUpdate->execute([$newOtp, $newOtpExpiresAt, $user['id']]);

            $mailer = new \AfyaClass\Utils\Mailer();
            if ($mailer->sendOTP($email, $user['username'], $newOtp)) {
                http_response_code(200);
                echo json_encode(['message' => 'New confirmation OTP sent. Please check your inbox.']);
            } else {
                error_log("Failed to send new confirmation OTP to {$email}. Mailer Error: " . $mailer->ErrorInfo);
                http_response_code(500);
                echo json_encode(['message' => 'Failed to send new confirmation OTP. Please try again later.']);
            }

        } catch (PDOException $e) {
            error_log("Resend confirmation email error: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['message' => 'Failed to resend confirmation OTP due to server error.']);
        }
    } else {
        http_response_code(405);
        echo json_encode(['message' => 'Method Not Allowed']);
    }
}

/**
 * Handles password reset initiation.
 *
 * @param string $requestMethod The HTTP request method (e.g., 'POST').
 */
function handle_forgot_password($requestMethod)
{
    global $pdo;

    if ($requestMethod === 'POST') {
        $data = json_decode(file_get_contents("php://input"), true);
        $email = $data['email'] ?? '';

        if (!$email) {
            http_response_code(400);
            echo json_encode(['message' => 'Email is required.']);
            return;
        }

        try {
            $stmt = $pdo->prepare('SELECT id, username, password_reset_token, password_reset_token_expires_at FROM users WHERE email = ?');
            $stmt->execute([$email]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$user) {
                http_response_code(404); // Not Found
                echo json_encode(['message' => 'Email not found.']);
                return;
            }

            $now = new DateTime('now', new DateTimeZone('UTC'));
            $cooldownDuration = 120; // 2 minutes in seconds
            $remainingTime = 0;

            // Check if a password reset OTP was recently sent
            if ($user['password_reset_token_expires_at']) {
                $otpExpiry = new DateTime($user['password_reset_token_expires_at'], new DateTimeZone('UTC'));
                $otpSentTime = (clone $otpExpiry)->modify('-5 minutes'); // Assuming OTP is valid for 5 minutes

                if ($now->getTimestamp() - $otpSentTime->getTimestamp() < $cooldownDuration) {
                    $remainingTime = $cooldownDuration - ($now->getTimestamp() - $otpSentTime->getTimestamp());
                    http_response_code(429); // Too Many Requests
                    echo json_encode([
                        'message' => "Please wait {$remainingTime} seconds before requesting another password reset OTP.",
                        'resendCooldown' => $remainingTime,
                    ]);
                    return;
                }
            }

            $otp = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);
            $otpExpiresAt = (clone $now)->modify('+5 minutes')->format('Y-m-d H:i:s');

            $stmtUpdate = $pdo->prepare('UPDATE users SET password_reset_token = ?, password_reset_token_expires_at = ? WHERE id = ?');
            $updateSuccess = $stmtUpdate->execute([$otp, $otpExpiresAt, $user['id']]);

            if ($updateSuccess) {
                try {
                    $mailer = new \AfyaClass\Utils\Mailer();
                    if ($mailer->sendPasswordResetOTP($email, $user['username'], $otp)) {
                        http_response_code(200);
                        echo json_encode([
                            'message' => 'Password reset OTP sent to your email!',
                            'resendCooldown' => $cooldownDuration,
                        ]);
                    } else {
                        error_log("Failed to send password reset OTP email to {$email}. Mailer Error: " . $mailer->ErrorInfo);
                        http_response_code(500);
                        echo json_encode(['message' => 'Failed to send password reset OTP. Please try again later.']);
                    }
                } catch (Exception $mailerException) {
                    error_log("Mailer instantiation or sending failed for {$email}: " . $mailerException->getMessage());
                    http_response_code(500);
                    echo json_encode(['message' => 'Failed to send password reset OTP due to mailer configuration error.']);
                }
            } else {
                error_log("Failed to update user with password reset OTP for {$email}.");
                http_response_code(500);
                echo json_encode(['message' => 'Failed to initiate password reset. Please try again later.']);
            }

        } catch (PDOException $e) {
            error_log("Forgot password error: " . $e->getMessage());
            http_response_code(500);
            echo json_encode([
                'message' => 'Forgot password failed due to server error.',
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString()
            ]);
        } catch (Exception $e) {
            error_log("Forgot password general error: " . $e->getMessage() . " in " . $e->getFile() . " on line " . $e->getLine());
            http_response_code(500);
            echo json_encode([
                'message' => 'Forgot password failed due to an unexpected server error.',
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString()
            ]);
        }
    } else {
        http_response_code(405);
        echo json_encode(['message' => 'Method Not Allowed']);
    }
}

/**
 * Handles password reset using OTP.
 *
 * @param string $requestMethod The HTTP request method (e.g., 'POST').
 */
function handle_reset_password($requestMethod)
{
    global $pdo;

    if ($requestMethod === 'POST') {
        $data = json_decode(file_get_contents("php://input"), true);
        $email = $data['email'] ?? ''; // Added email for OTP verification
        $otp = $data['otp'] ?? '';
        $newPassword = $data['newPassword'] ?? '';

        if (!$email || !$otp || !$newPassword) {
            http_response_code(400);
            echo json_encode(['message' => 'Email, OTP, and new password are required.']);
            return;
        }

        if (strlen($newPassword) < 6) {
            http_response_code(400);
            echo json_encode(['message' => 'New password must be at least 6 characters long.']);
            return;
        }

        try {
            $stmt = $pdo->prepare('SELECT id, password_reset_token, password_reset_token_expires_at FROM users WHERE email = ?');
            $stmt->execute([$email]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$user) {
                http_response_code(400);
                echo json_encode(['message' => 'Invalid email or OTP.']); // Generic message for security
                return;
            }

            if ($user['password_reset_token'] !== $otp) {
                http_response_code(400);
                echo json_encode(['message' => 'Invalid email or OTP.']); // Generic message for security
                return;
            }

            $now = new DateTime('now', new DateTimeZone('UTC'));
            $expiresAt = new DateTime($user['password_reset_token_expires_at'], new DateTimeZone('UTC'));

            if ($now > $expiresAt) {
                http_response_code(400);
                echo json_encode(['message' => 'Password reset OTP has expired. Please request a new one.']);
                return;
            }

            $hashedNewPassword = password_hash($newPassword, PASSWORD_DEFAULT);

            $stmtUpdate = $pdo->prepare('UPDATE users SET password = ?, password_reset_token = NULL, password_reset_token_expires_at = NULL WHERE id = ?');
            $stmtUpdate->execute([$hashedNewPassword, $user['id']]);

            http_response_code(200);
            echo json_encode(['message' => 'Password has been reset successfully!']);

        } catch (PDOException $e) {
            error_log("Reset password error: " . $e->getMessage());
            http_response_code(500);
            echo json_encode([
                'message' => 'Password reset failed due to server error.',
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString()
            ]);
        } catch (Exception $e) {
            error_log("Reset password general error: " . $e->getMessage() . " in " . $e->getFile() . " on line " . $e->getLine());
            http_response_code(500);
            echo json_encode([
                'message' => 'Password reset failed due to an unexpected server error.',
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString()
            ]);
        }
    } else {
        http_response_code(405);
        echo json_encode(['message' => 'Method Not Allowed']);
    }
}

/**
 * Handles user profile updates and deletion.
 *
 * @param string $requestMethod The HTTP request method (e.g., 'PUT', 'DELETE').
 * @param int $userId The ID of the user whose profile is being managed.
 */
function handle_profile($requestMethod, $userId)
{
    global $pdo;

    if ($requestMethod === 'PUT') {
        error_log("handle_profile: PUT request received for user ID: {$userId}");
        $updates = json_decode(file_get_contents("php://input"), true);
        error_log("handle_profile: Received updates: " . json_encode($updates));

        unset($updates['password'], $updates['role'], $updates['id']);
        error_log("handle_profile: Updates after unsetting sensitive fields: " . json_encode($updates));

        if (empty($updates)) {
            error_log("handle_profile: No valid fields to update for user ID: {$userId}.");
            http_response_code(400);
            echo json_encode(['message' => 'No valid fields to update.']);
            return;
        }

        $setParts = [];
        $values = [];
        foreach ($updates as $key => $value) {
            if (in_array($key, ['email', 'username', 'college', 'phone', 'classType', 'classTypeNameFull', 'classLevel'])) {
                $setParts[] = "`{$key}` = ?";
                $values[] = $value === '' ? null : $value;
                error_log("handle_profile: Adding field to update: {$key} = " . var_export($value, true));
            } else {
                error_log("handle_profile: Skipping non-updatable field: {$key}");
            }
        }

        if (empty($setParts)) {
            error_log("handle_profile: No updatable fields provided after filtering for user ID: {$userId}.");
            http_response_code(400);
            echo json_encode(['message' => 'No updatable fields provided.']);
            return;
        }

        $sql = "UPDATE users SET " . implode(', ', $setParts) . " WHERE id = ?";
        $values[] = $userId;
        error_log("handle_profile: SQL query: {$sql}");
        error_log("handle_profile: SQL values: " . json_encode($values));

        try {
            // Check for duplicate email or username before updating
            if (isset($updates['email'])) {
                error_log("handle_profile: Checking for duplicate email: {$updates['email']}");
                $stmtCheckEmail = $pdo->prepare('SELECT id FROM users WHERE email = ? AND id != ?');
                $stmtCheckEmail->execute([$updates['email'], $userId]);
                if ($stmtCheckEmail->fetch(PDO::FETCH_ASSOC)) {
                    error_log("handle_profile: Duplicate email found: {$updates['email']}");
                    http_response_code(409);
                    echo json_encode(['message' => 'Email already exists.']);
                    return;
                }
            }

            if (isset($updates['username'])) {
                error_log("handle_profile: Checking for duplicate username: {$updates['username']}");
                $stmtCheckUsername = $pdo->prepare('SELECT id FROM users WHERE username = ? AND id != ?');
                $stmtCheckUsername->execute([$updates['username'], $userId]);
                if ($stmtCheckUsername->fetch(PDO::FETCH_ASSOC)) {
                    error_log("handle_profile: Duplicate username found: {$updates['username']}");
                    http_response_code(409);
                    echo json_encode(['message' => 'Username already exists.']);
                    return;
                }
            }

            error_log("handle_profile: Preparing update statement.");
            $stmt = $pdo->prepare($sql);
            error_log("handle_profile: Executing update statement.");
            $success = $stmt->execute($values);
            error_log("handle_profile: Update statement executed. Success: " . ($success ? 'true' : 'false') . ", Rows affected: " . $stmt->rowCount());

            if ($success && $stmt->rowCount() > 0) {
                http_response_code(200);
                echo json_encode(['message' => 'Profile Updated Successfully!']);
            } elseif ($stmt->rowCount() === 0) {
                error_log("handle_profile: No changes detected for profile update for user ID: {$userId}.");
                http_response_code(200); // No changes made is still a success, just no rows affected
                echo json_encode(['message' => 'No changes detected for profile update.']);
            } else {
                error_log("handle_profile: Failed to update profile for user ID: {$userId}. Unknown reason.");
                http_response_code(500);
                echo json_encode(['message' => 'Failed to update profile.']);
            }
        } catch (PDOException $e) {
            error_log("handle_profile: Update profile PDO error for user ID {$userId}: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['message' => 'Failed to update profile due to server error.']);
        }
    } elseif ($requestMethod === 'DELETE') {
        error_log("handle_profile: DELETE request received for user ID: {$userId}");
        try {
            // Delete related data from other tables first to maintain referential integrity
            $pdo->beginTransaction();
            error_log("handle_profile: Transaction started for user ID {$userId}.");

            // Delete user's content
            $stmtContent = $pdo->prepare('DELETE FROM content WHERE uploadedBy = ?');
            $stmtContent->execute([$userId]);
            error_log("handle_profile: Deleted " . $stmtContent->rowCount() . " content items for user ID {$userId}.");

            // Delete user's payment requests
            $stmtPayments = $pdo->prepare('DELETE FROM payment_requests WHERE userId = ?');
            $stmtPayments->execute([$userId]);
            error_log("handle_profile: Deleted " . $stmtPayments->rowCount() . " payment requests for user ID {$userId}.");

            // Delete user's chat messages
            $stmtChatMessages = $pdo->prepare('DELETE FROM chat_messages WHERE senderId = ?');
            $stmtChatMessages->execute([$userId]);
            error_log("handle_profile: Deleted " . $stmtChatMessages->rowCount() . " chat messages for user ID {$userId}.");

            // Delete user's chat conversations
            $stmtChatConversations = $pdo->prepare('DELETE FROM chat_conversations WHERE userId = ?');
            $stmtChatConversations->execute([$userId]);
            error_log("handle_profile: Deleted " . $stmtChatConversations->rowCount() . " chat conversations for user ID {$userId}.");

            // Delete user's discussion replies
            $stmtDiscussionReplies = $pdo->prepare('DELETE FROM discussion_replies WHERE createdBy = ?');
            $stmtDiscussionReplies->execute([$userId]);
            error_log("handle_profile: Deleted " . $stmtDiscussionReplies->rowCount() . " discussion replies for user ID {$userId}.");

            // Delete user's discussion reactions
            $stmtDiscussionReactions = $pdo->prepare('DELETE FROM discussion_reactions WHERE userId = ?');
            $stmtDiscussionReactions->execute([$userId]);
            error_log("handle_profile: Deleted " . $stmtDiscussionReactions->rowCount() . " discussion reactions for user ID {$userId}.");

            // Delete user's reply reactions
            $stmtReplyReactions = $pdo->prepare('DELETE FROM reply_reactions WHERE userId = ?');
            $stmtReplyReactions->execute([$userId]);
            error_log("handle_profile: Deleted " . $stmtReplyReactions->rowCount() . " reply reactions for user ID {$userId}.");

            // Delete user's discussions
            $stmtDiscussions = $pdo->prepare('DELETE FROM discussions WHERE createdBy = ?');
            $stmtDiscussions->execute([$userId]);
            error_log("handle_profile: Deleted " . $stmtDiscussions->rowCount() . " discussions for user ID {$userId}.");

            // Delete user's notifications
            $stmtNotifications = $pdo->prepare('DELETE FROM notifications WHERE recipientId = ?');
            $stmtNotifications->execute([$userId]);
            error_log("handle_profile: Deleted " . $stmtNotifications->rowCount() . " notifications for user ID {$userId}.");

            // Delete user's queries
            $stmtUserQueries = $pdo->prepare('DELETE FROM user_queries WHERE userId = ?');
            $stmtUserQueries->execute([$userId]);
            error_log("handle_profile: Deleted " . $stmtUserQueries->rowCount() . " user queries for user ID {$userId}.");

            // Finally, delete the user record
            $stmtUser = $pdo->prepare('DELETE FROM users WHERE id = ?');
            $stmtUser->execute([$userId]);
            error_log("handle_profile: Attempted to delete user record for ID {$userId}. Rows affected: " . $stmtUser->rowCount());

            if ($stmtUser->rowCount() === 0) {
                $pdo->rollBack();
                error_log("handle_profile: User with ID {$userId} not found for deletion.");
                http_response_code(404);
                echo json_encode(['message' => 'User not found.']);
                return;
            }

            $pdo->commit();
            error_log("handle_profile: Account deleted successfully for user ID {$userId}.");
            http_response_code(200);
            echo json_encode(['message' => 'Account deleted successfully!']);
        } catch (PDOException $e) {
            $pdo->rollBack();
            error_log("handle_profile: Delete user account PDO error for user ID {$userId}: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['message' => 'Failed to delete account due to server error. Please try again.']);
        }
    } else {
        http_response_code(405);
        echo json_encode(['message' => 'Method Not Allowed']);
    }
}

/**
 * Fetches a single user's details.
 *
 * @param string $requestMethod The HTTP request method (e.g., 'GET').
 * @param int $userId The ID of the user to fetch.
 */
function handle_get_user($requestMethod, $userId)
{
    global $pdo;

    if ($requestMethod === 'GET') {
        error_log("handle_get_user: Attempting to fetch user with ID: {$userId}");
        try {
            error_log("handle_get_user: Preparing SQL statement.");
            $stmt = $pdo->prepare(
                'SELECT id, email, username, college, phone, classType, classTypeNameFull, classLevel, role, hasPendingPayment, hasMaterialAccess, materialTrialStartTime, materialTrialEndTime, materialPaidAccessEndTime, isConfirmed FROM users WHERE id = ?'
            );
            error_log("handle_get_user: Executing SQL statement for user ID: {$userId}.");
            $stmt->execute([$userId]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);
            error_log("handle_get_user: SQL statement executed. User fetched: " . ($user ? 'true' : 'false'));

            if (!$user) {
                error_log("handle_get_user: User with ID {$userId} not found.");
                http_response_code(404);
                echo json_encode(['message' => 'User not found.']);
                return;
            }

            error_log("handle_get_user: Processing user data for ID: {$userId}.");
            $user['hasPendingPayment'] = (bool) $user['hasPendingPayment'];
            $user['hasMaterialAccess'] = (bool) $user['hasMaterialAccess'];

            // Check for Global Free Access override
            $user['isGlobalFreeAccessEnabled'] = isGlobalFreeAccessEnabled();
            if ($user['isGlobalFreeAccessEnabled']) {
                $user['hasMaterialAccess'] = true;
            }
            $user['isConfirmed'] = (bool) $user['isConfirmed']; // Explicitly cast to boolean

            // Removed profilePictureUrl processing as per user feedback.

            error_log("handle_get_user: Formatting date/time fields for user ID: {$userId}.");
            // Format all date/time fields to ISO 8601 UTC
            $dateFields = [
                'materialTrialStartTime',
                'materialTrialEndTime',
                'materialPaidAccessEndTime'
            ];
            foreach ($dateFields as $field) {
                if (isset($user[$field]) && $user[$field] !== null) {
                    try {
                        $dateTime = new DateTime($user[$field], new DateTimeZone('UTC'));
                        $user[$field] = $dateTime->format(DateTime::ATOM);
                        error_log("handle_get_user: Formatted {$field}: " . $user[$field]);
                    } catch (Exception $e) {
                        error_log("handle_get_user: Error formatting user date field {$field} ('{$user[$field]}'): " . $e->getMessage());
                        // $user[$field] = null; // Don't nullify! Keep raw value so frontend sees it's not empty.
                        // If we return null, the frontend thinks the trial never started.
                        // By returning the raw string (even if invalid), Boolean(startTime) is true, hiding the button.
                    }
                }
            }

            error_log("handle_get_user: Final user data before JSON encoding for ID {$userId}: " . json_encode($user));
            http_response_code(200);
            echo json_encode($user);
        } catch (PDOException $e) {
            error_log("Fetch single user error: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['message' => 'Failed to fetch user due to server error.']);
        }
    } else {
        http_response_code(405);
        echo json_encode(['message' => 'Method Not Allowed']);
    }
}

/**
 * Handles updating a user's password.
 *
 * @param string $requestMethod The HTTP request method (e.g., 'PUT').
 * @param int $userId The ID of the user whose password is to be updated.
 */
function handle_update_password($requestMethod, $userId)
{
    global $pdo;

    if ($requestMethod === 'PUT') {
        $data = json_decode(file_get_contents("php://input"), true);
        $currentPassword = $data['currentPassword'] ?? '';
        $newPassword = $data['newPassword'] ?? '';

        if (!$currentPassword || !$newPassword) {
            http_response_code(400);
            echo json_encode(['message' => 'Current and new passwords are required.']);
            return;
        }

        try {
            $stmt = $pdo->prepare('SELECT password FROM users WHERE id = ?');
            $stmt->execute([$userId]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$user) {
                http_response_code(404);
                echo json_encode(['message' => 'User not found.']);
                return;
            }

            if (!password_verify($currentPassword, $user['password'])) {
                http_response_code(401);
                echo json_encode(['message' => 'Incorrect current password.']);
                return;
            }

            $hashedNewPassword = password_hash($newPassword, PASSWORD_DEFAULT);

            $stmtUpdate = $pdo->prepare('UPDATE users SET password = ? WHERE id = ?');
            $success = $stmtUpdate->execute([$hashedNewPassword, $userId]);

            if ($success && $stmtUpdate->rowCount() > 0) {
                http_response_code(200);
                echo json_encode(['message' => 'Password updated successfully!']);
            } elseif ($stmtUpdate->rowCount() === 0) {
                if (password_verify($newPassword, $user['password'])) {
                    http_response_code(200);
                    echo json_encode(['message' => 'New password is the same as the old one. No update needed.']);
                } else {
                    http_response_code(500);
                    echo json_encode(['message' => 'Failed to update password. No rows affected.']);
                }
            } else {
                http_response_code(500);
                echo json_encode(['message' => 'Failed to update password.']);
            }
        } catch (PDOException $e) {
            error_log("Update password error: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['message' => 'Failed to update password due to server error.']);
        }
    } else {
        http_response_code(405);
        echo json_encode(['message' => 'Method Not Allowed']);
    }
}

/**
 * Handles admin operations for users (fetching, creating).
 *
 * @param string $requestMethod The HTTP request method (e.g., 'GET', 'POST').
 */
function handle_admin_users($requestMethod)
{
    global $pdo;

    if ($requestMethod === 'GET') {
        $search = $_GET['search'] ?? '';
        try {
            $query = 'SELECT id, email, username, role, college, phone, classType, classTypeNameFull, classLevel, hasPendingPayment, hasMaterialAccess, materialPaidAccessEndTime FROM users';
            $params = [];

            if ($search) {
                $query .= ' WHERE username LIKE ? OR email LIKE ?';
                $params = ["%{$search}%", "%{$search}%"];
            }

            $stmt = $pdo->prepare($query);
            $stmt->execute($params);
            $usersArr = $stmt->fetchAll(PDO::FETCH_ASSOC);

            foreach ($usersArr as &$user) {
                $user['hasPendingPayment'] = (bool) $user['hasPendingPayment'];
                $user['hasMaterialAccess'] = (bool) $user['hasMaterialAccess'];
            }
            unset($user);

            // Maintain the structure expected by the frontend (which might expect { users: [...] })
            // Looking at AdminUsersTab.tsx might clarify, but usually it's just the array
            // Correction: the frontend utility searchUsersForGrant expects { users: [...] }
            http_response_code(200);
            echo json_encode(['users' => $usersArr]);
        } catch (PDOException $e) {
            error_log("Admin fetch users error: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['message' => 'Error fetching users for admin.']);
        }
    } elseif ($requestMethod === 'POST') {
        $data = json_decode(file_get_contents("php://input"), true);
        $email = $data['email'] ?? '';
        $username = $data['username'] ?? '';
        $password = $data['password'] ?? '';
        $role = $data['role'] ?? 'student';
        $college = $data['college'] ?? null;
        $phone = $data['phone'] ?? null;
        $classType = $data['classType'] ?? null;
        $classTypeNameFull = $data['classTypeNameFull'] ?? null;
        $classLevel = $data['classLevel'] ?? null;
        $hasMaterialAccess = $data['hasMaterialAccess'] ?? false;

        if (!$email || !$username || !$password || !$role) {
            http_response_code(400);
            echo json_encode(['message' => 'Missing required fields: email, username, password, role.']);
            return;
        }

        try {
            $hashedPassword = password_hash($password, PASSWORD_DEFAULT);

            // For admin-created users, they are considered confirmed by default, and no trial is started immediately.
            $stmt = $pdo->prepare(
                'INSERT INTO users (email, username, password, role, college, phone, classType, classTypeNameFull, classLevel, hasPendingPayment, hasMaterialAccess, materialTrialStartTime, materialTrialEndTime, materialPaidAccessEndTime, isConfirmed, confirmation_token, confirmation_token_expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
            );

            // Convert empty strings to null for optional fields before insertion
            $collegeToInsert = empty($college) ? null : $college;
            $phoneToInsert = empty($phone) ? null : $phone;
            $classTypeToInsert = empty($classType) ? null : $classType;
            $classTypeNameFullToInsert = empty($classTypeNameFull) ? null : $classTypeNameFull;
            $classLevelToInsert = empty($classLevel) ? null : $classLevel;

            $result = $stmt->execute([
                $email,
                $username,
                $hashedPassword,
                $role,
                $collegeToInsert,
                $phoneToInsert,
                $classTypeToInsert,
                $classTypeNameFullToInsert,
                $classLevelToInsert,
                0, // hasPendingPayment (false)
                (int) (bool) $hasMaterialAccess, // Explicitly cast to integer (0 or 1)
                null, // materialTrialStartTime
                null, // materialTrialEndTime
                null, // materialPaidAccessEndTime
                1, // isConfirmed (true)
                null, // confirmation_token
                null // confirmation_token_expires_at
            ]);

            if ($result) {
                $userId = $pdo->lastInsertId();
                http_response_code(201);
                echo json_encode(['message' => 'User created successfully!', 'userId' => $userId]);
            } else {
                http_response_code(500);
                echo json_encode(['message' => 'Failed to create user.']);
            }
        } catch (PDOException $e) {
            error_log("Admin create user error: " . $e->getMessage());
            if ($e->getCode() === '23000') {
                http_response_code(409);
                echo json_encode(['message' => 'Email or username already exists.']);
            } else {
                http_response_code(500);
                echo json_encode(['message' => 'Failed to create user due to server error.']);
            }
        } catch (PDOException $e) {
            error_log("Admin create user error: " . $e->getMessage());
            if ($e->getCode() === '23000') {
                http_response_code(409);
                echo json_encode(['message' => 'Email or username already exists.']);
            } else {
                // Include the specific PDOException message for better debugging
                http_response_code(500);
                echo json_encode(['message' => 'Failed to create user due to server error.', 'details' => $e->getMessage()]);
            }
        }
    } else {
        http_response_code(405);
        echo json_encode(['message' => 'Method Not Allowed']);
    }
}

/**
 * Handles admin operations for updating or deleting a specific user.
 *
 * @param string $requestMethod The HTTP request method (e.g., 'PUT', 'DELETE').
 * @param int $userId The ID of the user to update or delete.
 */
function handle_admin_update_user($requestMethod, $userId)
{
    global $pdo;

    // Wrap the entire function logic in a try-catch to catch any unexpected errors
    try {
        if ($requestMethod === 'PUT') {
            $updates = json_decode(file_get_contents("php://input"), true);

            unset($updates['id']);

            $hashedPassword = null;
            if (isset($updates['password'])) {
                $hashedPassword = password_hash($updates['password'], PASSWORD_DEFAULT);
                unset($updates['password']);
            }

            $fieldsToUpdate = [];
            $values = [];

            $allowedFields = [
                'email',
                'username',
                'role',
                'college',
                'phone',
                'classType',
                'classTypeNameFull',
                'classLevel',
                'isConfirmed'
                // Note: hasMaterialAccess and hasPendingPayment are intentionally excluded
                // to preserve payment access when admin changes user class.
                // These fields should only be modified via grantMaterialAccess/revokeMaterialAccess.
            ];

            // Pre-process updates to auto-resolve classTypeNameFull and force default classLevel
            if (isset($updates['classType']) && $updates['classType']) {
                error_log("Admin update user: Processing classType '{$updates['classType']}' for user {$userId}");

                $stmtClass = $pdo->prepare('SELECT id, name FROM classes WHERE LOWER(classCode) = LOWER(?)');
                $stmtClass->execute([$updates['classType']]);
                $classInfo = $stmtClass->fetch(PDO::FETCH_ASSOC);

                if ($classInfo) {
                    error_log("Admin update user: Found class ID {$classInfo['id']}, name '{$classInfo['name']}'");

                    // 1. Auto-set full class name
                    $updates['classTypeNameFull'] = $classInfo['name'];

                    // 2. Auto-set default level if not provided or likely invalid
                    $stmtLevel = $pdo->prepare("SELECT name FROM class_levels WHERE classId = ? ORDER BY name ASC LIMIT 1");
                    $stmtLevel->execute([$classInfo['id']]);
                    $defaultLevel = $stmtLevel->fetchColumn();

                    if ($defaultLevel) {
                        error_log("Admin update user: Default level for class {$classInfo['id']} is '{$defaultLevel}'");

                        $newCode = strtolower($updates['classType']);
                        $incomingLevel = strtolower($updates['classLevel'] ?? '');

                        error_log("Admin update user: Incoming classLevel: '{$incomingLevel}', newCode: '{$newCode}'");

                        // Heuristic: If incoming level is empty OR doesn't contain the first 2 chars of the new class code
                        if (empty($incomingLevel) || strpos($incomingLevel, substr($newCode, 0, 2)) === false) {
                            error_log("Admin update user: Overriding classLevel to default '{$defaultLevel}'");
                            $updates['classLevel'] = $defaultLevel;
                        } else {
                            error_log("Admin update user: Keeping incoming classLevel '{$incomingLevel}'");
                        }
                    } else {
                        error_log("Admin update user: WARNING - No default level found for class ID {$classInfo['id']}");
                    }
                } else {
                    error_log("Admin update user: WARNING - Class not found for classType '{$updates['classType']}'");
                }
            }

            foreach ($updates as $key => $value) {
                if (in_array($key, $allowedFields)) {
                    $fieldsToUpdate[] = "`{$key}` = ?";

                    // Convert boolean fields to integers for MySQL compatibility
                    if ($key === 'hasMaterialAccess' || $key === 'hasPendingPayment' || $key === 'isConfirmed') {
                        $values[] = $value ? 1 : 0;
                    } else {
                        $values[] = $value === '' ? null : $value;
                    }
                }
            }

            if (isset($updates['grantMaterialAccess'])) {
                $fieldsToUpdate[] = 'hasMaterialAccess = ?';
                $values[] = 1; // Explicitly cast true to 1
                $fieldsToUpdate[] = 'materialPaidAccessEndTime = ?';
                $durationDays = $updates['materialAccessDurationDays'] ?? 7;
                $accessEndTime = new DateTime();
                $accessEndTime->modify("+{$durationDays} days");
                $values[] = $accessEndTime->format('Y-m-d H:i:s');
            } elseif (isset($updates['revokeMaterialAccess'])) {
                $fieldsToUpdate[] = 'hasMaterialAccess = ?';
                $values[] = 0; // Explicitly cast false to 0
                $fieldsToUpdate[] = 'materialPaidAccessEndTime = ?';
                $values[] = null;
            }

            if (empty($fieldsToUpdate) && !$hashedPassword) {
                http_response_code(400);
                echo json_encode(['message' => 'No valid fields to update.']);
                return;
            }

            if ($hashedPassword) {
                $fieldsToUpdate[] = 'password = ?';
                $values[] = $hashedPassword;
            }

            $sql = "UPDATE users SET " . implode(', ', $fieldsToUpdate) . " WHERE id = ?";
            $values[] = $userId;

            try {
                error_log("Admin update user: Preparing UPDATE query with " . count($fieldsToUpdate) . " fields for user {$userId}");
                error_log("Admin update user: SQL: " . $sql);
                error_log("Admin update user: Values: " . json_encode($values));

                $stmt = $pdo->prepare($sql);
                $success = $stmt->execute($values);

                error_log("Admin update user: Query executed. Success: " . ($success ? 'true' : 'false') . ", Rows affected: " . $stmt->rowCount());

                if ($success && $stmt->rowCount() > 0) {
                    // TODO: Implement createNotification function
                    // if ($hashedPassword && $currentUser && $hashedPassword !== $currentUser['password']) {
                    //     createNotification(Number($userId), 'password_change', 'Your account password has been securely updated by an administrator.', null);
                    // }
                    http_response_code(200);
                    echo json_encode(['message' => 'User updated successfully!']);
                } elseif ($stmt->rowCount() === 0) {
                    http_response_code(200); // Changed to 200 OK
                    echo json_encode(['message' => 'No changes detected for user update.']); // More specific message
                } else {
                    // This else block should ideally not be reached if $success is properly handled.
                    // If execute returns false, it should throw a PDOException.
                    // For robustness, we'll keep it, but it might indicate an unexpected state.
                    http_response_code(500);
                    echo json_encode(['message' => 'Failed to update user due to an unknown server issue.']);
                }
            } catch (PDOException $e) {
                error_log("Admin update user error (PDOException): " . $e->getMessage() . " in " . $e->getFile() . " on line " . $e->getLine());
                if ($e->getCode() === '23000') {
                    http_response_code(409);
                    echo json_encode(['message' => 'Email or username already exists.']);
                } else {
                    http_response_code(500);
                    echo json_encode([
                        'message' => 'Failed to update user due to server error.',
                        'error' => $e->getMessage(), // Include the specific PDO error message
                        'file' => $e->getFile(),
                        'line' => $e->getLine()
                    ]);
                }
            }
        } elseif ($requestMethod === 'DELETE') {
            try {
                $stmt = $pdo->prepare('DELETE FROM users WHERE id = ?');
                $stmt->execute([$userId]);

                if ($stmt->rowCount() === 0) {
                    http_response_code(404);
                    echo json_encode(['message' => 'User not found.']);
                    return;
                }

                http_response_code(200);
                echo json_encode(['message' => 'User deleted successfully!']);
            } catch (PDOException $e) {
                error_log("Admin delete user error: " . $e->getMessage());
                http_response_code(500);
                echo json_encode(['message' => 'Failed to delete user due to server error.']);
            }
        } else {
            http_response_code(405);
            echo json_encode(['message' => 'Method Not Allowed']);
        }
    } catch (Throwable $e) { // Catch any Throwable (Errors and Exceptions)
        error_log("FATAL Admin update user error (Throwable): " . $e->getMessage() . " in " . $e->getFile() . " on line " . $e->getLine());
        http_response_code(500);
        echo json_encode([
            'message' => 'A critical server error occurred during user update.',
            'error' => $e->getMessage(),
            'file' => $e->getFile(),
            'line' => $e->getLine(),
            'trace' => $e->getTraceAsString()
        ]);
    }
}

/**
 * Handles termination of a specific user session.
 * This function is intended to be called when a user chooses to terminate an existing session.
 *
 * @param string $requestMethod The HTTP request method (e.g., 'POST').
 */
function handle_terminate_session($requestMethod)
{
    global $pdo;

    if ($requestMethod === 'POST') {
        // Authenticate using the session resolution token
        $headers = getallheaders();
        $authHeader = $headers['Authorization'] ?? '';
        preg_match('/Bearer\s(\S+)/', $authHeader, $matches);
        $token = $matches[1] ?? null;

        $decodedToken = null;
        if ($token) {
            $decodedToken = validateJwtToken($token);
        }

        if (!$decodedToken || !isset($decodedToken->userId) || (isset($decodedToken->type) && $decodedToken->type !== 'session_resolution')) {
            http_response_code(401);
            echo json_encode(['message' => 'Unauthorized: Invalid or missing session resolution token.']);
            return;
        }

        $currentUserId = $decodedToken->userId;
        $data = json_decode(file_get_contents("php://input"), true);
        $sessionIdToTerminate = $data['sessionId'] ?? null;

        if (!$sessionIdToTerminate) {
            http_response_code(400);
            echo json_encode(['message' => 'Session ID is required for termination.']);
            return;
        }

        try {
            // Verify that the session to be terminated belongs to the user from the token
            $stmtCheckOwnership = $pdo->prepare('SELECT user_id FROM user_sessions WHERE session_id = ?');
            $stmtCheckOwnership->execute([$sessionIdToTerminate]);
            $session = $stmtCheckOwnership->fetch(PDO::FETCH_ASSOC);

            if (!$session) {
                http_response_code(404);
                echo json_encode(['message' => 'Session not found.']);
                return;
            }

            if ($session['user_id'] != $currentUserId) {
                http_response_code(403); // Forbidden
                echo json_encode(['message' => 'You are not authorized to terminate this session.']);
                return;
            }

            // Mark the session as inactive
            $stmtTerminate = $pdo->prepare('UPDATE user_sessions SET is_active = FALSE, last_activity = CURRENT_TIMESTAMP WHERE session_id = ?');
            $success = $stmtTerminate->execute([$sessionIdToTerminate]);
            $rowCount = $stmtTerminate->rowCount();
            error_log("handle_terminate_session: Session ID {$sessionIdToTerminate} marked as inactive. Rows affected: {$rowCount}.");

            if ($success && $rowCount > 0) {
                http_response_code(200);
                echo json_encode(['message' => 'Session terminated successfully.']);
            } else {
                error_log("handle_terminate_session: Failed to terminate session ID {$sessionIdToTerminate}. Success: " . ($success ? 'true' : 'false') . ", Rows affected: {$rowCount}.");
                http_response_code(500);
                echo json_encode(['message' => 'Failed to terminate session.']);
            }

        } catch (PDOException $e) {
            error_log("Terminate session error: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['message' => 'Failed to terminate session due to server error.']);
        }
    } else {
        http_response_code(405);
        echo json_encode(['message' => 'Method Not Allowed']);
    }
}

/**
 * Handles termination of all other active user sessions for a given user.
 * This function is intended to be called when a user chooses to terminate all other sessions.
 *
 * @param string $requestMethod The HTTP request method (e.g., 'POST').
 */
function handle_terminate_all_other_sessions($requestMethod)
{
    global $pdo;

    if ($requestMethod === 'POST') {
        // Authenticate using the session resolution token
        $headers = getallheaders();
        $authHeader = $headers['Authorization'] ?? '';
        preg_match('/Bearer\s(\S+)/', $authHeader, $matches);
        $token = $matches[1] ?? null;

        $decodedToken = null;
        if ($token) {
            $decodedToken = validateJwtToken($token);
        }

        if (!$decodedToken || !isset($decodedToken->userId) || (isset($decodedToken->type) && $decodedToken->type !== 'session_resolution')) {
            http_response_code(401);
            echo json_encode(['message' => 'Unauthorized: Invalid or missing session resolution token.']);
            return;
        }

        $userId = $decodedToken->userId;
        $data = json_decode(file_get_contents("php://input"), true);
        $currentSessionId = $data['currentSessionId'] ?? null; // The session ID of the current login attempt (can be null)

        // If currentSessionId is null, it means the new device hasn't logged in yet,
        // so we want to terminate ALL active sessions for this user.
        // The SQL query already handles `session_id != ?`, so if `currentSessionId` is null,
        // it will effectively terminate all sessions where `user_id = ?`.
        // We can simplify the check here.
        if (!$userId) {
            http_response_code(400);
            echo json_encode(['message' => 'User ID is required to terminate other sessions.']);
            return;
        }

        try {
            // Mark all other active sessions for this user as inactive
            // If currentSessionId is null, the `session_id != ?` condition will effectively be `session_id != NULL`,
            // which is always false, so it will update all sessions for the user.
            // To correctly handle `null` for `currentSessionId` and terminate all sessions,
            // we need to adjust the SQL or the logic.
            // Let's make it explicit: if currentSessionId is null, terminate all.
            error_log("handle_terminate_all_other_sessions: User ID: {$userId}, Current Session ID: " . ($currentSessionId ?? 'NULL'));
            if ($currentSessionId === null) {
                error_log("handle_terminate_all_other_sessions: Terminating ALL active sessions for user ID: {$userId}.");
                $stmtTerminateAll = $pdo->prepare('UPDATE user_sessions SET is_active = FALSE, last_activity = CURRENT_TIMESTAMP WHERE user_id = ? AND is_active = TRUE');
                $success = $stmtTerminateAll->execute([$userId]);
            } else {
                error_log("handle_terminate_all_other_sessions: Terminating all sessions EXCEPT {$currentSessionId} for user ID: {$userId}.");
                $stmtTerminateAll = $pdo->prepare('UPDATE user_sessions SET is_active = FALSE, last_activity = CURRENT_TIMESTAMP WHERE user_id = ? AND session_id != ? AND is_active = TRUE');
                $success = $stmtTerminateAll->execute([$userId, $currentSessionId]);
            }

            if ($success) {
                // Return success message, potentially indicating how many sessions were terminated
                $rowCount = $stmtTerminateAll->rowCount();
                error_log("handle_terminate_all_other_sessions: Successfully terminated {$rowCount} other active sessions for user ID: {$userId}.");
                http_response_code(200);
                echo json_encode(['message' => "Successfully terminated {$rowCount} other active sessions."]);
            } else {
                error_log("handle_terminate_all_other_sessions: Failed to terminate other sessions for user ID: {$userId}. Success: " . ($success ? 'true' : 'false'));
                http_response_code(500);
                echo json_encode(['message' => 'Failed to terminate other sessions.']);
            }

        } catch (PDOException $e) {
            error_log("Terminate all other sessions error: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['message' => 'Failed to terminate other sessions due to server error.']);
        }
    } else {
        http_response_code(405);
        echo json_encode(['message' => 'Method Not Allowed']);
    }
}

/**
 * Handles token validation requests.
 *
 * @param string $requestMethod The HTTP request method (e.g., 'GET').
 */
function handle_validate_token($requestMethod)
{
    global $pdo;

    if ($requestMethod === 'GET') {
        $headers = getallheaders();
        $authHeader = $headers['Authorization'] ?? '';
        preg_match('/Bearer\s(\S+)/', $authHeader, $matches);
        $token = $matches[1] ?? null;

        if (!$token) {
            http_response_code(401);
            echo json_encode(['message' => 'Unauthorized: No token provided.', 'valid' => false]);
            return;
        }

        $decodedToken = validateJwtToken($token);

        if ($decodedToken) {
            // Fetch full user profile to ensure client synchronization
            $stmt = $pdo->prepare('SELECT id, email, username, college, phone, classType, classTypeNameFull, classLevel, role, hasMaterialAccess, materialTrialStartTime, materialTrialEndTime, materialPaidAccessEndTime, hasPendingPayment, isConfirmed FROM users WHERE id = ?');
            $stmt->execute([$decodedToken->userId]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($user) {
                $user['hasMaterialAccess'] = (bool) $user['hasMaterialAccess'];

                $user['hasPendingPayment'] = (bool) $user['hasPendingPayment'];
                $user['isConfirmed'] = (bool) $user['isConfirmed'];
                $user['isGlobalFreeAccessEnabled'] = isGlobalFreeAccessEnabled();
                if ($user['isGlobalFreeAccessEnabled']) {
                    $user['hasMaterialAccess'] = true;
                }

                // Format dates to ISO 8601 UTC
                $dateFields = [
                    'materialTrialStartTime',
                    'materialTrialEndTime',
                    'materialPaidAccessEndTime'
                ];
                foreach ($dateFields as $field) {
                    if (isset($user[$field]) && $user[$field] !== null) {
                        try {
                            $date = new DateTime($user[$field], new DateTimeZone('UTC'));
                            $user[$field] = $date->format(DateTime::ATOM);
                        } catch (Exception $e) {
                            error_log("Error formatting date field '{$field}': " . $e->getMessage());
                            // Keep original value if formatting fails
                        }
                    }
                }

                http_response_code(200);
                echo json_encode(['message' => 'Token is valid.', 'valid' => true, 'user' => $user]);
            } else {
                http_response_code(401);
                echo json_encode(['message' => 'Unauthorized: User not found.', 'valid' => false]);
            }
        } else {
            http_response_code(401);
            echo json_encode(['message' => 'Unauthorized: Invalid or expired token.', 'valid' => false]);
        }
    } else {
        http_response_code(405);
        echo json_encode(['message' => 'Method Not Allowed']);
    }
}
/**
 * Checks if a user with the given email or username already exists.
 *
 * @param string $requestMethod The HTTP request method (e.g., 'POST').
 */
function handle_check_user_existence($requestMethod)
{
    global $pdo;

    if ($requestMethod === 'POST') {
        $data = json_decode(file_get_contents("php://input"), true);
        $email = $data['email'] ?? '';
        $username = $data['username'] ?? '';

        if (!$email && !$username) {
            http_response_code(400);
            echo json_encode(['message' => 'Email or username is required.']);
            return;
        }

        try {
            $query = 'SELECT id, email, username FROM users WHERE ';
            $params = [];
            $conditions = [];

            if ($email) {
                $conditions[] = 'email = ?';
                $params[] = $email;
            }
            if ($username) {
                $conditions[] = 'username = ?';
                $params[] = $username;
            }

            $query .= implode(' OR ', $conditions);

            $stmt = $pdo->prepare($query);
            $stmt->execute($params);
            $existingUsers = $stmt->fetchAll(PDO::FETCH_ASSOC);

            if ($existingUsers) {
                $existsEmail = false;
                $existsUsername = false;

                foreach ($existingUsers as $user) {
                    if ($email && $user['email'] === $email)
                        $existsEmail = true;
                    if ($username && $user['username'] === $username)
                        $existsUsername = true;
                }

                http_response_code(200);
                echo json_encode([
                    'exists' => true,
                    'existsEmail' => $existsEmail,
                    'existsUsername' => $existsUsername,
                    'message' => 'User already exists.'
                ]);
            } else {
                http_response_code(200);
                echo json_encode([
                    'exists' => false,
                    'message' => 'User available.'
                ]);
            }

        } catch (PDOException $e) {
            error_log("Check user existence error: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['message' => 'Server error while checking user existence.']);
        }
    } else {
        http_response_code(405);
        echo json_encode(['message' => 'Method Not Allowed']);
    }
}
