<?php

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../utils/auth.php'; // Assuming auth utilities are here

function handle_notifications($method, $userId = null, $notificationId = null) {
    global $pdo;

    // Authenticate user
    $user = authenticate();
    if (!$user) {
        http_response_code(401);
        echo json_encode(['message' => 'Unauthorized: Please log in.']);
        exit();
    }

    switch ($method) {
        case 'GET':
            // Ensure the user is authorized to access these notifications
            if ($user['role'] !== 'admin' && $user['id'] !== $userId) {
                http_response_code(403);
                echo json_encode(['message' => 'Forbidden: You do not have permission to access these notifications.']);
                exit();
            }
            // Fetch notifications for a specific user
            if ($userId) {
                try {
                    $stmt = $pdo->prepare("SELECT id, type, message, isRead, createdAt, entityId, entityType FROM notifications WHERE recipientId = ? ORDER BY createdAt DESC");
                    $stmt->execute([$userId]);
                    $notifications = $stmt->fetchAll(PDO::FETCH_ASSOC);
                    echo json_encode($notifications);
                } catch (PDOException $e) {
                    http_response_code(500);
                    echo json_encode(['message' => 'Failed to fetch notifications.', 'error' => $e->getMessage()]);
                }
            } else {
                http_response_code(400);
                echo json_encode(['message' => 'User ID is required to fetch notifications.']);
            }
            break;

        case 'PUT':
            $input = json_decode(file_get_contents('php://input'), true);

            if (isset($input['action']) && $input['action'] === 'mark_all_as_read') {
                // Ensure the user is authorized to access these notifications
                if ($user['role'] !== 'admin' && $user['id'] !== $userId) {
                    http_response_code(403);
                    echo json_encode(['message' => 'Forbidden: You do not have permission to access these notifications.']);
                    exit();
                }
                // Mark all notifications for a user as read
                if ($userId) {
                    try {
                        $stmt = $pdo->prepare("UPDATE notifications SET isRead = TRUE WHERE recipientId = ? AND isRead = FALSE");
                        $stmt->execute([$userId]);
                        echo json_encode(['message' => 'All notifications marked as read.']);
                    } catch (PDOException $e) {
                        http_response_code(500);
                        echo json_encode(['message' => 'Failed to mark all notifications as read.', 'error' => $e->getMessage()]);
                    }
                } else {
                    http_response_code(400);
                    echo json_encode(['message' => 'User ID is required to mark all notifications as read.']);
                }
            } elseif ($notificationId) {
                // Mark a specific notification as read
                try {
                    // The recipientId must match the authenticated user's ID, unless admin
                    $stmt = $pdo->prepare("UPDATE notifications SET isRead = TRUE WHERE id = ? AND recipientId = ?");
                    $stmt->execute([$notificationId, $user['id']]); // Use authenticated user's ID
                    if ($stmt->rowCount() > 0) {
                        echo json_encode(['message' => 'Notification marked as read.']);
                    } else {
                        http_response_code(404);
                        echo json_encode(['message' => 'Notification not found or already read.']);
                    }
                } catch (PDOException $e) {
                    http_response_code(500);
                    echo json_encode(['message' => 'Failed to mark notification as read.', 'error' => $e->getMessage()]);
                }
            } else {
                http_response_code(400);
                echo json_encode(['message' => 'Invalid PUT request for notifications.']);
            }
            break;

        case 'DELETE':
            // Ensure the user is authorized to access these notifications
            if ($user['role'] !== 'admin' && $user['id'] !== $userId) {
                http_response_code(403);
                echo json_encode(['message' => 'Forbidden: You do not have permission to access these notifications.']);
                exit();
            }
            // Clear all notifications for a specific user
            if ($userId) {
                try {
                    $stmt = $pdo->prepare("DELETE FROM notifications WHERE recipientId = ?");
                    $stmt->execute([$userId]);
                    echo json_encode(['message' => 'All notifications cleared.']);
                } catch (PDOException $e) {
                    http_response_code(500);
                    echo json_encode(['message' => 'Failed to clear notifications.', 'error' => $e->getMessage()]);
                }
            } else {
                http_response_code(400);
                echo json_encode(['message' => 'User ID is required to clear notifications.']);
            }
            break;

        case 'POST':
            $input = json_decode(file_get_contents('php://input'), true);
            if (isset($input['action']) && $input['action'] === 'store_push_token') {
                $token = $input['token'] ?? null;
                if (!$token) {
                    http_response_code(400);
                    echo json_encode(['message' => 'Token is required.']);
                    exit();
                }

                try {
                    $stmt = $pdo->prepare("INSERT INTO user_push_tokens (user_id, token) VALUES (?, ?) ON DUPLICATE KEY UPDATE created_at = CURRENT_TIMESTAMP");
                    $stmt->execute([$user['id'], $token]);
                    echo json_encode(['message' => 'Push token stored successfully.']);
                } catch (PDOException $e) {
                    http_response_code(500);
                    echo json_encode(['message' => 'Failed to store push token.', 'error' => $e->getMessage()]);
                }
            }
            break;

        default:
            http_response_code(405);
            echo json_encode(['message' => 'Method Not Allowed']);
            break;
    }
}

require_once __DIR__ . '/../utils/push_notifications.php';

/**
 * Helper function to create a new notification.
 * @param int $recipientId The ID of the user who will receive the notification.
 * @param string $type The type of notification (e.g., 'payment_approved', 'new_query').
 * @param string $message The message content of the notification.
 * @param int|null $senderId The ID of the user who triggered the notification (optional).
 * @param int|null $entityId The ID of the related entity (e.g., payment_request_id, user_query_id).
 * @param string|null $entityType The type of the related entity (e.g., 'payment_request', 'user_query').
 * @return bool True on success, false on failure.
 */
function createNotification($recipientId, $type, $message, $senderId = null, $entityId = null, $entityType = null) {
    global $pdo;
    try {
        $stmt = $pdo->prepare("INSERT INTO notifications (recipientId, senderId, type, message, entityId, entityType) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->execute([$recipientId, $senderId, $type, $message, $entityId, $entityType]);
        
        // Trigger Push Notification
        // Determine Title based on type
        $title = "AfyaClass Update";
        switch ($type) {
            case 'payment_approved':
                $title = "Payment Approved";
                break;
            case 'payment_rejected':
                 $title = "Payment Update";
                 break;
            case 'new_reply':
                $title = "New Reply";
                break;
            case 'new_content':
                $title = "New Content Added";
                break;
        }
        
        sendPushNotification($recipientId, $title, $message, ['type' => $type, 'entityId' => $entityId, 'entityType' => $entityType]);

        return true;
    } catch (PDOException $e) {
        error_log("Error creating notification: " . $e->getMessage());
        return false;
    }
}

?>
