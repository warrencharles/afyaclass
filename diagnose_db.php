<?php
require_once __DIR__ . '/backend-php/config/database.php';

global $pdo;

echo "--- CLASSES ---\n";
$stmt = $pdo->query("SELECT id, classCode, name FROM classes");
while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
    echo "ID: {$row['id']} | Code: {$row['classCode']} | Name: {$row['name']}\n";
}

echo "\n--- CLASS LEVELS ---\n";
$stmt = $pdo->query("SELECT id, name, classId FROM class_levels");
while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
    echo "ID: {$row['id']} | Name: '{$row['name']}' | ClassID: " . ($row['classId'] ?? 'NULL') . "\n";
}

echo "\n--- CONTENT SAMPLE (CMT related) ---\n";
$stmt = $pdo->query("SELECT id, title, classId, classLevelId, subjectId FROM content LIMIT 20");
while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
    echo "ID: {$row['id']} | Title: '{$row['title']}' | ClassID: " . ($row['classId'] ?? 'NULL') . " | LevelID: " . ($row['classLevelId'] ?? 'NULL') . "\n";
}

echo "\n--- SUBJECTS SAMPLE ---\n";
$stmt = $pdo->query("SELECT id, name, classLevelId, semester FROM subjects LIMIT 10");
while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
    echo "ID: {$row['id']} | Name: '{$row['name']}' | LevelID: " . ($row['classLevelId'] ?? 'NULL') . "\n";
}
