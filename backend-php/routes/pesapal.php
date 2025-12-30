<?php

require_once __DIR__ . '/../config/database.php';

// Pesapal Configuration (from .env)
$pesapalEnv = $_ENV['PESAPAL_ENV'] ?? 'sandbox';
$pesapalBaseUrl = ($pesapalEnv === 'sandbox') ? 'https://cybqa.pesapal.com/pesapalv3' : 'https://pay.pesapal.com/v3';
$pesapalConsumerKey = $_ENV['PESAPAL_CONSUMER_KEY'] ?? null;
$pesapalConsumerSecret = $_ENV['PESAPAL_CONSUMER_SECRET'] ?? null;
$pesapalIpnUrl = $_ENV['PESAPAL_IPN_URL'] ?? null;
$pesapalRedirectUrl = $_ENV['PESAPAL_REDIRECT_URL'] ?? null;

error_log("DEBUG (pesapal.php): Loaded PESAPAL_REDIRECT_URL from .env: " . ($pesapalRedirectUrl ?: 'Not Set'));

// Global variables for Pesapal token and IPN ID
$pesapalAccessToken = null;
$pesapalTokenExpiry = 0;
$pesapalIpnId = null;

function getPesapalAccessToken()
{
    global $pesapalAccessToken, $pesapalTokenExpiry, $pesapalBaseUrl, $pesapalConsumerKey, $pesapalConsumerSecret;

    $now = time();
    if ($pesapalAccessToken && $pesapalTokenExpiry > $now) {
        error_log('Using cached Pesapal Access Token.');
        return $pesapalAccessToken;
    }

    error_log('Attempting to get new Pesapal Access Token...');
    error_log('DEBUG (pesapal.php): PESAPAL_CONSUMER_KEY: ' . ($pesapalConsumerKey ?: 'Undefined'));
    error_log('DEBUG (pesapal.php): PESAPAL_CONSUMER_SECRET: ' . ($pesapalConsumerSecret ?: 'Undefined'));
    $requestUrl = "{$pesapalBaseUrl}/api/Auth/RequestToken";
    $requestPayload = [
        'consumer_key' => $pesapalConsumerKey,
        'consumer_secret' => $pesapalConsumerSecret,
    ];

    $ch = curl_init($requestUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($requestPayload));
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'Accept: application/json'
    ]);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 2);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);

    if ($response === false) {
        $errno = curl_errno($ch);
        $error = curl_error($ch);
        error_log("cURL error (errno: {$errno}): {$error}");
        throw new Exception('Failed to connect to Pesapal API. cURL Error: ' . $error);
    }

    $responseData = json_decode($response, true);

    if ($httpCode !== 200 || !isset($responseData['token'])) {
        error_log("Error getting Pesapal access token. HTTP Code: {$httpCode}, Response: " . print_r($responseData, true));
        if ($response !== false) {
            error_log("Pesapal Auth Response (raw): " . $response);
        }
        throw new Exception('Failed to get Pesapal access token. Response: ' . ($responseData['message'] ?? 'Unknown error.'));
    }

    $pesapalAccessToken = $responseData['token'];
    $expiryDateTime = new DateTime($responseData['expiryDate']);
    $pesapalTokenExpiry = $expiryDateTime->getTimestamp() - 60; // Subtract 1 minute for buffer

    error_log('Pesapal Access Token obtained.');
    return $pesapalAccessToken;
}

function registerPesapalIpn()
{
    global $pesapalIpnId, $pesapalBaseUrl, $pesapalIpnUrl;

    try {
        $token = getPesapalAccessToken();
        $requestUrl = "{$pesapalBaseUrl}/api/URLSetup/RegisterIPN";
        $requestPayload = [
            "url" => $pesapalIpnUrl,
            "ipn_notification_type" => "POST"
        ];

        $ch = curl_init($requestUrl);
        curl_setopt($ch, CURLOPT_POST, 1);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($requestPayload));
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            "Accept: application/json",
            "Content-Type: application/json",
            "Authorization: Bearer {$token}"
        ]);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 2);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        if ($response === false) {
            error_log("cURL error during IPN registration: {$error}");
            throw new Exception('Failed to connect to Pesapal API for IPN registration.');
        }

        $responseData = json_decode($response, true);

        if ($httpCode !== 200 || !isset($responseData['ipn_id'])) {
            error_log("Error registering Pesapal IPN. HTTP Code: {$httpCode}, Response: " . print_r($responseData, true));
            throw new Exception('Failed to register Pesapal IPN. Response: ' . ($responseData['message'] ?? 'Unknown error.'));
        }

        $pesapalIpnId = $responseData['ipn_id'];
        error_log('Pesapal IPN registered successfully. ID: ' . $pesapalIpnId);
        return $pesapalIpnId;

    } catch (Exception $e) {
        error_log("Error in registerPesapalIpn: " . $e->getMessage());
        throw new Exception('Failed to register Pesapal IPN: ' . $e->getMessage());
    }
}

function getPesapalIpnId()
{
    global $pesapalIpnId, $pesapalBaseUrl, $pesapalIpnUrl;

    if ($pesapalIpnId) {
        error_log('Using stored Pesapal IPN ID.');
        return $pesapalIpnId;
    }

    try {
        $token = getPesapalAccessToken();
        $requestUrl = "{$pesapalBaseUrl}/api/URLSetup/GetIpnList";

        $ch = curl_init($requestUrl);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Accept: application/json',
            "Authorization: Bearer {$token}"
        ]);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 2);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        if ($response === false) {
            error_log("cURL error: {$error}");
            throw new Exception('Failed to connect to Pesapal API.');
        }

        $responseData = json_decode($response, true);

        if ($httpCode === 200 && isset($responseData[0]['ipn_id'])) {
            foreach ($responseData as $ipn) {
                if ($ipn['url'] === $pesapalIpnUrl) {
                    $pesapalIpnId = $ipn['ipn_id'];
                    error_log('Pesapal IPN ID obtained from API (matching URL).');
                    return $pesapalIpnId;
                }
            }
        }

        error_log('No matching IPN found or IPN list empty. Attempting to register a new IPN.');
        return registerPesapalIpn();

    } catch (Exception $e) {
        error_log("Error getting Pesapal IPN ID: " . $e->getMessage());
        throw new Exception('Failed to get Pesapal IPN ID: ' . $e->getMessage());
    }
}

function grant_user_access($pdo, $userId, $requestType)
{
    // This function requires notifications.php, but to avoid circular dependencies or loading it globally,
    // we'll check if the function exists before trying to include the file.
    if (!function_exists('createNotification')) {
        require_once __DIR__ . '/notifications.php';
    }

    if (!is_numeric($userId) || !$requestType) {
        error_log('Invalid userId or requestType for granting access.');
        return false;
    }

    // Check if the user has an active material access subscription.
    // This prevents re-granting access for the same transaction if this function is called multiple times.
    $stmtCheck = $pdo->prepare('SELECT materialPaidAccessEndTime FROM users WHERE id = ?');
    $stmtCheck->execute([$userId]);
    $user = $stmtCheck->fetch(PDO::FETCH_ASSOC);

    // A simple check to see if access is already granted and not expired.
    // This logic might need to be more sophisticated for renewals (e.g., extending the date).
    if ($user && $user['materialPaidAccessEndTime']) {
        try {
            $accessEndTime = new DateTime($user['materialPaidAccessEndTime']);
            if ($accessEndTime > new DateTime()) {
                error_log("User {$userId} already has an active material access subscription. Skipping access grant.");
                return true; // Indicate success as access is already active.
            }
        } catch (Exception $e) {
            error_log("Error parsing materialPaidAccessEndTime for user {$userId}: " . $e->getMessage());
        }
    }

    $updateField = '';
    $updateQuery = '';
    $updateParams = [];

    if ($requestType === 'weekly_material_access' || $requestType === 'monthly_material_access') {
        $stmtPlan = $pdo->prepare('SELECT durationDays FROM pricing_plans WHERE planType = ?');
        $stmtPlan->execute([$requestType]);
        $plan = $stmtPlan->fetch(PDO::FETCH_ASSOC);
        if ($plan) {
            $accessEndTime = new DateTime();
            $accessEndTime->modify("+{$plan['durationDays']} days");
            $updateField = 'materialPaidAccessEndTime';
            $updateQuery = "UPDATE users SET {$updateField} = ?, hasMaterialAccess = ?, hasPendingPayment = ? WHERE id = ?";
            $updateParams = [$accessEndTime->format('Y-m-d H:i:s'), 1, 0, $userId];
        }
    }

    if ($updateField && $updateQuery) {
        $stmtUpdateUser = $pdo->prepare($updateQuery);
        if ($stmtUpdateUser->execute($updateParams)) {
            // Check if notification function exists before calling
            if (function_exists('createNotification')) {
                createNotification($userId, 'payment_status', "Your payment for " . str_replace('_', ' ', $requestType) . " has been approved. Access granted.", null);
            }
            error_log("User {$userId} granted {$requestType} access.");
            return true;
        } else {
            error_log("Failed to execute user access update for user {$userId}.");
            return false;
        }
    } else {
        error_log("Unhandled requestType or missing plan for granting access: {$requestType}");
        return false;
    }
}

function handle_initiate_pesapal_payment($requestMethod)
{
    global $pdo, $pesapalBaseUrl, $pesapalRedirectUrl;

    if ($requestMethod === 'POST') {
        $data = json_decode(file_get_contents("php://input"), true);
        $userId = $data['userId'] ?? null;
        $name = $data['name'] ?? '';
        $email = $data['email'] ?? '';
        $requestType = $data['requestType'] ?? '';
        $amount = $data['amount'] ?? '';

        if (!$userId || !$name || !$email || !$requestType || !$amount) {
            http_response_code(400);
            echo json_encode(['message' => 'Missing required payment fields.']);
            error_log("ERROR (pesapal.php): Missing required payment fields. Data: " . print_r($data, true));
            return;
        }

        try {
            $token = getPesapalAccessToken();
            $orderId = uniqid('pesapal_'); // Generate a unique order ID
            $ipnId = getPesapalIpnId();

            error_log("DEBUG (pesapal.php): Using PESAPAL_REDIRECT_URL for callback: {$pesapalRedirectUrl}");
            error_log("DEBUG (pesapal.php): Generated Order ID: {$orderId}");
            error_log("DEBUG (pesapal.php): Retrieved IPN ID: {$ipnId}");

            $paymentData = [
                'id' => $orderId,
                'currency' => 'TZS', // Tanzanian Shilling
                'amount' => (float) $amount,
                'description' => "Payment for " . str_replace('_', ' ', $requestType),
                'callback_url' => "{$pesapalRedirectUrl}?order_tracking_id={$orderId}&user_id={$userId}&request_type={$requestType}",
                'notification_id' => $ipnId,
                'branch' => null,
                'billing_address' => [
                    'email_address' => $email,
                    'phone_number' => null,
                    'country_code' => 'TZ',
                    'first_name' => explode(' ', $name)[0],
                    'middle_name' => null,
                    'last_name' => implode(' ', array_slice(explode(' ', $name), 1)) ?: null,
                    'line_1' => null,
                    'line_2' => null,
                    'city' => null,
                    'state' => null,
                    'postal_code' => null,
                    'zip_code' => null
                ]
            ];

            error_log("DEBUG (pesapal.php): Payment Data Payload: " . json_encode($paymentData));

            $requestUrl = "{$pesapalBaseUrl}/api/Transactions/SubmitOrderRequest";
            $ch = curl_init($requestUrl);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($paymentData));
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'Content-Type: application/json',
                'Accept: application/json',
                "Authorization: Bearer {$token}"
            ]);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
            curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 2);

            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $error = curl_error($ch);
            curl_close($ch);

            if ($response === false) {
                error_log("cURL error: {$error}");
                throw new Exception('Failed to connect to Pesapal API.');
            }

            $pesapalResponse = json_decode($response, true);

            error_log("DEBUG (pesapal.php): Pesapal SubmitOrderRequest HTTP Code: {$httpCode}");
            error_log("DEBUG (pesapal.php): Pesapal SubmitOrderRequest Response: " . print_r($pesapalResponse, true));

            if ($httpCode !== 200 || !isset($pesapalResponse['redirect_url'])) {
                error_log("Error initiating Pesapal payment. HTTP Code: {$httpCode}, Response: " . print_r($pesapalResponse, true));
                throw new Exception($pesapalResponse['message'] ?? 'Failed to initiate Pesapal payment.');
            }

            // Store transaction details in pesapal_transactions table
            $stmtInsertTransaction = $pdo->prepare(
                'INSERT INTO pesapal_transactions (userId, orderId, requestType, amount, currency, paymentStatus) VALUES (?, ?, ?, ?, ?, ?)'
            );
            $stmtInsertTransaction->execute([
                $userId,
                $orderId,
                $requestType,
                (float) $amount,
                'TZS', // Assuming TZS as currency, consistent with paymentData
                'PENDING'
            ]);

            http_response_code(200);
            echo json_encode(['redirectUrl' => $pesapalResponse['redirect_url']]);

        } catch (Exception $e) {
            error_log("Error initiating Pesapal payment: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['message' => $e->getMessage()]);
        }
    } else {
        http_response_code(405);
        echo json_encode(['message' => 'Method Not Allowed']);
    }
}

function handle_pesapal_ipn($requestMethod)
{
    global $pdo, $pesapalBaseUrl;
    require_once __DIR__ . '/notifications.php'; // For createNotification

    if ($requestMethod === 'POST') {
        $data = json_decode(file_get_contents("php://input"), true);
        $orderTrackingId = $data['OrderTrackingId'] ?? null;
        $orderMerchantReference = $data['OrderMerchantReference'] ?? null;
        $orderNotificationType = $data['OrderNotificationType'] ?? null;

        error_log("DEBUG (pesapal.php): IPN Received - OrderTrackingId: {$orderTrackingId}, MerchantReference: {$orderMerchantReference}, NotificationType: {$orderNotificationType}");

        if (!$orderTrackingId || !$orderMerchantReference || !$orderNotificationType) {
            error_log('ERROR (pesapal.php): Missing required IPN parameters.');
            http_response_code(400);
            echo json_encode(['message' => 'Missing required IPN parameters.']);
            return;
        }

        // Fetch transaction details from your database
        $stmtTransaction = $pdo->prepare('SELECT userId, requestType FROM pesapal_transactions WHERE orderId = ?');
        $stmtTransaction->execute([$orderMerchantReference]);
        $transactionDetails = $stmtTransaction->fetch(PDO::FETCH_ASSOC);

        if (!$transactionDetails) {
            error_log("ERROR (pesapal.php): Transaction not found for merchant reference: {$orderMerchantReference}");
            http_response_code(404);
            echo json_encode(['message' => 'Transaction not found.']);
            return;
        }

        $userId = $transactionDetails['userId'];
        $requestType = $transactionDetails['requestType'];

        try {
            $token = getPesapalAccessToken();
            $requestUrl = "{$pesapalBaseUrl}/api/Transactions/GetTransactionStatus?orderTrackingId={$orderTrackingId}";

            $ch = curl_init($requestUrl);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'Accept: application/json',
                "Authorization: Bearer {$token}"
            ]);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
            curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 2);

            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $error = curl_error($ch);
            curl_close($ch);

            if ($response === false) {
                error_log("cURL error: {$error}");
                throw new Exception('Failed to connect to Pesapal API.');
            }

            $statusResponse = json_decode($response, true);

            error_log("DEBUG (pesapal.php): GetTransactionStatus HTTP Code: {$httpCode}");
            error_log("DEBUG (pesapal.php): GetTransactionStatus Response: " . print_r($statusResponse, true));

            if ($httpCode !== 200 || !isset($statusResponse['status'])) {
                error_log("Error getting Pesapal transaction status. HTTP Code: {$httpCode}, Response: " . print_r($statusResponse, true));
                throw new Exception('Failed to get Pesapal transaction status.');
            }

            $transactionStatus = $statusResponse['status'];
            $paymentStatus = $statusResponse['payment_status_description'];

            // Update pesapal_transactions table with Pesapal's orderTrackingId and final status
            $stmtUpdatePesapalTransaction = $pdo->prepare(
                'UPDATE pesapal_transactions SET orderTrackingId = ?, paymentStatus = ? WHERE orderId = ?'
            );
            $stmtUpdatePesapalTransaction->execute([$orderTrackingId, $paymentStatus, $orderMerchantReference]);

            if ($transactionStatus === 'COMPLETED' || $paymentStatus === 'Completed') {
                grant_user_access($pdo, $userId, $requestType);
            } else {
                error_log("Pesapal payment for OrderTrackingId {$orderTrackingId} is not completed. Status: {$transactionStatus}");
                if (is_numeric($userId)) {
                    $stmtUpdateUser = $pdo->prepare('UPDATE users SET hasPendingPayment = ? WHERE id = ?');
                    $stmtUpdateUser->execute([0, $userId]);
                    $displayRequestType = $requestType ? str_replace('_', ' ', $requestType) : 'material access';
                    createNotification($userId, 'payment_status', "Your Pesapal payment for {$displayRequestType} failed or is pending. Status: {$transactionStatus}.", null);
                }
            }

            http_response_code(200);
            echo json_encode(["orderNotificationType" => $orderNotificationType, "orderTrackingId" => $orderTrackingId, "orderMerchantReference" => $orderMerchantReference, "status" => 200]);

        } catch (Exception $e) {
            error_log("Error processing Pesapal IPN: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['message' => 'Error processing IPN.']);
        }
    } else {
        http_response_code(405);
        echo json_encode(['message' => 'Method Not Allowed']);
    }
}

function handle_pesapal_payment_status($requestMethod)
{
    global $pdo, $pesapalBaseUrl;

    if ($requestMethod === 'GET') {
        $orderTrackingId = $_GET['order_tracking_id'] ?? null;
        $orderMerchantReference = $_GET['order_merchant_reference'] ?? null;

        if (!$orderTrackingId && !$orderMerchantReference) {
            http_response_code(400);
            echo json_encode(['message' => 'Missing order tracking ID or merchant reference.']);
            return;
        }

        try {
            $token = getPesapalAccessToken();
            $statusResponse = null;

            if ($orderTrackingId) {
                // If Pesapal's orderTrackingId is available, use it to get status directly
                $requestUrl = "{$pesapalBaseUrl}/api/Transactions/GetTransactionStatus?orderTrackingId={$orderTrackingId}";

                $ch = curl_init($requestUrl);
                curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                curl_setopt($ch, CURLOPT_HTTPHEADER, [
                    'Accept: application/json',
                    "Authorization: Bearer {$token}"
                ]);
                curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
                curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 2);

                $response = curl_exec($ch);
                $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
                curl_close($ch);

                if ($response === false || $httpCode !== 200) {
                    error_log("Error fetching Pesapal transaction status for orderTrackingId {$orderTrackingId}. HTTP Code: {$httpCode}, Response: " . ($response ?: 'No response'));

                    // Fallback to database using merchant reference, as it's more reliable initially
                    if ($orderMerchantReference) {
                        $stmt = $pdo->prepare('SELECT paymentStatus FROM pesapal_transactions WHERE orderId = ?');
                        $stmt->execute([$orderMerchantReference]);
                        $dbStatus = $stmt->fetch(PDO::FETCH_ASSOC);
                        if ($dbStatus && $dbStatus['paymentStatus'] !== 'PENDING') {
                            http_response_code(200);
                            echo json_encode(['status' => $dbStatus['paymentStatus'], 'source' => 'database_fallback_merchant_ref']);
                            return;
                        }
                    }

                    // If all fallbacks fail or status is still pending, return PENDING gracefully
                    error_log("Could not confirm status via API or DB for orderTrackingId {$orderTrackingId}. Returning PENDING as default.");
                    http_response_code(200);
                    echo json_encode(['status' => 'PENDING', 'source' => 'default_fallback']);
                    return;
                }
                $statusResponse = json_decode($response, true);

            } elseif ($orderMerchantReference) {
                // If only merchant reference is available, try to find orderTrackingId in DB first
                $stmt = $pdo->prepare('SELECT orderTrackingId FROM pesapal_transactions WHERE orderId = ?');
                $stmt->execute([$orderMerchantReference]);
                $dbOrderTrackingId = $stmt->fetchColumn();

                if ($dbOrderTrackingId) {
                    $requestUrl = "{$pesapalBaseUrl}/api/Transactions/GetTransactionStatus?orderTrackingId={$dbOrderTrackingId}";

                    $ch = curl_init($requestUrl);
                    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                    curl_setopt($ch, CURLOPT_HTTPHEADER, [
                        'Accept: application/json',
                        "Authorization: Bearer {$token}"
                    ]);
                    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
                    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 2);

                    $response = curl_exec($ch);
                    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
                    curl_close($ch);

                    if ($response === false || $httpCode !== 200) {
                        error_log("Error fetching Pesapal transaction status for merchant reference {$orderMerchantReference} (via db orderTrackingId). HTTP Code: {$httpCode}, Response: " . ($response ?: 'No response'));
                        // Fallback to database if Pesapal API fails
                        $stmt = $pdo->prepare('SELECT paymentStatus FROM pesapal_transactions WHERE orderId = ?');
                        $stmt->execute([$orderMerchantReference]);
                        $dbStatus = $stmt->fetch(PDO::FETCH_ASSOC);
                        if ($dbStatus) {
                            http_response_code(200);
                            echo json_encode(['status' => $dbStatus['paymentStatus'], 'source' => 'database']);
                            return;
                        }
                        throw new Exception('Failed to fetch Pesapal transaction status.');
                    }
                    $statusResponse = json_decode($response, true);
                } else {
                    // If no orderTrackingId in DB for merchant reference, try to get status from DB directly
                    $stmt = $pdo->prepare('SELECT paymentStatus FROM pesapal_transactions WHERE orderId = ?');
                    $stmt->execute([$orderMerchantReference]);
                    $dbStatus = $stmt->fetch(PDO::FETCH_ASSOC);
                    if ($dbStatus) {
                        http_response_code(200);
                        echo json_encode(['status' => $dbStatus['paymentStatus'], 'source' => 'database']);
                        return;
                    }
                    throw new Exception('Transaction not found in database for merchant reference.');
                }
            }

            if (!isset($statusResponse['status'])) {
                throw new Exception('Invalid status response from Pesapal.');
            }

            $transactionStatus = $statusResponse['status'];
            $paymentStatusDescription = $statusResponse['payment_status_description'] ?? $transactionStatus;

            // Update local database with the latest status from Pesapal, including the official orderTrackingId
            $stmtUpdate = $pdo->prepare('UPDATE pesapal_transactions SET paymentStatus = ?, orderTrackingId = ? WHERE orderId = ?');
            $stmtUpdate->execute([$paymentStatusDescription, $statusResponse['order_tracking_id'], $orderMerchantReference]);

            // Determine userId and requestType from the transaction
            $stmtDetails = $pdo->prepare('SELECT userId, requestType FROM pesapal_transactions WHERE orderId = ?');
            $stmtDetails->execute([$orderMerchantReference]);
            $transactionDetails = $stmtDetails->fetch(PDO::FETCH_ASSOC);

            if ($transactionDetails) {
                $userId = $transactionDetails['userId'];
                $requestType = $transactionDetails['requestType'];

                if ($transactionStatus === 'COMPLETED' || $paymentStatusDescription === 'Completed') {
                    grant_user_access($pdo, $userId, $requestType);
                } else {
                    $setPending = ($paymentStatusDescription === 'Pending') ? 1 : 0;
                    $stmtUpdateUser = $pdo->prepare('UPDATE users SET hasPendingPayment = ? WHERE id = ?');
                    $stmtUpdateUser->execute([$setPending, $userId]);
                }

                // After processing, fetch the updated user profile
                $stmtUser = $pdo->prepare('SELECT id, email, username, college, phone, classType, classTypeNameFull, classLevel, role, hasMaterialAccess, materialTrialStartTime, materialTrialEndTime, materialPaidAccessEndTime, hasPendingPayment, isConfirmed FROM users WHERE id = ?');
                $stmtUser->execute([$userId]);
                $updatedUser = $stmtUser->fetch(PDO::FETCH_ASSOC);

                http_response_code(200);
                echo json_encode([
                    'status' => $paymentStatusDescription,
                    'source' => 'pesapal',
                    'user' => $updatedUser // Include the updated user object
                ]);
            } // Closing brace for if ($transactionDetails)
        } // Closing brace for the try block
        catch (Exception $e) {
            error_log("Error fetching Pesapal payment status: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['message' => $e->getMessage()]);
        }
    } else {
        http_response_code(405);
        echo json_encode(['message' => 'Method Not Allowed']);
    }
}
