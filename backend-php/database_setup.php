<?php

require_once __DIR__ . '/vendor/autoload.php'; // Ensure Composer autoloader is included
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/');
$dotenv->load();

require_once __DIR__ . '/config/database.php';

function initializeDatabase($pdo) {
    $schemaSql = file_get_contents(__DIR__ . '/database/database.sql');
    if ($schemaSql === false) {
        die("Error: Could not read database.sql file.");
    }

    // Split the SQL into individual statements and execute them one by one
    // This is a simplified split; a more robust solution might handle comments and complex statements better.
    $statements = array_filter(array_map('trim', explode(';', $schemaSql)));

    foreach ($statements as $statement) {
        if (!empty($statement)) {
            try {
                $pdo->exec($statement);
            } catch (PDOException $e) {
                // Log the error but don't necessarily stop execution for ALTER TABLE IF NOT EXISTS
                error_log("SQL Error: " . $e->getMessage() . " in statement: " . $statement);
            }
        }
    }
    // echo "Database schema initialized successfully.\n"; // Suppress output

    // Verify if the discussions table exists
    try {
        $stmt = $pdo->query("SELECT 1 FROM discussions LIMIT 1");
        // echo "Table 'discussions' exists.\n"; // Suppress output
    } catch (PDOException $e) {
        error_log("CRITICAL ERROR: Table 'discussions' does not exist or is inaccessible. Please check database.sql and database setup. Error: " . $e->getMessage());
        // Optionally, re-throw or handle more severely if this is a critical table
    }
}

function applyMigrations($pdo) {
    // Check if 'message' column in 'user_queries' table allows NULL
    $stmt = $pdo->prepare(
        "SELECT IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'user_queries' AND COLUMN_NAME = 'message'"
    );
    $stmt->execute([getenv('DB_NAME') ?: 'afyaclass']);
    $columnInfo = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($columnInfo && $columnInfo['IS_NULLABLE'] === 'NO') {
        // echo "Applying migration: Altering 'user_queries.message' to allow NULL.\n"; // Suppress output
        $pdo->exec('ALTER TABLE user_queries MODIFY COLUMN message TEXT NULL');
        // echo "Migration applied: 'user_queries.message' now allows NULL.\n"; // Suppress output
    } else {
        // echo "'user_queries.message' already allows NULL or column not found. No migration needed for user_queries.\n"; // Suppress output
    }

    // Check if 'message' column in 'chat_messages' table allows NULL
    $stmt = $pdo->prepare(
        "SELECT IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'chat_messages' AND COLUMN_NAME = 'message'"
    );
    $stmt->execute([getenv('DB_NAME') ?: 'afyaclass']);
    $chatMessageColumnInfo = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($chatMessageColumnInfo && $chatMessageColumnInfo['IS_NULLABLE'] === 'NO') {
        // echo "Applying migration: Altering 'chat_messages.message' to allow NULL.\n"; // Suppress output
        $pdo->exec('ALTER TABLE chat_messages MODIFY COLUMN message TEXT NULL');
        // echo "Migration applied: 'chat_messages.message' now allows NULL.\n"; // Suppress output
    } else {
        // echo "'chat_messages.message' already allows NULL or column not found. No migration needed for chat_messages.\n"; // Suppress output
    }

    // Check if 'materialTrialEndTime' column exists in 'users' table
    $stmt = $pdo->prepare(
        "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'materialTrialEndTime'"
    );
    $stmt->execute([getenv('DB_NAME') ?: 'afyaclass']);
    $columnExists = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$columnExists) {
        // echo "Applying migration: Adding 'materialTrialEndTime' to 'users' table.\n"; // Suppress output
        $pdo->exec('ALTER TABLE users ADD COLUMN materialTrialEndTime DATETIME NULL AFTER materialTrialStartTime');
        // echo "Migration applied: 'materialTrialEndTime' added to 'users' table.\n"; // Suppress output
    } else {
        // echo "'materialTrialEndTime' already exists in 'users' table. No migration needed.\n"; // Suppress output
    }

    // Initialize system_settings table
    $pdo->exec("CREATE TABLE IF NOT EXISTS system_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        setting_key VARCHAR(50) UNIQUE NOT NULL,
        setting_value VARCHAR(255) NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )");

    // Seed default global_free_access setting if not exists
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM system_settings WHERE setting_key = 'global_free_access'");
    $stmt->execute();
    if ($stmt->fetchColumn() == 0) {
        $stmt = $pdo->prepare("INSERT INTO system_settings (setting_key, setting_value) VALUES ('global_free_access', 'false')");
        $stmt->execute();
    }
}

// Execute initialization and migrations
initializeDatabase($pdo);
applyMigrations($pdo);

?>
