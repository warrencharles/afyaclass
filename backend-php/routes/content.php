<?php

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/notifications.php'; // Include the notifications functions


function handle_admin_content($requestMethod)
{
    global $pdo;

    // Authenticate admin user
    $authenticatedUser = authenticate();
    if (!$authenticatedUser || $authenticatedUser['role'] !== 'admin') {
        http_response_code(403);
        echo json_encode(['message' => 'Forbidden: Admin access required.']);
        exit();
    }

    if ($requestMethod === 'GET') {
        try {
            $stmt = $pdo->query('SELECT id, title, type, fileUrl, fileType, videoUrl, originalFileName, classLevelId, subjectId, classId, semester, uploadedBy, createdAt, updatedAt FROM content');
            $contentRows = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $processedContent = array_map(function ($content) {
                // Determine the base URL for uploads
                $protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https://' : 'http://';
                $publicBaseUrl = $protocol . $_SERVER['HTTP_HOST'] . '/backend-php/public'; // Changed from /backend-php/uploads to /backend-php/public

                if (!empty($content['fileUrl'])) {
                    // Check if fileUrl is already an absolute URL. If not, prepend the base URL.
                    if (!filter_var($content['fileUrl'], FILTER_VALIDATE_URL)) {
                        // Ensure the relative path doesn't start with a slash if we're adding one
                        $relativePath = ltrim($content['fileUrl'], '/');
                        // Compatibility: If the path is just 'uploads/filename.pdf', it's already structured correctly.
                        $content['fileUrl'] = $publicBaseUrl . '/' . $relativePath;
                    } else {
                        // Even if it's an absolute URL, if it's pointing to localhost/dev and we're on prod, 
                        // we should try to fix it. This is a bit risky but safer for migration.
                        $urlParts = parse_url($content['fileUrl']);
                        if (isset($urlParts['path'])) {
                            $filename = basename($urlParts['path']);
                            $content['fileUrl'] = $publicBaseUrl . '/uploads/' . $filename;
                        }
                    }
                }
                return $content;
            }, $contentRows);

            http_response_code(200);
            echo json_encode($processedContent);
        } catch (PDOException $e) {
            error_log("Admin fetch content error: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['message' => 'Error fetching content for admin.']);
        }
    } elseif ($requestMethod === 'POST') {
        // Handle file upload
        $fileUrl = null;
        $fileType = null;
        $originalFileName = null; // Initialize originalFileName

        // Check for file upload via $_FILES first
        if (isset($_FILES['file']) && $_FILES['file']['error'] === UPLOAD_ERR_OK) {
            $uploadDir = __DIR__ . '/../uploads/';
            if (!is_dir($uploadDir)) {
                mkdir($uploadDir, 0777, true);
            }

            $originalFileName = basename($_FILES['file']['name']); // Capture original name
            $fileExt = strtolower(pathinfo($originalFileName, PATHINFO_EXTENSION));

            // SECURITY: Whitelist allowed file extensions
            $allowedExtensions = ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png', 'mp4', 'mp3'];
            if (!in_array($fileExt, $allowedExtensions)) {
                http_response_code(400); // Bad Request
                echo json_encode(['message' => 'Invalid file type. Only PDF, Docs, Images, and Video/Audio files are allowed.']);
                return;
            }

            $sanitized = sanitize_filename($originalFileName);
            $namePart = pathinfo($sanitized, PATHINFO_FILENAME);
            $newFileName = $sanitized;

            $targetFilePath = $uploadDir . $newFileName;

            // Handle collisions
            $counter = 1;
            while (file_exists($targetFilePath)) {
                $newFileName = $namePart . '_' . bin2hex(random_bytes(2)) . '.' . $fileExt;
                $targetFilePath = $uploadDir . $newFileName;
                $counter++;
                if ($counter > 5)
                    break;
            }

            if (move_uploaded_file($_FILES['file']['tmp_name'], $targetFilePath)) {
                $fileUrl = 'uploads/' . $newFileName; // Store relative path
                $fileType = $_FILES['file']['type'];
            } else {
                http_response_code(500);
                echo json_encode(['message' => 'Failed to upload file.']);
                return;
            }
        } else {
            // If no file was uploaded via $_FILES, check if fileUrl and fileType are provided in $_POST
            $fileUrl = $_POST['fileUrl'] ?? null;
            $fileType = $_POST['fileType'] ?? null;
            $originalFileName = $_POST['originalFileName'] ?? null;
        }

        $title = $_POST['title'] ?? '';
        $type = $_POST['type'] ?? '';
        $videoUrl = $_POST['videoUrl'] ?? null;
        $classLevelId = $_POST['classLevelId'] ?? null;
        $subjectId = $_POST['subjectId'] ?? null;
        $classId = $_POST['classId'] ?? null;
        $semester = $_POST['semester'] ?? null;
        $uploadedBy = $authenticatedUser['id'];

        $semesterToInsert = ($semester === '') ? null : $semester;

        // If videoUrl is provided and no file info is present, set fileType to 'video'
        // This condition needs to be re-evaluated based on the new logic for fileUrl/fileType
        // If fileUrl is already set from $_POST, we don't want to override fileType to 'video'
        if ($videoUrl && empty($fileUrl) && empty($fileType)) { // Only set fileType to 'video' if no file info is present
            $fileType = 'video';
        }

        // Final validation: ensure either file info or video URL is present
        if ((empty($fileUrl) || empty($fileType)) && empty($videoUrl)) {
            http_response_code(400);
            echo json_encode(['message' => 'Either a file (with URL and type) or a videoUrl must be provided.']);
            return;
        }
        if (!$title || !$type || $classLevelId === null || $subjectId === null || $classId === null) {
            $missingFields = [];
            if (!$title)
                $missingFields[] = 'title';
            if (!$type)
                $missingFields[] = 'type';
            if ($classLevelId === null)
                $missingFields[] = 'classLevelId';
            if ($subjectId === null)
                $missingFields[] = 'subjectId';
            if ($classId === null)
                $missingFields[] = 'classId';
            http_response_code(400);
            echo json_encode(['message' => 'Missing required fields: ' . implode(', ', $missingFields) . '.']);
            return;
        }

        try {
            $stmt = $pdo->prepare(
                'INSERT INTO content (title, type, fileUrl, fileType, videoUrl, originalFileName, classLevelId, subjectId, classId, semester, uploadedBy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
            );

            $result = $stmt->execute([
                $title,
                $type,
                $fileUrl,
                $fileType,
                $videoUrl,
                $originalFileName, // Add originalFileName here
                $classLevelId,
                $subjectId,
                $classId,
                $semesterToInsert,
                $uploadedBy
            ]);

            if ($result) {
                $contentId = $pdo->lastInsertId();
                http_response_code(201);
                echo json_encode(['message' => 'Content created successfully!', 'contentId' => $contentId, 'fileUrl' => $fileUrl, 'originalFileName' => $originalFileName]);
            } else {
                http_response_code(500);
                echo json_encode(['message' => 'Failed to create content.']);
            }
        } catch (PDOException $e) {
            error_log("Admin create content error: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['message' => 'Failed to create content due to server error.']);
        }
    } else {
        http_response_code(405);
        echo json_encode(['message' => 'Method Not Allowed']);
    }
}

function handle_admin_update_content($requestMethod, $contentId)
{
    global $pdo;

    // Authenticate admin user
    $authenticatedUser = authenticate();
    if (!$authenticatedUser || $authenticatedUser['role'] !== 'admin') {
        http_response_code(403);
        echo json_encode(['message' => 'Forbidden: Admin access required.']);
        exit();
    }

    if ($requestMethod === 'POST') { // Changed from PUT to POST
        // The logic for handling file uploads and form data is similar to the content creation part
        $title = $_POST['title'] ?? '';
        $type = $_POST['type'] ?? '';
        $videoUrl = $_POST['videoUrl'] ?? null;
        $classLevelId = $_POST['classLevelId'] ?? null;
        $subjectId = $_POST['subjectId'] ?? null;
        $classId = $_POST['classId'] ?? null;
        $semester = $_POST['semester'] ?? null;
        $uploadedBy = $authenticatedUser['id'];

        $semesterToInsert = ($semester === '') ? null : $semester;

        // Initialize file-related variables
        $fileUrl = null;
        $fileType = null;
        $originalFileName = null;

        // First, check if a new file is being uploaded via $_FILES
        if (isset($_FILES['file']) && $_FILES['file']['error'] === UPLOAD_ERR_OK) {
            $uploadDir = __DIR__ . '/../uploads/';
            if (!is_dir($uploadDir)) {
                mkdir($uploadDir, 0777, true);
            }

            $originalFileName = basename($_FILES['file']['name']); // Capture original name
            $fileExt = strtolower(pathinfo($originalFileName, PATHINFO_EXTENSION));
            $sanitized = sanitize_filename($originalFileName);
            $namePart = pathinfo($sanitized, PATHINFO_FILENAME);
            $newFileName = $sanitized;

            $targetFilePath = $uploadDir . $newFileName;

            // Handle collisions
            $counter = 1;
            while (file_exists($targetFilePath)) {
                $newFileName = $namePart . '_' . bin2hex(random_bytes(2)) . '.' . $fileExt;
                $targetFilePath = $uploadDir . $newFileName;
                $counter++;
                if ($counter > 5)
                    break;
            }

            if (move_uploaded_file($_FILES['file']['tmp_name'], $targetFilePath)) {
                $fileUrl = 'uploads/' . $newFileName; // Store relative path
                $fileType = $_FILES['file']['type'];
            } else {
                http_response_code(500);
                echo json_encode(['message' => 'Failed to upload file.']);
                return;
            }
        } else {
            // If no new file is uploaded, check if fileUrl, fileType, and originalFileName are provided in $_POST
            $fileUrl = $_POST['fileUrl'] ?? null;
            $fileType = $_POST['fileType'] ?? null;
            $originalFileName = $_POST['originalFileName'] ?? null;
        }

        $title = $_POST['title'] ?? '';
        $type = $_POST['type'] ?? '';
        $videoUrl = $_POST['videoUrl'] ?? null;
        $classLevelId = $_POST['classLevelId'] ?? null;
        $subjectId = $_POST['subjectId'] ?? null;
        $classId = $_POST['classId'] ?? null;
        $semester = $_POST['semester'] ?? null;
        $uploadedBy = $authenticatedUser['id'];

        $semesterToInsert = ($semester === '') ? null : $semester;

        // If videoUrl is provided and no file info is present, set fileType to 'video'
        if ($videoUrl && empty($fileUrl) && empty($fileType)) {
            $fileType = 'video';
        }

        // Final validation: ensure either file info or video URL is present
        if ((empty($fileUrl) || empty($fileType)) && empty($videoUrl)) {
            http_response_code(400);
            echo json_encode(['message' => 'Either a file (with URL and type) or a videoUrl must be provided.']);
            return;
        }

        if (!$title || !$type || $classLevelId === null || $subjectId === null || $classId === null) {
            $missingFields = [];
            if (!$title)
                $missingFields[] = 'title';
            if (!$type)
                $missingFields[] = 'type';
            if ($classLevelId === null)
                $missingFields[] = 'classLevelId';
            if ($subjectId === null)
                $missingFields[] = 'subjectId';
            if ($classId === null)
                $missingFields[] = 'classId';
            http_response_code(400);
            echo json_encode(['message' => 'Missing required fields: ' . implode(', ', $missingFields) . '.']);
            return;
        }

        try {
            $stmt = $pdo->prepare(
                'UPDATE content SET title = ?, type = ?, fileUrl = ?, fileType = ?, videoUrl = ?, originalFileName = ?, classLevelId = ?, subjectId = ?, classId = ?, semester = ?, uploadedBy = ? WHERE id = ?'
            );

            $result = $stmt->execute([
                $title,
                $type,
                $fileUrl,
                $fileType,
                $videoUrl,
                $originalFileName, // Add originalFileName here
                $classLevelId,
                $subjectId,
                $classId,
                $semesterToInsert,
                $uploadedBy,
                $contentId
            ]);

            if ($result && $stmt->rowCount() > 0) {
                http_response_code(200);
                echo json_encode(['message' => 'Content updated successfully!']);
            } elseif ($stmt->rowCount() === 0) {
                http_response_code(404);
                echo json_encode(['message' => 'Content not found or no changes made.']);
            } else {
                http_response_code(500);
                echo json_encode(['message' => 'Failed to update content.']);
            }
        } catch (PDOException $e) {
            error_log("Admin update content error: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['message' => 'Failed to update content due to server error.']);
        }
    } elseif ($requestMethod === 'DELETE') {
        try {
            $stmt = $pdo->prepare('DELETE FROM content WHERE id = ?');
            $success = $stmt->execute([$contentId]);

            if ($success && $stmt->rowCount() > 0) {
                http_response_code(200);
                echo json_encode(['message' => 'Content deleted successfully!']);
            } elseif ($stmt->rowCount() === 0) {
                http_response_code(404);
                echo json_encode(['message' => 'Content not found.']);
            } else {
                http_response_code(500);
                echo json_encode(['message' => 'Failed to delete content.']);
            }
        } catch (PDOException $e) {
            error_log("Admin delete content error: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['message' => 'Failed to delete content due to server error.']);
        }
    } else {
        http_response_code(405);
        echo json_encode(['message' => 'Method Not Allowed']);
    }
}

function handle_user_content($requestMethod, $requestedUserId)
{
    global $pdo;

    // Authenticate user
    $authenticatedUser = authenticate();
    if (!$authenticatedUser) {
        http_response_code(401);
        echo json_encode(['message' => 'Unauthorized: Please log in.']);
        exit();
    }

    // Authorization check: A user can only access their own content, unless they are an admin.
    if ($authenticatedUser['role'] !== 'admin' && $authenticatedUser['id'] !== $requestedUserId) {
        http_response_code(403);
        echo json_encode(['message' => 'Forbidden: You do not have permission to access this content.']);
        exit();
    }

    if ($requestMethod === 'GET') {
        try {
            $stmtUser = $pdo->prepare(
                'SELECT hasMaterialAccess, materialTrialStartTime, materialTrialEndTime, materialPaidAccessEndTime, classLevel, classType, hasPendingPayment FROM users WHERE id = ?'
            );
            $stmtUser->execute([$requestedUserId]); // Use requestedUserId here
            $user = $stmtUser->fetch(PDO::FETCH_ASSOC);

            if (!$user) {
                error_log("handle_user_content: User ID {$requestedUserId} not found.");
                http_response_code(404);
                echo json_encode(['message' => 'User not found.']);
                return;
            }

            error_log("handle_user_content: User data fetched for ID {$requestedUserId}.");
            error_log("hasMaterialAccess: " . ($user['hasMaterialAccess'] ? 'true' : 'false'));
            error_log("materialTrialStartTime: " . ($user['materialTrialStartTime'] ?? 'NULL'));
            error_log("materialTrialEndTime: " . ($user['materialTrialEndTime'] ?? 'NULL'));
            error_log("materialPaidAccessEndTime: " . ($user['materialPaidAccessEndTime'] ?? 'NULL'));

            $hasMaterialAccess = (bool) $user['hasMaterialAccess'];
            $materialTrialStartTime = $user['materialTrialStartTime'];
            $materialTrialEndTime = $user['materialTrialEndTime']; // Fetch materialTrialEndTime
            $materialPaidAccessEndTime = $user['materialPaidAccessEndTime'];
            $classLevelName = $user['classLevel'];
            $classTypeCode = $user['classType'];

            $resolvedClassLevelId = null;
            if ($classLevelName) {
                $stmtClassLevel = $pdo->prepare('SELECT id FROM class_levels WHERE name = ?');
                $stmtClassLevel->execute([$classLevelName]);
                $classLevel = $stmtClassLevel->fetch(PDO::FETCH_ASSOC);
                if ($classLevel) {
                    $resolvedClassLevelId = $classLevel['id'];
                }
            }

            $resolvedClassId = null;
            if ($classTypeCode) {
                $stmtClass = $pdo->prepare('SELECT id FROM classes WHERE classCode = ?');
                $stmtClass->execute([$classTypeCode]);
                $class = $stmtClass->fetch(PDO::FETCH_ASSOC);
                if ($class) {
                    $resolvedClassId = $class['id'];
                }
            }

            $contentQuery = 'SELECT id, title, type, fileUrl, fileType, videoUrl, classLevelId, subjectId, classId, semester, uploadedBy, createdAt, updatedAt FROM content WHERE 1=1';
            $queryParams = [];

            if ($resolvedClassLevelId !== null) {
                $contentQuery .= ' AND classLevelId = ?';
                $queryParams[] = $resolvedClassLevelId;
            }
            if ($resolvedClassId !== null) {
                $contentQuery .= ' AND classId = ?';
                $queryParams[] = $resolvedClassId;
            }

            $stmtContent = $pdo->prepare($contentQuery);
            $stmtContent->execute($queryParams);
            $contentRows = $stmtContent->fetchAll(PDO::FETCH_ASSOC);

            $processedContent = array_map(function ($content) use ($hasMaterialAccess, $materialTrialStartTime, $materialTrialEndTime, $materialPaidAccessEndTime) {
                // Determine the base URL for uploads
                $protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https://' : 'http://';
                $publicBaseUrl = $protocol . $_SERVER['HTTP_HOST'] . '/backend-php/public';

                if (!empty($content['fileUrl'])) {
                    if (!filter_var($content['fileUrl'], FILTER_VALIDATE_URL)) {
                        $relativePath = ltrim($content['fileUrl'], '/');
                        $content['fileUrl'] = $publicBaseUrl . '/' . $relativePath;
                    } else {
                        // Fix old absolute URLs
                        $urlParts = parse_url($content['fileUrl']);
                        if (isset($urlParts['path'])) {
                            $filename = basename($urlParts['path']);
                            $content['fileUrl'] = $publicBaseUrl . '/uploads/' . $filename;
                        }
                    }
                }

                $accessStatus = 'locked';
                $remainingTrialTime = 0;
                $remainingPaidAccessTime = 0;

                $now = new DateTime('now', new DateTimeZone('UTC'));
                $nowTimestamp = $now->getTimestamp();

                // Check for paid access first
                if ($materialPaidAccessEndTime) {
                    try {
                        $paidAccessEnd = new DateTime($materialPaidAccessEndTime, new DateTimeZone('UTC'));
                        if ($paidAccessEnd > $now) {
                            $accessStatus = 'unlocked';
                            $remainingPaidAccessTime = $paidAccessEnd->getTimestamp() - $nowTimestamp;
                        }
                    } catch (Exception $e) {
                        error_log("Error parsing materialPaidAccessEndTime '{$materialPaidAccessEndTime}': " . $e->getMessage());
                    }
                }

                // If not unlocked by paid access, check for trial access
                if ($accessStatus === 'locked' && $materialTrialStartTime && $materialTrialEndTime) {
                    try {
                        $trialStart = new DateTime($materialTrialStartTime, new DateTimeZone('UTC'));
                        $trialEnd = new DateTime($materialTrialEndTime, new DateTimeZone('UTC')); // Use the stored trial end time

                        if ($trialEnd > $now) {
                            $accessStatus = 'trial';
                            $remainingTrialTime = $trialEnd->getTimestamp() - $nowTimestamp;
                        }
                    } catch (Exception $e) {
                        error_log("Error parsing materialTrialStartTime '{$materialTrialStartTime}' or materialTrialEndTime '{$materialTrialEndTime}': " . $e->getMessage());
                    }
                }

                return array_merge($content, [
                    'accessStatus' => $accessStatus,
                    'remainingTrialTime' => $remainingTrialTime,
                    'remainingPaidAccessTime' => $remainingPaidAccessTime,
                ]);
            }, $contentRows);

            http_response_code(200);
            echo json_encode($processedContent);

        } catch (PDOException $e) {
            error_log("User fetch content error for user {$requestedUserId}: " . $e->getMessage() . " Trace: " . $e->getTraceAsString());
            http_response_code(500);
            echo json_encode(['message' => 'Failed to fetch user content due to server error.']);
        }
    } else {
        http_response_code(405);
        echo json_encode(['message' => 'Method Not Allowed']);
    }
}

function handle_submit_user_query($requestMethod)
{
    global $pdo;

    // Authenticate user
    $authenticatedUser = authenticate();
    if (!$authenticatedUser) {
        http_response_code(401);
        echo json_encode(['message' => 'Unauthorized: Please log in.']);
        exit();
    }

    if ($requestMethod === 'POST') {
        $query = $_POST['query'] ?? '';
        $userId = $authenticatedUser['id']; // Get userId from authenticated user
        $filePath = null;

        if (isset($_FILES['file']) && $_FILES['file']['error'] === UPLOAD_ERR_OK) {
            $uploadDir = __DIR__ . '/../uploads/';
            if (!is_dir($uploadDir)) {
                mkdir($uploadDir, 0777, true);
            }
            $fileName = uniqid() . '-' . basename($_FILES['file']['name']);
            $targetFilePath = $uploadDir . $fileName;
            if (move_uploaded_file($_FILES['file']['tmp_name'], $targetFilePath)) {
                // Construct the full public URL for the uploaded file
                $protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https://' : 'http://';
                $publicBaseUrl = $protocol . $_SERVER['HTTP_HOST'] . '/backend-php/uploads'; // Assuming /uploads is directly under /backend-php
                $filePath = $publicBaseUrl . '/' . $fileName; // Store the full URL
            } else {
                http_response_code(500);
                echo json_encode(['message' => 'Failed to upload file.']);
                return;
            }
        }

        if (!$userId || (!$query && !$filePath)) {
            http_response_code(400);
            echo json_encode(['message' => 'User ID and either a query or a file are required.']);
            return;
        }

        try {
            $stmt = $pdo->prepare(
                'INSERT INTO user_queries (userId, message, filePath, readStatus) VALUES (?, ?, ?, ?)'
            );
            $stmt->execute([$userId, $query, $filePath, FALSE]); // Default to FALSE for readStatus
            $queryId = $pdo->lastInsertId();

            // Notify admins about the new user query
            $adminStmt = $pdo->query('SELECT id FROM users WHERE role = "admin"');
            $admins = $adminStmt->fetchAll(PDO::FETCH_ASSOC);

            $userStmt = $pdo->prepare('SELECT username FROM users WHERE id = ?');
            $userStmt->execute([$userId]);
            $submittingUser = $userStmt->fetch(PDO::FETCH_ASSOC);
            $submittingUsername = $submittingUser ? $submittingUser['username'] : "User ID: {$userId}";

            foreach ($admins as $admin) {
                createNotification(
                    $admin['id'],
                    'user_query_submitted',
                    "New user query submitted by {$submittingUsername}.",
                    $userId,
                    $queryId, // entityId
                    'user_query' // entityType
                );
            }

            http_response_code(201);
            echo json_encode(['message' => 'Query submitted successfully!', 'queryId' => $queryId, 'file_url' => $filePath]);

        } catch (PDOException $e) {
            error_log("Submit user query error: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['message' => 'Failed to submit query due to server error.']);
        }
    } else {
        http_response_code(405);
        echo json_encode(['message' => 'Method Not Allowed']);
    }
}

function handle_admin_respond_user_query($requestMethod, $queryId)
{
    global $pdo;

    // Authenticate admin user
    $user = authenticate();
    if (!$user || $user['role'] !== 'admin') {
        http_response_code(403);
        echo json_encode(['message' => 'Forbidden: Admin access required.']);
        exit();
    }

    if ($requestMethod === 'PUT') {
        $data = json_decode(file_get_contents("php://input"), true);
        $adminResponse = $data['adminResponse'] ?? '';

        if (!$adminResponse) {
            http_response_code(400);
            echo json_encode(['message' => 'Admin response is required.']);
            return;
        }

        try {
            $stmt = $pdo->prepare(
                'UPDATE user_queries SET adminResponse = ?, readStatus = TRUE, updatedAt = CURRENT_TIMESTAMP WHERE id = ?'
            );
            $success = $stmt->execute([$adminResponse, $queryId]);

            if (!$success || $stmt->rowCount() === 0) {
                http_response_code(404);
                echo json_encode(['message' => 'User query not found or no changes made.']);
                return;
            }

            // Fetch user ID for notification
            $queryStmt = $pdo->prepare('SELECT userId FROM user_queries WHERE id = ?');
            $queryStmt->execute([$queryId]);
            $queryDetails = $queryStmt->fetch(PDO::FETCH_ASSOC);

            if ($queryDetails && $queryDetails['userId']) {
                createNotification(
                    $queryDetails['userId'],
                    'query_responded',
                    "Your query has been responded to by an admin.",
                    $user['id'], // Admin as sender
                    $queryId, // entityId
                    'user_query' // entityType
                );
            }

            http_response_code(200);
            echo json_encode(['message' => 'User query responded to successfully!']);

        } catch (PDOException $e) {
            error_log("Admin respond user query error: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['message' => 'Failed to respond to user query due to server error.']);
        }
    } else {
        http_response_code(405);
        echo json_encode(['message' => 'Method Not Allowed']);
    }
}
