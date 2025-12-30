<?php

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/notifications.php'; // For createNotification

function handle_user_queries($requestMethod) {
    global $pdo;

    if ($requestMethod === 'POST') {
        $query = $_POST['query'] ?? null;
        $userId = $_POST['userId'] ?? null;
        $filePath = null;

        if (isset($_FILES['file']) && $_FILES['file']['error'] === UPLOAD_ERR_OK) {
            $uploadDir = __DIR__ . '/../uploads/';
            if (!is_dir($uploadDir)) {
                mkdir($uploadDir, 0777, true);
            }
            $fileName = uniqid() . '-' . basename($_FILES['file']['name']);
            $targetFilePath = $uploadDir . $fileName;
            if (move_uploaded_file($_FILES['file']['tmp_name'], $targetFilePath)) {
                $filePath = '/uploads/' . $fileName;
            } else {
                http_response_code(500);
                echo json_encode(['message' => 'Failed to upload file.']);
                return;
            }
        }

        if (!$query && !$filePath) {
            http_response_code(400);
            echo json_encode(['message' => 'Query content or an attached file is required.']);
            return;
        }

        if (!is_numeric($userId)) {
            http_response_code(400);
            echo json_encode(['message' => 'Invalid user ID.']);
            return;
        }

        try {
            $stmtUser = $pdo->prepare('SELECT username FROM users WHERE id = ?');
            $stmtUser->execute([$userId]);
            $submittingUser = $stmtUser->fetch(PDO::FETCH_ASSOC);
            $submittingUsername = $submittingUser ? $submittingUser['username'] : "User ID: {$userId}";

            $conversationId = null;
            $stmtExistingConversation = $pdo->prepare('SELECT id FROM chat_conversations WHERE userId = ?');
            $stmtExistingConversation->execute([$userId]);
            $existingConversation = $stmtExistingConversation->fetch(PDO::FETCH_ASSOC);

            if ($existingConversation) {
                $conversationId = $existingConversation['id'];
            } else {
                $stmtNewConversation = $pdo->prepare('INSERT INTO chat_conversations (userId) VALUES (?)');
                $stmtNewConversation->execute([$userId]);
                $conversationId = $pdo->lastInsertId();
            }

            $stmtMessage = $pdo->prepare(
                'INSERT INTO chat_messages (conversationId, senderId, senderRole, message, filePath) VALUES (?, ?, ?, ?, ?)'
            );
            $stmtMessage->execute([$conversationId, $userId, 'user', $query, $filePath]);
            $messageId = $pdo->lastInsertId();

            $stmtUpdateConversation = $pdo->prepare(
                'UPDATE chat_conversations SET lastMessageId = ?, adminLastReadAt = NULL, updatedAt = CURRENT_TIMESTAMP WHERE id = ?'
            );
            $stmtUpdateConversation->execute([$messageId, $conversationId]);

            $stmtAdmins = $pdo->query('SELECT id FROM users WHERE role = "admin"');
            $admins = $stmtAdmins->fetchAll(PDO::FETCH_ASSOC);

            foreach ($admins as $admin) {
                createNotification($admin['id'], 'new_chat_message', "New message from {$submittingUsername}" . ($filePath ? ' with an attachment' : '') . ".", $userId);
            }

            http_response_code(201);
            echo json_encode(['message' => 'Message submitted successfully!', 'conversationId' => $conversationId, 'messageId' => $messageId]);

        } catch (PDOException $e) {
            error_log("Error submitting user query/message: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['message' => 'Failed to submit message due to server error.']);
        }
    } else {
        http_response_code(405);
        echo json_encode(['message' => 'Method Not Allowed']);
    }
}

function handle_admin_chat_conversations($requestMethod) {
    global $pdo;

    if ($requestMethod === 'GET') {
        try {
            $stmt = $pdo->query('
                SELECT
                    cc.id AS id,
                    cc.userId,
                    u.username AS userName,
                    cm.message AS lastMessagePreview,
                    cm.createdAt AS lastMessageTimestamp,
                    (SELECT COUNT(*) FROM chat_messages WHERE conversationId = cc.id AND senderRole = "user" AND createdAt > IFNULL(cc.adminLastReadAt, "1970-01-01 00:00:00")) AS unreadCount
                FROM chat_conversations cc
                JOIN users u ON cc.userId = u.id
                LEFT JOIN chat_messages cm ON cc.lastMessageId = cm.id
                ORDER BY cm.createdAt DESC
            ');
            $conversations = $stmt->fetchAll(PDO::FETCH_ASSOC);
            http_response_code(200);
            echo json_encode($conversations);
        } catch (PDOException $e) {
            error_log("Error fetching chat conversations for admin: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['message' => 'Failed to fetch chat conversations due to server error.']);
        }
    } else {
        http_response_code(405);
        echo json_encode(['message' => 'Method Not Allowed']);
    }
}

function handle_admin_chat_messages($requestMethod, $conversationId) {
    global $pdo;

    if ($requestMethod === 'GET') {
        try {
            $stmt = $pdo->prepare('
                SELECT id, conversationId, senderId, senderRole, message, filePath, createdAt AS timestamp
                FROM chat_messages
                WHERE conversationId = ?
                ORDER BY createdAt ASC
            ');
            $stmt->execute([$conversationId]);
            $messages = $stmt->fetchAll(PDO::FETCH_ASSOC);
            http_response_code(200);
            echo json_encode($messages);
        } catch (PDOException $e) {
            error_log("Error fetching messages for conversation {$conversationId}: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['message' => 'Failed to fetch messages due to server error.']);
        }
    } elseif ($requestMethod === 'POST') {
        $data = json_decode(file_get_contents("php://input"), true);
        $message = $data['message'] ?? null;
        $filePath = $data['filePath'] ?? null;

        // TODO: Get actual admin ID from session/auth
        $adminId = 1; // Placeholder

        if (!$message && !$filePath) {
            http_response_code(400);
            echo json_encode(['message' => 'Message content or an attached file is required.']);
            return;
        }

        try {
            $stmtMessage = $pdo->prepare(
                'INSERT INTO chat_messages (conversationId, senderId, senderRole, message, filePath) VALUES (?, ?, ?, ?, ?)'
            );
            $stmtMessage->execute([$conversationId, $adminId, 'admin', $message, $filePath]);
            $messageId = $pdo->lastInsertId();

            $stmtUpdateConversation = $pdo->prepare(
                'UPDATE chat_conversations SET lastMessageId = ?, userLastReadAt = NULL, updatedAt = CURRENT_TIMESTAMP WHERE id = ?'
            );
            $stmtUpdateConversation->execute([$messageId, $conversationId]);

            $stmtConversation = $pdo->prepare('SELECT userId FROM chat_conversations WHERE id = ?');
            $stmtConversation->execute([$conversationId]);
            $conversation = $stmtConversation->fetch(PDO::FETCH_ASSOC);

            if ($conversation) {
                createNotification($conversation['userId'], 'admin_reply', "Admin has replied to your chat" . ($filePath ? ' with an attachment' : '') . ".", $adminId);
            }

            $stmtSentMessage = $pdo->prepare(
                'SELECT id, conversationId, senderId, senderRole, message, filePath, createdAt AS timestamp
                 FROM chat_messages
                 WHERE id = ?'
            );
            $stmtSentMessage->execute([$messageId]);
            $sentMessage = $stmtSentMessage->fetch(PDO::FETCH_ASSOC);

            http_response_code(201);
            echo json_encode($sentMessage);

        } catch (PDOException $e) {
            error_log("Error sending admin message: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['message' => 'Failed to send message due to server error.']);
        }
    } else {
        http_response_code(405);
        echo json_encode(['message' => 'Method Not Allowed']);
    }
}

function handle_admin_mark_conversation_as_read($requestMethod, $conversationId) {
    global $pdo;

    if ($requestMethod === 'PUT') {
        try {
            $stmt = $pdo->prepare(
                'UPDATE chat_conversations SET adminLastReadAt = CURRENT_TIMESTAMP WHERE id = ?'
            );
            $success = $stmt->execute([$conversationId]);

            if ($success && $stmt->rowCount() > 0) {
                http_response_code(200);
                echo json_encode(['message' => 'Conversation marked as read successfully!']);
            } elseif ($stmt->rowCount() === 0) {
                http_response_code(404);
                echo json_encode(['message' => 'Conversation not found.']);
            } else {
                http_response_code(500);
                echo json_encode(['message' => 'Failed to mark conversation as read.']);
            }
        } catch (PDOException $e) {
            error_log("Error marking conversation as read: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['message' => 'Failed to mark conversation as read due to server error.']);
        }
    } else {
        http_response_code(405);
        echo json_encode(['message' => 'Method Not Allowed']);
    }
}

function handle_admin_unread_chat_count($requestMethod) {
    global $pdo;

    if ($requestMethod === 'GET') {
        try {
            $stmt = $pdo->query('
                SELECT COUNT(DISTINCT cc.id) AS count
                FROM chat_conversations cc
                WHERE EXISTS (
                    SELECT 1
                    FROM chat_messages cm
                    WHERE cm.conversationId = cc.id
                      AND cm.senderRole = "user"
                      AND cm.createdAt > COALESCE(cc.adminLastReadAt, CAST("1970-01-01 00:00:00" AS DATETIME))
                )
            ');
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            $count = $result ? (int)$result['count'] : 0;
            http_response_code(200);
            echo json_encode(['count' => $count]);
        } catch (PDOException $e) {
            // For debugging, output the full error details. In production, only log.
            http_response_code(500);
            echo json_encode([
                'message' => 'Failed to fetch unread chat conversations count due to server error.',
                'error_details' => $e->getMessage(),
                'sql_state' => $e->getCode(),
                'trace' => $e->getTraceAsString()
            ]);
            error_log("PDOException in handle_admin_unread_chat_count: " . $e->getMessage() . " SQLSTATE: " . $e->getCode() . " Trace: " . $e->getTraceAsString());
        }
    } else {
        http_response_code(405);
        echo json_encode(['message' => 'Method Not Allowed']);
    }
}

// Re-using handle_upload from content.php for chat file uploads
// function handle_upload($requestMethod) { ... }
