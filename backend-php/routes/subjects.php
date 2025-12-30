<?php

require_once __DIR__ . '/../config/database.php';

function handle_public_subjects($requestMethod) {
    global $pdo;

    if ($requestMethod === 'GET') {
        try {
            $stmt = $pdo->query('SELECT * FROM subjects');
            $subjects = $stmt->fetchAll(PDO::FETCH_ASSOC);
            http_response_code(200);
            echo json_encode($subjects);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['message' => 'Error fetching subjects.']);
        }
    } else {
        http_response_code(405);
        echo json_encode(['message' => 'Method Not Allowed']);
    }
}

function handle_admin_subjects($requestMethod) {
    global $pdo;

    if ($requestMethod === 'GET') {
        try {
            $stmt = $pdo->query('SELECT s.*, cl.name as classLevelName FROM subjects s JOIN class_levels cl ON s.classLevelId = cl.id');
            $subjects = $stmt->fetchAll(PDO::FETCH_ASSOC);
            http_response_code(200);
            echo json_encode($subjects);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['message' => 'Error fetching subjects for admin.']);
        }
    } elseif ($requestMethod === 'POST') {
        $data = json_decode(file_get_contents("php://input"), true);
        $name = $data['name'] ?? '';
        $classLevelId = $data['classLevelId'] ?? null;
        $semester = $data['semester'] ?? null;

        if (!$name || !$classLevelId || !$semester) {
            http_response_code(400);
            echo json_encode(['message' => 'Missing required fields: name, classLevelId, semester.']);
            return;
        }

        try {
            $stmt = $pdo->prepare('INSERT INTO subjects (name, classLevelId, semester) VALUES (?, ?, ?)');
            $stmt->execute([$name, $classLevelId, $semester]);
            http_response_code(201);
            echo json_encode(['message' => 'Subject created successfully!']);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['message' => 'Failed to create subject.']);
        }
    } else {
        http_response_code(405);
        echo json_encode(['message' => 'Method Not Allowed']);
    }
}

function handle_admin_update_subject($requestMethod, $subjectId) {
    global $pdo;

    if ($requestMethod === 'PUT') {
        $data = json_decode(file_get_contents("php://input"), true);
        $name = $data['name'] ?? '';
        $classLevelId = $data['classLevelId'] ?? null;
        $semester = $data['semester'] ?? null;

        if (!$name || !$classLevelId || !$semester) {
            http_response_code(400);
            echo json_encode(['message' => 'Missing required fields: name, classLevelId, semester.']);
            return;
        }

        try {
            $stmt = $pdo->prepare('UPDATE subjects SET name = ?, classLevelId = ?, semester = ? WHERE id = ?');
            $stmt->execute([$name, $classLevelId, $semester, $subjectId]);
            http_response_code(200);
            echo json_encode(['message' => 'Subject updated successfully!']);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['message' => 'Failed to update subject.']);
        }
    } elseif ($requestMethod === 'DELETE') {
        try {
            $stmt = $pdo->prepare('DELETE FROM subjects WHERE id = ?');
            $stmt->execute([$subjectId]);
            http_response_code(200);
            echo json_encode(['message' => 'Subject deleted successfully!']);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['message' => 'Failed to delete subject.']);
        }
    } else {
        http_response_code(405);
        echo json_encode(['message' => 'Method Not Allowed']);
    }
}
