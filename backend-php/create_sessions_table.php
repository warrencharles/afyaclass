<?php

require_once __DIR__ . '/vendor/autoload.php'; // For Dotenv

// Load environment variables
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
$dotenv->load();

$dbHost = $_ENV['DB_HOST'];
$dbUser = $_ENV['DB_USER'];
$dbPass = $_ENV['DB_PASSWORD'];
$dbName = $_ENV['DB_NAME'];

try {
    $dsn = "mysql:host=$dbHost;dbname=$dbName;charset=utf8mb4";
    $options = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ];
    $pdo = new PDO($dsn, $dbUser, $dbPass, $options);

    $sql = "CREATE TABLE IF NOT EXISTS sessions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        token VARCHAR(255) NOT NULL,
        device_id VARCHAR(255) NOT NULL,
        last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_user_session (user_id, device_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );";

    $pdo->exec($sql);
    echo "Table 'sessions' created or already exists successfully.\n";

} catch (\PDOException $e) {
    error_log("Database error: " . $e->getMessage());
    echo "Database error: " . $e->getMessage() . "\n";
    exit(1);
} catch (\Exception $e) {
    error_log("General error: " . $e->getMessage());
    echo "General error: " . $e->getMessage() . "\n";
    exit(1);
}

?>
