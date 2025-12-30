require_once __DIR__ . '/vendor/autoload.php';

$dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
$dotenv->load();

require_once __DIR__ . '/config/database.php';

try {
    $sql = "CREATE TABLE IF NOT EXISTS user_push_tokens (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        token VARCHAR(255) NOT NULL,
        device_type VARCHAR(50) DEFAULT 'unknown',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_user_token (user_id, token),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )";

    $pdo->exec($sql);
    echo "Table 'user_push_tokens' created successfully (or already exists).\n";
} catch (PDOException $e) {
    die("DB ERROR: " . $e->getMessage());
}
?>
