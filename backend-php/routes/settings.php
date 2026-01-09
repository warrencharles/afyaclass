<?php

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../utils/auth.php';

function handle_admin_system_settings($requestMethod)
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
            $stmt = $pdo->query("SELECT setting_key, setting_value FROM system_settings");
            $settings = $stmt->fetchAll(PDO::FETCH_KEY_PAIR); // Returns [key => value] array

            // Ensure booleans are returned as booleans for JSON
            $formattedSettings = [];
            foreach ($settings as $key => $value) {
                if ($value === 'true') {
                    $formattedSettings[$key] = true;
                } elseif ($value === 'false') {
                    $formattedSettings[$key] = false;
                } else {
                    $formattedSettings[$key] = $value;
                }
            }

            http_response_code(200);
            echo json_encode($formattedSettings);
        } catch (PDOException $e) {
            error_log("Fetch settings error: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['message' => 'Failed to fetch settings.']);
        }
    } elseif ($requestMethod === 'POST') {
        $data = json_decode(file_get_contents("php://input"), true);
        $settingKey = $data['key'] ?? null;
        $settingValue = $data['value'] ?? null;

        if (!$settingKey || $settingValue === null) {
            http_response_code(400);
            echo json_encode(['message' => 'Key and value are required.']);
            return;
        }

        // Convert boolean to string 'true'/'false' for storage
        $storedValue = $settingValue;
        if (is_bool($settingValue)) {
            $storedValue = $settingValue ? 'true' : 'false';
        }

        try {
            $stmt = $pdo->prepare("INSERT INTO system_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)");
            $stmt->execute([$settingKey, $storedValue]);

            http_response_code(200);
            echo json_encode(['message' => 'Setting updated successfully.']);
        } catch (PDOException $e) {
            error_log("Update setting error: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['message' => 'Failed to update setting.']);
        }
    } else {
        http_response_code(405);
        echo json_encode(['message' => 'Method Not Allowed']);
    }
}
