<?php

ob_start(); // Start output buffering at the very beginning


// Start the session at the very beginning to ensure it's available for all requests
if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

// Load environment variables from .env file
require_once __DIR__ . '/../vendor/autoload.php'; // Ensure Composer autoloader is included
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/../');
$dotenv->load();

// Error handling configuration based on environment
$appEnv = $_ENV['APP_ENV'] ?? 'production';
if ($appEnv === 'production') {
    ini_set('display_errors', 0);
    ini_set('display_startup_errors', 0);
    error_reporting(E_ALL & ~E_DEPRECATED & ~E_STRICT);
} else {
    ini_set('display_errors', 1);
    ini_set('display_startup_errors', 1);
    error_reporting(E_ALL);
}
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/../php_errors.log');

// Global error handler to catch all PHP errors and convert them to JSON responses
set_error_handler(function ($severity, $message, $file, $line) use ($appEnv) {
    if (!(error_reporting() & $severity)) {
        // This error code is not included in error_reporting
        return;
    }
    // Only clean output buffer if it's active
    if (ob_get_level() > 0) {
        ob_end_clean(); // Discard any buffered output
    }
    http_response_code(500);
    $response = ['message' => 'An unexpected server error occurred.'];
    if ($appEnv !== 'production') {
        $response['error'] = 'PHP Error: ' . $message;
        $response['file'] = $file;
        $response['line'] = $line;
    }
    echo json_encode($response);
    exit();
});

// Global exception handler to catch all uncaught exceptions and convert them to JSON responses
set_exception_handler(function ($exception) use ($appEnv) {
    // Only clean output buffer if it's active
    if (ob_get_level() > 0) {
        ob_end_clean(); // Discard any buffered output
    }
    http_response_code(500);
    $response = ['message' => 'An unexpected server error occurred.'];
    if ($appEnv !== 'production') {
        $response['error'] = 'Exception: ' . $exception->getMessage();
        $response['file'] = $exception->getFile();
        $response['line'] = $exception->getLine();
        $response['trace'] = $exception->getTraceAsString();
    }
    echo json_encode($response);
    exit();
});

// Set CORS headers for all requests
$allowedOrigins = [
    'https://afyaclass.co.tz',
    'https://www.afyaclass.co.tz',
    'http://afyaclass.co.tz',
    'http://www.afyaclass.co.tz',
    'https://dev.afyaclass.co.tz',
    'http://dev.afyaclass.co.tz',
    'http://localhost:5173',
    'http://localhost:3000'
];

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowedOrigins)) {
    header("Access-Control-Allow-Origin: " . $origin);
}

header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Device-ID");
header("Access-Control-Allow-Credentials: true");

// Advanced Security Headers
header("X-Frame-Options: DENY");
header("X-Content-Type-Options: nosniff");
header("Referrer-Policy: strict-origin-when-cross-origin");
header("X-XSS-Protection: 1; mode=block");

// Handle preflight OPTIONS requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    // For OPTIONS requests, we only need to send the headers and exit
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../config/database.php'; // Ensure database is loaded first
require_once __DIR__ . '/../utils/auth.php'; // Include the authentication functions
require_once __DIR__ . '/../routes/user.php';
require_once __DIR__ . '/../routes/content.php';
require_once __DIR__ . '/../routes/classes.php';
require_once __DIR__ . '/../routes/subjects.php';
require_once __DIR__ . '/../routes/advertisements.php';
require_once __DIR__ . '/../routes/chat.php';
require_once __DIR__ . '/../routes/forum.php';
require_once __DIR__ . '/../routes/pesapal.php';
require_once __DIR__ . '/../routes/analytics.php';
require_once __DIR__ . '/../routes/payment.php'; // Include the payment routes
require_once __DIR__ . '/../routes/notifications.php'; // Include the notifications routes
require_once __DIR__ . '/../utils/file_handler.php'; // Include the new file handler

// Ensure any buffered output is cleaned before sending JSON response
ob_end_clean();
header("Content-Type: application/json");

$requestUri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$requestMethod = $_SERVER['REQUEST_METHOD'];

error_log("DEBUG: Raw REQUEST_URI: " . $_SERVER['REQUEST_URI']);

// Remove the base path if your project is in a subdirectory
$basePath = '/backend-php/public'; // Adjusted based on actual request URI in logs
if (strpos($requestUri, $basePath) === 0) {
    $requestUri = substr($requestUri, strlen($basePath));
}
error_log("DEBUG: Processed Request URI: " . $requestUri);

// Define routes that do NOT require authentication
$publicRoutes = [
    '/register',
    '/login',
    '/logout',
    '/verify-email',
    '/verify-login-otp',
    '/resend-confirmation-email',
    '/request-password-reset',
    '/reset-password',
    '/pricing-plans',
    '/initiate-pesapal-payment',
    '/pesapal-ipn',
    '/pesapal-payment-status',
    '/uploads', // Handled by handle_serve_image, which doesn't require auth
    '/classes', // Public route for fetching classes
    '/class-levels', // Public route for fetching class levels
    '/advertisements', // Public route for fetching advertisements
    '/subjects', // Public route for fetching subjects
    '/api/discussions', // Public route for fetching discussions
    '/validate-token', // Public route for token validation
    '/check-user-existence', // Public route for checking user existence
];
error_log("DEBUG: Public Routes: " . implode(', ', $publicRoutes));

// Check if the current route requires authentication
$requiresAuth = true;

error_log("DEBUG: Checking authentication for Request URI: " . $requestUri);
error_log("DEBUG: Is '" . $requestUri . "' in public routes? " . (in_array($requestUri, $publicRoutes) ? 'true' : 'false'));

// Check for exact public routes using in_array for robustness
// Also, explicitly check for /advertisements as a public route
if (in_array($requestUri, $publicRoutes) || $requestUri === '/advertisements') {
    $requiresAuth = false;
} else {
    // Handle dynamic public routes that are not exact matches
    // This check is for routes that start with a public prefix but have dynamic segments
    if (preg_match('/^\/uploads\/(.+)$/', $requestUri)) {
        // Check if '/uploads' is in publicRoutes to ensure this dynamic route is intended to be public
        if (in_array('/uploads', $publicRoutes)) {
            $requiresAuth = false;
        }
    }
    // Special handling for /api/discussions to allow /api/discussions/{id} to be public
    if (strpos($requestUri, '/api/discussions') === 0) {
        // Check if '/api/discussions' is in publicRoutes
        if (in_array('/api/discussions', $publicRoutes)) {
            $requiresAuth = false;
        }
    }
}

// If authentication is required, validate the JWT token
error_log("DEBUG: Final Request URI: " . $requestUri . ", Requires Auth: " . ($requiresAuth ? 'true' : 'false'));

if ($requiresAuth) {
    $user = authenticate(); // This function now uses JWT validation
    if (!$user) {
        http_response_code(401);
        echo json_encode(['message' => 'Unauthorized: Invalid or missing authentication token.']);
        exit();
    }
    // Optionally, store the authenticated user in a global variable or $_SESSION for route handlers
    // For this example, we'll assume route handlers can call authenticate() again if needed,
    // or we can pass the user data to them. For simplicity, we'll rely on authenticate() being called.
}


// Basic routing
try {
    switch ($requestUri) {
        case '/register':
            handle_register($requestMethod);
            break;
        case '/login':
            handle_login($requestMethod);
            break;
        case '/check-user-existence':
            handle_check_user_existence($requestMethod);
            break;
        case '/logout':
            handle_logout($requestMethod);
            break;
        case '/verify-email':
        case '/verify-login-otp': // Route for OTP verification during login
            handle_verify_email($requestMethod);
            break;
        case '/resend-confirmation-email':
            handle_resend_confirmation_email($requestMethod);
            break;
        case '/request-password-reset':
            handle_forgot_password($requestMethod);
            break;
        case '/reset-password':
            handle_reset_password($requestMethod);
            break;
        case '/user/queries':
            handle_submit_user_query($requestMethod);
            break;
        case '/api/discussions':
            handle_discussions($requestMethod);
            break;
        case '/classes':
            handle_public_classes($requestMethod);
            break;
        case '/class-levels':
            handle_public_class_levels($requestMethod);
            break;
        case '/subjects':
            handle_public_subjects($requestMethod);
            break;
        case '/advertisements':
            handle_public_advertisements($requestMethod);
            break;
        case '/admin/classes':
            handle_admin_classes($requestMethod);
            break;
        case '/admin/class-levels':
            handle_admin_class_levels($requestMethod);
            break;
        case '/pricing-plans':
            handle_pricing_plans($requestMethod);
            break;
        case '/users/request-material-access':
            handle_request_material_access($requestMethod);
            break;
        case '/initiate-pesapal-payment':
            handle_initiate_pesapal_payment($requestMethod);
            break;
        case '/pesapal-ipn':
            handle_pesapal_ipn($requestMethod);
            break;
        case '/admin/chat/conversations':
            handle_admin_chat_conversations($requestMethod);
            break;
        case '/admin/chat/upload-file':
            handle_admin_chat_upload_file($requestMethod);
            break;
        case '/admin/chat/conversations/unread/count':
            handle_admin_unread_chat_count($requestMethod);
            break;
        case '/admin/users':
            handle_admin_users($requestMethod);
            break;
        case '/validate-token':
            handle_validate_token($requestMethod);
            break;
        case '/admin/content':
            handle_admin_content($requestMethod);
            break;
        case '/admin/subjects':
            handle_admin_subjects($requestMethod);
            break;
        case '/admin/advertisements':
            handle_admin_advertisements($requestMethod);
            break;
        case '/admin/analytics/users':
            handle_admin_analytics_users($requestMethod);
            break;
        case '/admin/analytics/content':
            handle_admin_analytics_content($requestMethod);
            break;
        case '/admin/analytics/trials':
            handle_admin_analytics_trials($requestMethod);
            break;
        case '/admin/analytics/payments':
            handle_admin_analytics_payments($requestMethod);
            break;
        case '/admin/pesapal-transactions':
            handle_admin_pesapal_transactions($requestMethod);
            break;
        case '/admin/manual-grant':
            handle_admin_manual_grant($requestMethod);
            break;
        case '/admin/subscriptions':
            handle_admin_active_subscriptions($requestMethod);
            break;
        case '/admin/subscriptions/manage':
            handle_admin_manage_subscription($requestMethod);
            break;
        case '/users/start-material-trial':
            handle_start_material_trial($requestMethod);
            break;
        case '/submit-payment-proof':
            handle_request_material_access($requestMethod);
            break;
        case '/pesapal-payment-status':
            handle_pesapal_payment_status($requestMethod);
            break;
        case '/terminate-session':
            handle_terminate_session($requestMethod);
            break;
        case '/terminate-all-other-sessions':
            handle_terminate_all_other_sessions($requestMethod);
            break;
        case '/terminate-other-session':
            handle_terminate_other_session($requestMethod);
            break;
        default:
            // Handle dynamic routes for user and admin operations
            if (preg_match('/^\/user\/(\d+)$/', $requestUri, $matches)) {
                $userId = (int) $matches[1];
                if ($requestMethod === 'GET') {
                    handle_get_user($requestMethod, $userId);
                } else {
                    handle_profile($requestMethod, $userId);
                }
            } elseif (preg_match('/^\/user\/(\d+)\/password$/', $requestUri, $matches)) {
                $userId = (int) $matches[1];
                handle_update_password($requestMethod, $userId);
            } elseif (preg_match('/^\/admin\/users\/(\d+)$/', $requestUri, $matches)) {
                $userId = (int) $matches[1];
                handle_admin_update_user($requestMethod, $userId);
            } elseif (preg_match('/^\/admin\/content\/(\d+)$/', $requestUri, $matches)) {
                $contentId = (int) $matches[1];
                handle_admin_update_content($requestMethod, $contentId);
            } elseif (preg_match('/^\/admin\/subjects\/(\d+)$/', $requestUri, $matches)) {
                $subjectId = (int) $matches[1];
                handle_admin_update_subject($requestMethod, $subjectId);
            } elseif (preg_match('/^\/admin\/classes\/(\d+)$/', $requestUri, $matches)) {
                $classId = (int) $matches[1];
                handle_admin_update_class($requestMethod, $classId);
            } elseif (preg_match('/^\/admin\/class-levels\/(\d+)$/', $requestUri, $matches)) {
                $classLevelId = (int) $matches[1];
                handle_admin_update_class_level($requestMethod, $classLevelId);
            } elseif (preg_match('/^\/admin\/advertisements\/(\d+)$/', $requestUri, $matches)) {
                $advertisementId = (int) $matches[1];
                handle_admin_update_advertisement($requestMethod, $advertisementId);
            } elseif (preg_match('/^\/admin\/chat\/conversations\/(\d+)\/messages$/', $requestUri, $matches)) {
                $conversationId = (int) $matches[1];
                handle_admin_chat_messages($requestMethod, $conversationId);
            } elseif (preg_match('/^\/admin\/chat\/conversations\/(\d+)\/read$/', $requestUri, $matches)) {
                $conversationId = (int) $matches[1];
                handle_admin_mark_conversation_as_read($requestMethod, $conversationId);
            } elseif (preg_match('/^\/admin\/chat\/conversations\/(\d+)\/solved$/', $requestUri, $matches)) {
                $conversationId = (int) $matches[1];
                handle_update_conversation_solved_status($requestMethod, $conversationId);
            } elseif (preg_match('/^\/admin\/chat\/conversations\/(\d+)\/pinned$/', $requestUri, $matches)) {
                $conversationId = (int) $matches[1];
                handle_update_conversation_pinned_status($requestMethod, $conversationId);
            } elseif (preg_match('/^\/admin\/chat\/conversations\/(\d+)\/archived$/', $requestUri, $matches)) {
                $conversationId = (int) $matches[1];
                handle_update_conversation_archived_status($requestMethod, $conversationId);
            } elseif (preg_match('/^\/admin\/chat\/conversations\/(\d+)$/', $requestUri, $matches)) {
                $conversationId = (int) $matches[1];
                handle_delete_chat_conversation($requestMethod, $conversationId);
            } elseif (preg_match('/^\/notifications\/(\d+)\/(\d+)$/', $requestUri, $matches)) {
                $userId = (int) $matches[1];
                $notificationId = (int) $matches[2];
                handle_notifications($requestMethod, $userId, $notificationId);
            } elseif (preg_match('/^\/notifications\/(\d+)$/', $requestUri, $matches)) {
                $userId = (int) $matches[1];
                handle_notifications($requestMethod, $userId);
            } elseif (preg_match('/^\/admin\/payment-requests$/', $requestUri)) {
                handle_admin_payment_requests($requestMethod);
            } elseif (preg_match('/^\/admin\/payment-requests\/(\d+)$/', $requestUri, $matches)) {
                $requestId = (int) $matches[1];
                handle_admin_payment_requests($requestMethod, $requestId);
            } elseif (preg_match('/^\/admin\/pesapal-transactions\/bulk$/', $requestUri)) {
                handle_admin_bulk_delete_pesapal_transactions($requestMethod);
            } elseif (preg_match('/^\/admin\/pesapal-transactions\/(\d+)$/', $requestUri, $matches)) {
                $transactionId = (int) $matches[1];
                handle_admin_pesapal_transactions($requestMethod, $transactionId);
            } elseif (preg_match('/^\/user\/(\d+)\/content$/', $requestUri, $matches)) {
                $userId = (int) $matches[1];
                handle_user_content($requestMethod, $userId);
            } elseif (preg_match('/^\/api\/discussions\/(\d+)$/', $requestUri, $matches)) {
                $discussionId = (int) $matches[1];
                handle_single_discussion($requestMethod, $discussionId);
            } elseif (preg_match('/^\/api\/discussions\/(\d+)\/replies$/', $requestUri, $matches)) {
                $discussionId = (int) $matches[1];
                handle_discussion_replies($requestMethod, $discussionId);
            } elseif (preg_match('/^\/api\/discussions\/(\d+)\/pin$/', $requestUri, $matches)) {
                $discussionId = (int) $matches[1];
                handle_toggle_discussion_pin($requestMethod, $discussionId);
            } elseif (preg_match('/^\/api\/discussions\/(\d+)\/react$/', $requestUri, $matches)) {
                $discussionId = (int) $matches[1];
                handle_discussion_reaction($requestMethod, $discussionId);
            } elseif (preg_match('/^\/api\/replies\/(\d+)\/react$/', $requestUri, $matches)) {
                $replyId = (int) $matches[1];
                handle_reply_reaction($requestMethod, $replyId);
            } elseif (preg_match('/^\/api\/admin\/replies\/(\d+)$/', $requestUri, $matches)) {
                $replyId = (int) $matches[1];
                handle_admin_delete_reply($requestMethod, $replyId);
            } elseif (preg_match('/^\/admin\/user-queries\/(\d+)$/', $requestUri, $matches)) {
                $queryId = (int) $matches[1];
                handle_admin_respond_user_query($requestMethod, $queryId);
            } elseif (preg_match('/^\/upload$/', $requestUri)) {
                handle_upload($requestMethod);
            } elseif (preg_match('/^\/uploads\/([^\/]+)$/', $requestUri, $matches)) {
                $filename = $matches[1];
                $uploadsBaseDir = __DIR__ . '/../uploads'; // Correct path to the uploads directory
                handle_serve_file($filename, $uploadsBaseDir);
            } else {
                http_response_code(404);
                echo json_encode(['message' => 'Not Found']);
            }
            break;
    }
} catch (Throwable $e) {
    // This catches any uncaught exceptions or errors that bypass the set_error_handler/set_exception_handler
    ob_end_clean(); // Discard any buffered output
    http_response_code(500);
    echo json_encode([
        'message' => 'An unhandled server error occurred during routing.',
        'error' => 'Unhandled Exception: ' . $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine(),
        'trace' => $e->getTraceAsString() // Add trace for more detailed debugging
    ]);
    exit();
}
