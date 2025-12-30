<?php

function sendPushNotification($userId, $title, $body, $data = []) {
    global $pdo;

    // Fetch Expo Push Tokens for the user
    $stmt = $pdo->prepare("SELECT token FROM user_push_tokens WHERE user_id = ?");
    $stmt->execute([$userId]);
    $tokens = $stmt->fetchAll(PDO::FETCH_COLUMN);

    if (empty($tokens)) {
        return;
    }

    $url = 'https://exp.host/--/api/v2/push/send';
    $postData = [];

    foreach ($tokens as $token) {
        if (!preg_match('/^ExponentPushToken\[.*\]$/', $token) && !preg_match('/^ExpoPushToken\[.*\]$/', $token)) {
             continue;
        }

        $postData[] = [
            'to' => $token,
            'title' => $title,
            'body' => $body,
            'data' => $data,
            'sound' => 'default',
        ];
    }

    if (empty($postData)) {
        return;
    }

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($postData));
    curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json'));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

    $response = curl_exec($ch);
    
    if (curl_errno($ch)) {
        error_log("Curl error sending push: " . curl_error($ch));
    } else {
        // Optionally handle invalid tokens from response to remove them from DB
        // $result = json_decode($response, true);
    }
    
    curl_close($ch);
}
?>
