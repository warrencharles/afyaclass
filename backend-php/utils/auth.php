<?php

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/app_config.php'; // Include app config for JWT_SECRET_KEY
require_once __DIR__ . '/../vendor/autoload.php'; // Autoload Composer dependencies

use Firebase\JWT\JWT;
use Firebase\JWT\Key;

/**
 * Generates a JWT token for a given user.
 * @param array $user User data to include in the token payload.
 * @return string The generated JWT token.
 */
function generateJwtToken(array $user): string
{
    $issuedAt = time();
    $expirationTime = $issuedAt + (60 * 60 * 24); // Token valid for 24 hours

    $payload = [
        'iat' => $issuedAt,
        'exp' => $expirationTime,
        'userId' => $user['id'],
        'email' => $user['email'],
        'role' => $user['role'],
        'sessionId' => $user['sessionId'] ?? null // Include sessionId in JWT payload
    ];

    return JWT::encode($payload, JWT_SECRET_KEY, 'HS256');
}

/**
 * Generates a short-lived JWT token specifically for session resolution.
 * @param int $userId The ID of the user for whom the token is generated.
 * @return string The generated session resolution JWT token.
 */
function generateSessionResolutionToken(int $userId): string
{
    $issuedAt = time();
    $expirationTime = $issuedAt + (60 * 5); // Token valid for 5 minutes

    $payload = [
        'iat' => $issuedAt,
        'exp' => $expirationTime,
        'userId' => $userId,
        'type' => 'session_resolution' // Indicate this is a special token for session resolution
    ];

    return JWT::encode($payload, JWT_SECRET_KEY, 'HS256');
}

/**
 * Validates a JWT token and checks session activity (for regular tokens) or token type (for special tokens).
 * @param string $token The JWT token to validate.
 * @return object|null The decoded token payload if valid, otherwise null.
 */
function validateJwtToken(string $token): ?object
{
    global $pdo; // Access PDO for database operations

    try {
        $decoded = JWT::decode($token, new Key(JWT_SECRET_KEY, 'HS256'));

        // Check token type
        if (isset($decoded->type) && $decoded->type === 'session_resolution') {
            // For session resolution tokens, only validate signature and expiration.
            // No need to check user_sessions table as this token is for resolving conflicts.
            if (!isset($decoded->userId)) {
                error_log("JWT validation error: Session resolution token missing userId.");
                return null;
            }
            return $decoded;
        }

        // For regular authentication tokens, check session activity
        if (isset($decoded->userId) && isset($decoded->sessionId)) {
            $stmt = $pdo->prepare("SELECT is_active FROM user_sessions WHERE user_id = ? AND session_id = ?");
            $stmt->execute([$decoded->userId, $decoded->sessionId]);
            $session = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$session || !(bool) $session['is_active']) {
                error_log("JWT validation error: Session ID {$decoded->sessionId} for user {$decoded->userId} is inactive or not found.");
                return null; // Session is inactive or not found
            }

            // Update last_activity timestamp to keep the session alive
            $updateStmt = $pdo->prepare("UPDATE user_sessions SET last_activity = CURRENT_TIMESTAMP WHERE user_id = ? AND session_id = ?");
            $updateStmt->execute([$decoded->userId, $decoded->sessionId]);
        } else {
            error_log("JWT validation error: Missing userId or sessionId in token payload for regular token.");
            return null; // Token payload missing required session info
        }

        return $decoded;
    } catch (Exception $e) {
        error_log("JWT validation error: " . $e->getMessage());
        return null;
    }
}

/**
 * Authenticates the user based on the Authorization header (JWT).
 * Returns the user array if authenticated, otherwise null.
 * This function now strictly relies on JWT and session validation.
 */
function authenticate()
{
    global $pdo;

    $headers = getallheaders();
    $token = null;

    // Extract token from Authorization header
    if (isset($headers['Authorization'])) {
        if (preg_match('/Bearer\s(\S+)/', $headers['Authorization'], $matches)) {
            $token = $matches[1];
        }
    }

    if (!$token) {
        return null; // Missing token
    }

    $decodedToken = validateJwtToken($token);

    if (!$decodedToken || !isset($decodedToken->userId)) {
        return null; // Invalid or expired token, or missing userId
    }

    // Fetch user details from the database using the userId from the decoded token
    try {
        $stmt = $pdo->prepare("SELECT id, email, username, college, phone, classType, classTypeNameFull, classLevel, role, hasPendingPayment, hasMaterialAccess, materialTrialStartTime, materialTrialEndTime, materialPaidAccessEndTime, isConfirmed FROM users WHERE id = ?");
        $stmt->execute([$decodedToken->userId]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($user) {
            // Explicitly cast boolean-like fields
            $user['hasPendingPayment'] = (bool) $user['hasPendingPayment'];
            $user['hasMaterialAccess'] = (bool) $user['hasMaterialAccess'];
            $user['isConfirmed'] = (bool) $user['isConfirmed'];

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
                    } catch (Exception $e) {
                        error_log("Error formatting user data date field {$field} during authentication: " . $e->getMessage());
                        $user[$field] = null; // Fallback to null on error
                    }
                }
            }
            return $user;
        }

        return null; // User not found in database
    } catch (PDOException $e) {
        error_log("Authentication error fetching user details: " . $e->getMessage());
        return null;
    }
}

/**
 * Authenticates an admin user based on the Authorization header (JWT).
 * Returns the user array if authenticated and is an admin, otherwise exits with a 403.
 */
function authenticate_admin()
{
    $user = authenticate(); // Use the existing authentication function
    if ($user && isset($user['role']) && $user['role'] === 'admin') {
        return $user;
    } else {
        http_response_code(403); // Forbidden
        header('Content-Type: application/json'); // Ensure JSON header is set
        echo json_encode(['message' => 'Access Denied: Admin privileges required.']);
        exit(); // Terminate script execution
    }
}
?>