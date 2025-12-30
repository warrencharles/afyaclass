<?php

require_once __DIR__ . '/../config/database.php';

function handle_public_classes($requestMethod) {
    global $pdo;

    if ($requestMethod === 'GET') {
        try {
            $stmt = $pdo->query('SELECT * FROM classes');
            $classes = $stmt->fetchAll(PDO::FETCH_ASSOC);
            ob_clean(); // Clean any previous output
            http_response_code(200);
            echo json_encode($classes);
        } catch (PDOException $e) {
            error_log("Public fetch classes error: " . $e->getMessage());
            ob_clean(); // Clean any previous output
            http_response_code(500);
            echo json_encode(['message' => 'Error fetching classes.']);
        }
    } else {
        http_response_code(405);
        echo json_encode(['message' => 'Method Not Allowed']);
    }
}

function handle_public_class_levels($requestMethod) {
    global $pdo;

    if ($requestMethod === 'GET') {
        try {
            $stmt = $pdo->query('SELECT id, name, description, classId FROM class_levels');
            $classLevels = $stmt->fetchAll(PDO::FETCH_ASSOC);
            ob_clean(); // Clean any previous output
            http_response_code(200);
            echo json_encode($classLevels);
        } catch (PDOException $e) {
            error_log("Public fetch class levels error: " . $e->getMessage());
            ob_clean(); // Clean any previous output
            http_response_code(500);
            echo json_encode(['message' => 'Error fetching class levels.']);
        }
    } else {
        http_response_code(405);
        echo json_encode(['message' => 'Method Not Allowed']);
    }
}

function handle_admin_classes($requestMethod) {
    global $pdo;

    if ($requestMethod === 'GET') {
        try {
            $stmt = $pdo->query('SELECT * FROM classes');
            $classes = $stmt->fetchAll(PDO::FETCH_ASSOC);
            http_response_code(200);
            echo json_encode($classes);
        } catch (PDOException $e) {
            error_log("Admin fetch classes error: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['message' => 'Error fetching classes for admin.']);
        }
    } elseif ($requestMethod === 'POST') {
        $data = json_decode(file_get_contents("php://input"), true);
        $classCode = $data['classCode'] ?? '';
        $name = $data['name'] ?? '';
        $description = $data['description'] ?? null;

        if (!$classCode || !$name) {
            http_response_code(400);
            echo json_encode(['message' => 'Missing required fields: classCode, name.']);
            return;
        }

        try {
            $stmt = $pdo->prepare(
                'INSERT INTO classes (classCode, name, description) VALUES (?, ?, ?)'
            );
            $result = $stmt->execute([$classCode, $name, $description]);

            if ($result) {
                $classId = $pdo->lastInsertId();
                http_response_code(201);
                echo json_encode(['message' => 'Class created successfully!', 'classId' => $classId]);
            } else {
                http_response_code(500);
                echo json_encode(['message' => 'Failed to create class.']);
            }
        } catch (PDOException $e) {
            error_log("Admin create class error: " . $e->getMessage());
            if ($e->getCode() === '23000') {
                http_response_code(409);
                echo json_encode(['message' => 'Class with this code already exists.']);
            } else {
                http_response_code(500);
                echo json_encode(['message' => 'Failed to create class due to server error.']);
            }
        }
    } else { // This handles any other unsupported methods
        http_response_code(405);
        echo json_encode(['message' => 'Method Not Allowed']);
    }
}

function handle_admin_update_class($requestMethod, $classId) {
    global $pdo;

    if ($requestMethod === 'PUT' || $requestMethod === 'POST') {
        $updates = json_decode(file_get_contents("php://input"), true);

        unset($updates['id']);

        $setParts = [];
        $values = [];
        foreach ($updates as $key => $value) {
            $setParts[] = "`{$key}` = ?";
            $values[] = $value === '' ? null : $value;
        }

        if (empty($setParts)) {
            http_response_code(400);
            echo json_encode(['message' => 'No valid fields to update.']);
            return;
        }

        $sql = "UPDATE classes SET " . implode(', ', $setParts) . " WHERE id = ?";
        $values[] = $classId;

        try {
            $stmt = $pdo->prepare($sql);
            $success = $stmt->execute($values);

            if ($success && $stmt->rowCount() > 0) {
                http_response_code(200);
                echo json_encode(['message' => 'Class updated successfully!']);
            } elseif ($stmt->rowCount() === 0) {
                http_response_code(404);
                echo json_encode(['message' => 'Class not found or no changes made.']);
            } else {
                http_response_code(500);
                echo json_encode(['message' => 'Failed to update class.']);
            }
        } catch (PDOException $e) {
            error_log("Admin update class error: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['message' => 'Failed to update class due to server error.']);
        }
    } elseif ($requestMethod === 'DELETE') {
        try {
            $stmt = $pdo->prepare('DELETE FROM classes WHERE id = ?');
            $success = $stmt->execute([$classId]);

            if ($success && $stmt->rowCount() > 0) {
                http_response_code(200);
                echo json_encode(['message' => 'Class deleted successfully!']);
            } elseif ($stmt->rowCount() === 0) {
                http_response_code(404);
                echo json_encode(['message' => 'Class not found.']);
            } else {
                http_response_code(500);
                echo json_encode(['message' => 'Failed to delete class.']);
            }
        } catch (PDOException $e) {
            error_log("Admin delete class error: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['message' => 'Failed to delete class due to server error.']);
        }
    } else {
        http_response_code(405);
        echo json_encode(['message' => 'Method Not Allowed']);
    }
}

function handle_admin_class_levels($requestMethod) {
    global $pdo;

    if ($requestMethod === 'GET') {
        try {
            $stmt = $pdo->query('SELECT id, name, description, classId FROM class_levels');
            $classLevels = $stmt->fetchAll(PDO::FETCH_ASSOC);
            http_response_code(200);
            echo json_encode($classLevels);
        } catch (PDOException $e) {
            error_log("Admin fetch class levels error: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['message' => 'Error fetching class levels for admin.']);
        }
    } elseif ($requestMethod === 'POST') {
        $data = json_decode(file_get_contents("php://input"), true);
        $classLevelId = $data['id'] ?? null; // Check for ID for update

        if ($classLevelId !== null) { // If ID is present, it's an update
            // Call the dedicated update function for POST updates
            handle_admin_update_class_level('POST', $classLevelId);
        } else { // If no ID, it's a creation
            $name = $data['name'] ?? '';
            $description = $data['description'] ?? null;
            $classId = $data['classId'] ?? null;

            if (!$name) {
                http_response_code(400);
                echo json_encode(['message' => 'Missing required field: name.']);
                return;
            }

            try {
                $stmt = $pdo->prepare(
                    'INSERT INTO class_levels (name, description, classId) VALUES (?, ?, ?)'
                );
                $result = $stmt->execute([$name, $description, $classId]);

                if ($result) {
                    $classLevelId = $pdo->lastInsertId();
                    http_response_code(201);
                    echo json_encode(['message' => 'Class level created successfully!', 'classLevelId' => $classLevelId]);
                } else {
                    http_response_code(500);
                    echo json_encode(['message' => 'Failed to create class level.']);
                }
            } catch (PDOException $e) {
                error_log("Admin create class level error: " . $e->getMessage());
                if ($e->getCode() === '23000') {
                    http_response_code(409);
                    echo json_encode(['message' => 'Class level with this name already exists.']);
                } else {
                    http_response_code(500);
                    echo json_encode(['message' => 'Failed to create class level due to server error.']);
                }
            }
        }
    } elseif ($requestMethod === 'PUT') { // Explicitly handle PUT for updates
        $data = json_decode(file_get_contents("php://input"), true);
        $classLevelId = $data['id'] ?? null;

        if (!$classLevelId) {
            http_response_code(400);
            echo json_encode(['message' => 'Missing required field: id for updating class level.']);
            return;
        }
        // Call the dedicated update function
        handle_admin_update_class_level('PUT', $classLevelId);
    } else { // This handles any other unsupported methods
        http_response_code(405);
        echo json_encode(['message' => 'Method Not Allowed']);
    }
}

function handle_admin_update_class_level($requestMethod, $classLevelId) {
    global $pdo;

    if ($requestMethod === 'PUT' || $requestMethod === 'POST') {
        $updates = json_decode(file_get_contents("php://input"), true);

        unset($updates['id']);

        $setParts = [];
        $values = [];
        foreach ($updates as $key => $value) {
            $setParts[] = "`{$key}` = ?";
            $values[] = $value === '' ? null : $value;
        }

        if (empty($setParts)) {
            http_response_code(400);
            echo json_encode(['message' => 'No valid fields to update.']);
            return;
        }

        $sql = "UPDATE class_levels SET " . implode(', ', $setParts) . " WHERE id = ?";
        $values[] = $classLevelId;

        try {
            $stmt = $pdo->prepare($sql);
            $success = $stmt->execute($values);

            if ($success && $stmt->rowCount() > 0) {
                http_response_code(200);
                echo json_encode(['message' => 'Class level updated successfully!']);
            } elseif ($stmt->rowCount() === 0) {
                http_response_code(404);
                echo json_encode(['message' => 'Class level not found or no changes made.']);
            } else {
                http_response_code(500);
                echo json_encode(['message' => 'Failed to update class level.']);
            }
        } catch (PDOException $e) {
            error_log("Admin update class level error: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['message' => 'Failed to update class level due to server error.']);
        }
    } elseif ($requestMethod === 'DELETE') {
        try {
            $stmt = $pdo->prepare('DELETE FROM class_levels WHERE id = ?');
            $success = $stmt->execute([$classLevelId]);

            if ($success && $stmt->rowCount() > 0) {
                http_response_code(200);
                echo json_encode(['message' => 'Class level deleted successfully!']);
            } elseif ($stmt->rowCount() === 0) {
                http_response_code(404);
                echo json_encode(['message' => 'Class level not found.']);
            } else {
                http_response_code(500);
                echo json_encode(['message' => 'Failed to delete class level.']);
            }
        } catch (PDOException $e) {
            error_log("Admin delete class level error: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['message' => 'Failed to delete class level due to server error.']);
        }
    } else {
        http_response_code(405);
        echo json_encode(['message' => 'Method Not Allowed']);
    }
}
