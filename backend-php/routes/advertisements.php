<?php

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../utils/auth.php'; // Include the authentication utility

function handle_public_advertisements($requestMethod) {
    global $pdo;

    if ($requestMethod === 'GET') {
        try {
            $stmt = $pdo->query('SELECT * FROM advertisements WHERE isActive = 1');
            $advertisements = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // The base URL for the public-facing part of the backend.
            // Dynamically determine protocol (HTTP or HTTPS)
            $protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https://' : 'http://';
            $publicBaseUrl = $protocol . $_SERVER['HTTP_HOST'] . '/backend-php/public';

            $processedAds = array_map(function($ad) use ($publicBaseUrl) {
                if (isset($ad['imageUrl']) && !empty($ad['imageUrl'])) {
                    // Check if imageUrl is already an absolute URL
                    if (filter_var($ad['imageUrl'], FILTER_VALIDATE_URL)) {
                        // It's already a full URL, use it as is
                    } else {
                        // It's a relative path, prepend the publicBaseUrl
                        $ad['imageUrl'] = $publicBaseUrl . '/' . $ad['imageUrl'];
                    }
                }
                return $ad;
            }, $advertisements);

            ob_clean(); // Clean any previous output
            http_response_code(200);
            echo json_encode($processedAds);
        } catch (PDOException $e) {
            error_log("Public fetch advertisements error: " . $e->getMessage());
            ob_clean(); // Clean any previous output
            http_response_code(500);
            echo json_encode(['message' => 'Error fetching advertisements.', 'error' => $e->getMessage()]);
        }
    } else {
        http_response_code(405);
        echo json_encode(['message' => 'Method Not Allowed']);
    }
}

function handle_admin_advertisements($requestMethod) {
    global $pdo;

    // Authenticate admin requests
    $user = authenticate_admin(); // This function should handle exiting if not authorized
    if (!$user) {
        return; // Exit if authentication fails
    }

    if ($requestMethod === 'GET') {
        try {
            $stmt = $pdo->query('SELECT * FROM advertisements');
            $advertisements = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // The base URL for the public-facing part of the backend.
            // Dynamically determine protocol (HTTP or HTTPS)
            $protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https://' : 'http://';
            $publicBaseUrl = $protocol . $_SERVER['HTTP_HOST'] . '/backend-php/public';

            $processedAds = array_map(function($ad) use ($publicBaseUrl) {
                if (isset($ad['imageUrl']) && !empty($ad['imageUrl'])) {
                    // Check if imageUrl is already an absolute URL
                    if (filter_var($ad['imageUrl'], FILTER_VALIDATE_URL)) {
                        // It's already a full URL, use it as is
                    } else {
                        // It's a relative path, prepend the publicBaseUrl
                        $ad['imageUrl'] = $publicBaseUrl . '/' . $ad['imageUrl'];
                    }
                }
                return $ad;
            }, $advertisements);

            ob_clean(); // Clean any previous output
            http_response_code(200);
            echo json_encode($processedAds);
        } catch (PDOException $e) {
            error_log("Admin fetch advertisements error: " . $e->getMessage());
            ob_clean(); // Clean any previous output
            http_response_code(500);
            echo json_encode(['message' => 'Error fetching advertisements for admin.']);
        }
    } elseif ($requestMethod === 'POST') {
        $data = json_decode(file_get_contents("php://input"), true);
        $title = $data['title'] ?? '';
        $description = $data['description'] ?? null;
        $imageUrl = $data['imageUrl'] ?? '';
        $targetUrl = $data['targetUrl'] ?? null;
        $startDate = !empty($data['startDate']) ? $data['startDate'] : null;
        $endDate = !empty($data['endDate']) ? $data['endDate'] : null;
        $isActive = $data['isActive'] ?? false;

        if (!$title || !$imageUrl) {
            http_response_code(400);
            echo json_encode(['message' => 'Missing required fields: title, imageUrl.']);
            return;
        }

        // Ensure imageUrl is a full URL before saving to DB
        if (!filter_var($imageUrl, FILTER_VALIDATE_URL)) {
            $protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https://' : 'http://';
            $publicBaseUrl = $protocol . $_SERVER['HTTP_HOST'] . '/backend-php/uploads'; // Assuming /uploads is directly under /backend-php
            $imageUrl = $publicBaseUrl . '/' . ltrim($imageUrl, '/'); // Prepend base URL and ensure no double slashes
        }

        try {
            $stmt = $pdo->prepare(
                'INSERT INTO advertisements (title, description, imageUrl, targetUrl, startDate, endDate, isActive) VALUES (?, ?, ?, ?, ?, ?, ?)'
            );
            $result = $stmt->execute([
                $title,
                $description,
                $imageUrl, // Use the potentially modified full URL
                $targetUrl,
                $startDate,
                $endDate,
                (bool)$isActive
            ]);

            if ($result) {
                $advertisementId = $pdo->lastInsertId();
                http_response_code(201);
                echo json_encode(['message' => 'Advertisement created successfully!', 'advertisementId' => $advertisementId]);
            } else {
                http_response_code(500);
                echo json_encode(['message' => 'Failed to create advertisement.']);
            }
        } catch (PDOException $e) {
            error_log("Admin create advertisement error: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['message' => 'Failed to create advertisement due to server error.']);
        }
    } else {
        http_response_code(405);
        echo json_encode(['message' => 'Method Not Allowed']);
    }
}

function handle_admin_update_advertisement($requestMethod, $advertisementId) {
    global $pdo;

    // Authenticate admin requests
    $user = authenticate_admin(); // This function should handle exiting if not authorized
    if (!$user) {
        return; // Exit if authentication fails
    }

    if ($requestMethod === 'PUT') {
        $updates = json_decode(file_get_contents("php://input"), true);

        unset($updates['id']);

        $setParts = [];
        $values = [];
        foreach ($updates as $key => $value) {
            if ($key === 'imageUrl' && !filter_var($value, FILTER_VALIDATE_URL)) {
                // Ensure imageUrl is a full URL before saving to DB
                $protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https://' : 'http://';
                $publicBaseUrl = $protocol . $_SERVER['HTTP_HOST'] . '/backend-php/uploads';
                $value = $publicBaseUrl . '/' . ltrim($value, '/');
            }
            $setParts[] = "`{$key}` = ?";
            $values[] = $value === '' ? null : $value;
        }

        if (empty($setParts)) {
            http_response_code(400);
            echo json_encode(['message' => 'No valid fields to update.']);
            return;
        }

        $sql = "UPDATE advertisements SET " . implode(', ', $setParts) . " WHERE id = ?";
        $values[] = $advertisementId;

        try {
            $stmt = $pdo->prepare($sql);
            $success = $stmt->execute($values);

            if ($success && $stmt->rowCount() > 0) {
                http_response_code(200);
                echo json_encode(['message' => 'Advertisement updated successfully!']);
            } elseif ($stmt->rowCount() === 0) {
                http_response_code(404);
                echo json_encode(['message' => 'Advertisement not found or no changes made.']);
            } else {
                http_response_code(500);
                echo json_encode(['message' => 'Failed to update advertisement.']);
            }
        } catch (PDOException $e) {
            error_log("Admin update advertisement error: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['message' => 'Failed to update advertisement due to server error.']);
        }
    } elseif ($requestMethod === 'DELETE') {
        try {
            $stmt = $pdo->prepare('DELETE FROM advertisements WHERE id = ?');
            $success = $stmt->execute([$advertisementId]);

            if ($success && $stmt->rowCount() > 0) {
                http_response_code(200);
                echo json_encode(['message' => 'Advertisement deleted successfully!']);
            } elseif ($stmt->rowCount() === 0) {
                http_response_code(404);
                echo json_encode(['message' => 'Advertisement not found.']);
            } else {
                http_response_code(500);
                echo json_encode(['message' => 'Failed to delete advertisement.']);
            }
        } catch (PDOException $e) {
            error_log("Admin delete advertisement error: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['message' => 'Failed to delete advertisement due to server error.']);
        }
    } else {
        http_response_code(405);
        echo json_encode(['message' => 'Method Not Allowed']);
    }
}
