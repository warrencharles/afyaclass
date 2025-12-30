<?php


$dbHost = $_ENV['DB_HOST'];
$dbUser = $_ENV['DB_USER'];
$dbPass = $_ENV['DB_PASSWORD'];
$dbName = $_ENV['DB_NAME'];

// Use PDO for database connection
try {
    $dsn = "mysql:host=$dbHost;dbname=$dbName;charset=utf8mb4";
    $options = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ];
    $pdo = new PDO($dsn, $dbUser, $dbPass, $options);
} catch (\PDOException $e) {
    // Log the error for the administrator
    error_log("Database connection failed: " . $e->getMessage() . " in " . $e->getFile() . " on line " . $e->getLine());

    // Send a generic 500 response
    http_response_code(500);

    $appEnv = $_ENV['APP_ENV'] ?? 'production';
    if ($appEnv !== 'production') {
        echo 'Database connection failed: ' . $e->getMessage() . ' in ' . $e->getFile() . ' on line ' . $e->getLine();
    } else {
        echo json_encode(['message' => 'An internal server error occurred. Please try again later.']);
    }
    exit();
}

// You can return the PDO instance or use it directly within this file.
// For this example, we'll assume it's accessible globally or passed around.
// If you need to use it in other files, you might want to return it or store it in a global variable/singleton.
// For simplicity here, we'll just have it defined.

// Example of how to use it in another file (e.g., a model or controller):
/*
require_once 'config/database.php'; // Or use Composer's autoloader if structured properly

$stmt = $pdo->query("SELECT * FROM users LIMIT 1");
$user = $stmt->fetch();
print_r($user);
*/
?>