<?php

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../utils/auth.php'; // Include auth.php for authentication functions
require_once __DIR__ . '/user.php'; // For createNotification

function fetchReactions($targetType, $targetId, $userId)
{
    global $pdo;
    $tableName = ($targetType === 'discussion') ? 'discussion_reactions' : 'reply_reactions';
    $idColumn = ($targetType === 'discussion') ? 'discussionId' : 'replyId';

    $stmt = $pdo->prepare(
        "SELECT reactionType, COUNT(*) as count,
                MAX(CASE WHEN userId = ? THEN 1 ELSE 0 END) as reactedByMe
         FROM {$tableName}
         WHERE {$idColumn} = ?
         GROUP BY reactionType"
    );
    $stmt->execute([$userId, $targetId]);
    $reactionRows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    return array_map(function ($row) {
        return [
            'type' => $row['reactionType'],
            'count' => (int) $row['count'],
            'reactedByMe' => (bool) $row['reactedByMe'],
        ];
    }, $reactionRows);
}

function handle_discussions($requestMethod)
{
    global $pdo;

    // For GET requests, authentication is optional. If a token is provided, it will be validated,
    // but the request will still proceed if the token is invalid or missing, allowing public viewing.
    // However, if the token is valid, it will be used to determine 'reactedByMe' status for reactions.
    if ($requestMethod === 'GET') {
        $user = authenticate(); // Attempt to authenticate, but don't block if not authenticated
        $userIdForReactions = $user ? $user['id'] : null;

        try {
            $stmt = $pdo->prepare('
                SELECT d.*, u.username AS createdByUsername,
                (SELECT COUNT(*) FROM discussion_replies dr WHERE dr.discussionId = d.id AND dr.isDeleted = FALSE) as replyCount
                FROM discussions d
                JOIN users u ON d.createdBy = u.id
                ORDER BY d.createdAt DESC
            ');
            $stmt->execute(); // No parameters needed for this query
            $discussions = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Fetch reactions for each discussion
            foreach ($discussions as &$discussion) {
                $discussion['reactions'] = fetchReactions('discussion', $discussion['id'], $userIdForReactions);
            }
            unset($discussion); // Break the reference

            http_response_code(200);
            echo json_encode($discussions);
        } catch (PDOException $e) {
            error_log("Error fetching discussions: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['message' => 'Failed to fetch discussions due to server error.']);
        }
    } elseif ($requestMethod === 'POST') {
        $user = authenticate();
        if (!$user) {
            http_response_code(401);
            echo json_encode(['message' => 'Authentication required to create a discussion.']);
            return;
        }

        $data = json_decode(file_get_contents("php://input"), true);
        $title = $data['title'] ?? '';
        $content = $data['content'] ?? '';
        $createdBy = $user['id']; // Use authenticated user's ID
        $classId = $data['classId'] ?? null;
        $subjectId = $data['subjectId'] ?? null;

        if (!$title || !$content) {
            http_response_code(400);
            echo json_encode(['message' => 'Title and content are required.']);
            return;
        }

        try {
            $stmt = $pdo->prepare(
                'INSERT INTO discussions (title, content, createdBy, classId, subjectId) VALUES (?, ?, ?, ?, ?)'
            );
            $result = $stmt->execute([$title, $content, $createdBy, $classId, $subjectId]);

            if ($result) {
                $discussionId = $pdo->lastInsertId();
                http_response_code(201);
                echo json_encode(['message' => 'Discussion topic created successfully!', 'discussionId' => $discussionId]);
            } else {
                http_response_code(500);
                echo json_encode(['message' => 'Failed to create discussion topic.']);
            }
        } catch (PDOException $e) {
            error_log("Error creating discussion topic: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['message' => 'Failed to create discussion topic due to server error.']);
        }
    } else {
        http_response_code(405);
        echo json_encode(['message' => 'Method Not Allowed']);
    }
}

function handle_single_discussion($requestMethod, $discussionId)
{
    global $pdo;

    // For GET requests, authentication is optional to allow public viewing
    if ($requestMethod === 'GET') {
        try {
            $user = authenticate(); // Attempt to authenticate, but don't block if not authenticated
            $userIdForReactions = $user ? $user['id'] : null;

            $stmtDiscussion = $pdo->prepare('
                SELECT d.*, u.username AS createdByUsername
                FROM discussions d
                JOIN users u ON d.createdBy = u.id
                WHERE d.id = ?
            ');
            $stmtDiscussion->execute([$discussionId]);
            $discussion = $stmtDiscussion->fetch(PDO::FETCH_ASSOC);

            if (!$discussion) {
                http_response_code(404);
                echo json_encode(['message' => 'Discussion topic not found.']);
                return;
            }

            // Increment view count only if a user is authenticated
            if ($user && isset($_GET['incrementView']) && $_GET['incrementView'] === 'true') {
                $stmtUpdateViews = $pdo->prepare('UPDATE discussions SET viewCount = viewCount + 1 WHERE id = ?');
                $stmtUpdateViews->execute([$discussionId]);
            }

            $discussion['reactions'] = fetchReactions('discussion', $discussionId, $userIdForReactions);

            $stmtReplies = $pdo->prepare('
                SELECT dr.*, u.username AS createdByUsername
                FROM discussion_replies dr
                JOIN users u ON dr.createdBy = u.id
                WHERE dr.discussionId = ? AND dr.isDeleted = FALSE
                ORDER BY dr.createdAt ASC
            ');
            $stmtReplies->execute([$discussionId]);
            $replies = $stmtReplies->fetchAll(PDO::FETCH_ASSOC);

            foreach ($replies as &$reply) {
                $reply['reactions'] = fetchReactions('reply', $reply['id'], $userIdForReactions);
            }
            unset($reply); // Break the reference

            http_response_code(200);
            echo json_encode(['discussion' => $discussion, 'replies' => $replies]);

        } catch (PDOException $e) {
            error_log("Error fetching discussion and replies: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['message' => 'Failed to fetch discussion and replies due to server error.']);
        }
    } elseif ($requestMethod === 'PUT') {
        $user = authenticate();
        if (!$user) {
            http_response_code(401);
            echo json_encode(['message' => 'Authentication required to update a discussion.']);
            return;
        }

        $data = json_decode(file_get_contents("php://input"), true);
        $title = $data['title'] ?? '';
        $content = $data['content'] ?? '';
        $isPinned = $data['isPinned'] ?? false;

        if (!$title || !$content || !isset($data['isPinned'])) {
            http_response_code(400);
            echo json_encode(['message' => 'Title, content, and pin status are required.']);
            return;
        }

        $isPinnedValue = (bool) $isPinned ? 1 : 0;

        try {
            // Ensure only the creator or an admin can update
            $stmtCheckCreator = $pdo->prepare('SELECT createdBy FROM discussions WHERE id = ?');
            $stmtCheckCreator->execute([$discussionId]);
            $discussionCreator = $stmtCheckCreator->fetch(PDO::FETCH_ASSOC);

            if (!$discussionCreator || ($discussionCreator['createdBy'] !== $user['id'] && $user['role'] !== 'admin')) {
                http_response_code(403);
                echo json_encode(['message' => 'You are not authorized to update this discussion.']);
                return;
            }

            $stmt = $pdo->prepare(
                'UPDATE discussions SET title = ?, content = ?, isPinned = ? WHERE id = ?'
            );
            $success = $stmt->execute([$title, $content, $isPinnedValue, $discussionId]);

            if ($success && $stmt->rowCount() > 0) {
                http_response_code(200);
                echo json_encode(['message' => 'Discussion topic updated successfully!']);
            } elseif ($stmt->rowCount() === 0) {
                http_response_code(404);
                echo json_encode(['message' => 'Discussion topic not found or no changes made.']);
            } else {
                http_response_code(500);
                echo json_encode(['message' => 'Failed to update discussion topic.']);
            }
        } catch (PDOException $e) {
            error_log("Error updating discussion topic: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['message' => 'Failed to update discussion topic due to server error.']);
        }
    } elseif ($requestMethod === 'DELETE') {
        $user = authenticate();
        if (!$user) {
            http_response_code(401);
            echo json_encode(['message' => 'Authentication required to delete a discussion.']);
            return;
        }

        try {
            // Ensure only the creator or an admin can delete
            $stmtCheckCreator = $pdo->prepare('SELECT createdBy FROM discussions WHERE id = ?');
            $stmtCheckCreator->execute([$discussionId]);
            $discussionCreator = $stmtCheckCreator->fetch(PDO::FETCH_ASSOC);

            if (!$discussionCreator || ($discussionCreator['createdBy'] !== $user['id'] && $user['role'] !== 'admin')) {
                http_response_code(403);
                echo json_encode(['message' => 'You are not authorized to delete this discussion.']);
                return;
            }

            $pdo->beginTransaction();

            $stmtDeleteReplies = $pdo->prepare('DELETE FROM discussion_replies WHERE discussionId = ?');
            $stmtDeleteReplies->execute([$discussionId]);

            $stmtDeleteReactions = $pdo->prepare('DELETE FROM discussion_reactions WHERE discussionId = ?');
            $stmtDeleteReactions->execute([$discussionId]);

            $stmtDeleteDiscussion = $pdo->prepare('DELETE FROM discussions WHERE id = ?');
            $success = $stmtDeleteDiscussion->execute([$discussionId]);

            if ($success && $stmtDeleteDiscussion->rowCount() > 0) {
                $pdo->commit();
                http_response_code(200);
                echo json_encode(['message' => 'Discussion topic and its replies/reactions deleted successfully!']);
            } elseif ($stmtDeleteDiscussion->rowCount() === 0) {
                $pdo->rollBack();
                http_response_code(404);
                echo json_encode(['message' => 'Discussion topic not found.']);
            } else {
                $pdo->rollBack();
                http_response_code(500);
                echo json_encode(['message' => 'Failed to delete discussion topic.']);
            }
        } catch (PDOException $e) {
            $pdo->rollBack();
            error_log("Error deleting discussion topic: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['message' => 'Failed to delete discussion topic due to server error.']);
        }
    } else {
        http_response_code(405);
        echo json_encode(['message' => 'Method Not Allowed']);
    }
}

function handle_discussion_replies($requestMethod, $discussionId)
{
    global $pdo;

    if ($requestMethod === 'POST') {
        $user = authenticate();
        if (!$user) {
            http_response_code(401);
            echo json_encode(['message' => 'Authentication required to post a reply.']);
            return;
        }

        $data = json_decode(file_get_contents("php://input"), true);
        $content = $data['content'] ?? '';
        $createdBy = $user['id']; // Use authenticated user's ID
        $parentId = $data['parentId'] ?? null;

        if (!$content) {
            http_response_code(400);
            echo json_encode(['message' => 'Content is required for a reply.']);
            return;
        }

        try {
            $stmt = $pdo->prepare(
                'INSERT INTO discussion_replies (discussionId, content, createdBy, parentId) VALUES (?, ?, ?, ?)'
            );
            $result = $stmt->execute([$discussionId, $content, $createdBy, $parentId]);

            if ($result) {
                $replyId = $pdo->lastInsertId();
                $stmtUpdateDiscussion = $pdo->prepare('UPDATE discussions SET replyCount = replyCount + 1 WHERE id = ?');
                $stmtUpdateDiscussion->execute([$discussionId]);
                http_response_code(201);
                echo json_encode(['message' => 'Reply posted successfully!', 'replyId' => $replyId]);
            } else {
                http_response_code(500);
                echo json_encode(['message' => 'Failed to post reply.']);
            }
        } catch (PDOException $e) {
            error_log("Error posting reply: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['message' => 'Failed to post reply due to server error.']);
        }
    } else {
        http_response_code(405);
        echo json_encode(['message' => 'Method Not Allowed']);
    }
}

function handle_toggle_discussion_pin($requestMethod, $discussionId)
{
    global $pdo;

    if ($requestMethod === 'PUT') {
        $user = authenticate();
        if (!$user || $user['role'] !== 'admin') { // Only admins can pin/unpin
            http_response_code(403);
            echo json_encode(['message' => 'Admin authentication required to toggle discussion pin status.']);
            return;
        }

        $data = json_decode(file_get_contents("php://input"), true);
        $isPinned = $data['isPinned'] ?? null;

        if (!isset($data['isPinned'])) {
            http_response_code(400);
            echo json_encode(['message' => 'Pin status is required.']);
            return;
        }

        try {
            $stmt = $pdo->prepare(
                'UPDATE discussions SET isPinned = ? WHERE id = ?'
            );
            $success = $stmt->execute([(bool) $isPinned, $discussionId]);

            if ($success && $stmt->rowCount() > 0) {
                http_response_code(200);
                echo json_encode(['message' => 'Discussion topic ' . ((bool) $isPinned ? 'pinned' : 'unpinned') . ' successfully!']);
            } elseif ($stmt->rowCount() === 0) {
                http_response_code(404);
                echo json_encode(['message' => 'Discussion topic not found or no changes made.']);
            } else {
                http_response_code(500);
                echo json_encode(['message' => 'Failed to toggle discussion pin status.']);
            }
        } catch (PDOException $e) {
            error_log("Error toggling discussion pin status: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['message' => 'Failed to toggle discussion pin status due to server error.']);
        }
    } else {
        http_response_code(405);
        echo json_encode(['message' => 'Method Not Allowed']);
    }
}

function handle_admin_delete_reply($requestMethod, $replyId)
{
    global $pdo;

    if ($requestMethod === 'DELETE') {
        $user = authenticate();
        if (!$user || $user['role'] !== 'admin') { // Only admins can delete replies
            http_response_code(403);
            echo json_encode(['message' => 'Admin authentication required to delete a reply.']);
            return;
        }

        try {
            $pdo->beginTransaction();

            $stmtReply = $pdo->prepare('SELECT discussionId FROM discussion_replies WHERE id = ?');
            $stmtReply->execute([$replyId]);
            $reply = $stmtReply->fetch(PDO::FETCH_ASSOC);

            if (!$reply) {
                $pdo->rollBack();
                http_response_code(404);
                echo json_encode(['message' => 'Reply not found.']);
                return;
            }

            $stmt = $pdo->prepare('UPDATE discussion_replies SET isDeleted = TRUE WHERE id = ?');
            $success = $stmt->execute([$replyId]);

            if ($success && $stmt->rowCount() > 0) {
                $stmtUpdateDiscussion = $pdo->prepare('UPDATE discussions SET replyCount = replyCount - 1 WHERE id = ?');
                $stmtUpdateDiscussion->execute([$reply['discussionId']]);
                $pdo->commit();
                http_response_code(200);
                echo json_encode(['message' => 'Reply marked as deleted successfully!']);
            } elseif ($stmt->rowCount() === 0) {
                $pdo->rollBack();
                http_response_code(404);
                echo json_encode(['message' => 'Reply not found.']);
            } else {
                $pdo->rollBack();
                http_response_code(500);
                echo json_encode(['message' => 'Failed to delete reply.']);
            }
        } catch (PDOException $e) {
            $pdo->rollBack();
            error_log("Error deleting reply: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['message' => 'Failed to delete reply due to server error.']);
        }
    } else {
        http_response_code(405);
        echo json_encode(['message' => 'Method Not Allowed']);
    }
}

function handle_discussion_reaction($requestMethod, $discussionId)
{
    global $pdo;

    if ($requestMethod === 'POST') {
        $user = authenticate();
        if (!$user) {
            http_response_code(401);
            echo json_encode(['message' => 'Authentication required to react to a discussion.']);
            return;
        }

        $data = json_decode(file_get_contents("php://input"), true);
        $userId = $user['id']; // Use authenticated user's ID
        $reactionType = $data['reactionType'] ?? null;

        if (!$reactionType) {
            http_response_code(400);
            echo json_encode(['message' => 'Reaction type is required.']);
            return;
        }

        try {
            $stmtExisting = $pdo->prepare('SELECT id, reactionType FROM discussion_reactions WHERE discussionId = ? AND userId = ?');
            $stmtExisting->execute([$discussionId, $userId]);
            $existingReaction = $stmtExisting->fetch(PDO::FETCH_ASSOC);

            if ($existingReaction) {
                if ($existingReaction['reactionType'] === $reactionType) {
                    $stmtDelete = $pdo->prepare('DELETE FROM discussion_reactions WHERE id = ?');
                    $stmtDelete->execute([$existingReaction['id']]);
                    http_response_code(200);
                    echo json_encode(['message' => 'Reaction removed successfully.']);
                } else {
                    $stmtUpdate = $pdo->prepare('UPDATE discussion_reactions SET reactionType = ? WHERE id = ?');
                    $stmtUpdate->execute([$reactionType, $existingReaction['id']]);
                    http_response_code(200);
                    echo json_encode(['message' => 'Reaction updated successfully.']);
                }
            } else {
                $stmtInsert = $pdo->prepare('INSERT INTO discussion_reactions (discussionId, userId, reactionType) VALUES (?, ?, ?)');
                $stmtInsert->execute([$discussionId, $userId, $reactionType]);
                http_response_code(201);
                echo json_encode(['message' => 'Reaction added successfully.']);
            }
        } catch (PDOException $e) {
            error_log("Error toggling discussion reaction: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['message' => 'Failed to toggle discussion reaction due to server error.']);
        }
    } else {
        http_response_code(405);
        echo json_encode(['message' => 'Method Not Allowed']);
    }
}

function handle_reply_reaction($requestMethod, $replyId)
{
    global $pdo;

    if ($requestMethod === 'POST') {
        $user = authenticate();
        if (!$user) {
            http_response_code(401);
            echo json_encode(['message' => 'Authentication required to react to a reply.']);
            return;
        }

        $data = json_decode(file_get_contents("php://input"), true);
        $userId = $user['id']; // Use authenticated user's ID
        $reactionType = $data['reactionType'] ?? null;

        if (!$reactionType) {
            http_response_code(400);
            echo json_encode(['message' => 'Reaction type is required.']);
            return;
        }

        try {
            $stmtExisting = $pdo->prepare('SELECT id, reactionType FROM reply_reactions WHERE replyId = ? AND userId = ?');
            $stmtExisting->execute([$replyId, $userId]);
            $existingReaction = $stmtExisting->fetch(PDO::FETCH_ASSOC);

            if ($existingReaction) {
                if ($existingReaction['reactionType'] === $reactionType) {
                    $stmtDelete = $pdo->prepare('DELETE FROM reply_reactions WHERE id = ?');
                    $stmtDelete->execute([$existingReaction['id']]);
                    http_response_code(200);
                    echo json_encode(['message' => 'Reaction removed successfully.']);
                } else {
                    $stmtUpdate = $pdo->prepare('UPDATE reply_reactions SET reactionType = ? WHERE id = ?');
                    $stmtUpdate->execute([$reactionType, $existingReaction['id']]);
                    http_response_code(200);
                    echo json_encode(['message' => 'Reaction updated successfully.']);
                }
            } else {
                $stmtInsert = $pdo->prepare('INSERT INTO reply_reactions (replyId, userId, reactionType) VALUES (?, ?, ?)');
                $stmtInsert->execute([$replyId, $userId, $reactionType]);
                http_response_code(201);
                echo json_encode(['message' => 'Reaction added successfully.']);
            }
        } catch (PDOException $e) {
            error_log("Error toggling reply reaction: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['message' => 'Failed to toggle reply reaction due to server error.']);
        }
    } else {
        http_response_code(405);
        echo json_encode(['message' => 'Method Not Allowed']);
    }
}
