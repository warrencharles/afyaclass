<?php

require_once __DIR__ . '/../config/database.php';

function handle_admin_analytics_users($requestMethod)
{
    global $pdo;
    if ($requestMethod === 'GET') {
        try {
            // Total Users
            $stmtTotalUsers = $pdo->query('SELECT COUNT(*) FROM users');
            $totalUsers = $stmtTotalUsers->fetchColumn();

            // New Users Last 30 Days
            $thirtyDaysAgo = date('Y-m-d H:i:s', strtotime('-30 days'));
            $stmtNewUsers = $pdo->prepare('SELECT COUNT(*) FROM users WHERE createdAt >= ?');
            $stmtNewUsers->execute([$thirtyDaysAgo]);
            $newUsersLast30Days = $stmtNewUsers->fetchColumn();

            http_response_code(200);
            echo json_encode([
                'totalUsers' => (int) $totalUsers,
                'newUsersLast30Days' => (int) $newUsersLast30Days
            ]);
        } catch (PDOException $e) {
            error_log("Analytics Users Error: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['message' => 'Failed to fetch user analytics.', 'error' => $e->getMessage()]);
        }
    } else {
        http_response_code(405);
        echo json_encode(['message' => 'Method Not Allowed']);
    }
}

function handle_admin_analytics_content($requestMethod)
{
    global $pdo;
    if ($requestMethod === 'GET') {
        try {
            // Total Content
            $stmtTotalContent = $pdo->query('SELECT COUNT(*) FROM content');
            $totalContent = $stmtTotalContent->fetchColumn();

            // Content by Type
            $stmtContentByType = $pdo->query('SELECT type, COUNT(*) as count FROM content GROUP BY type');
            $contentByType = $stmtContentByType->fetchAll(PDO::FETCH_ASSOC);

            http_response_code(200);
            echo json_encode([
                'totalContent' => (int) $totalContent,
                'contentByType' => $contentByType
            ]);
        } catch (PDOException $e) {
            error_log("Analytics Content Error: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['message' => 'Failed to fetch content analytics.', 'error' => $e->getMessage()]);
        }
    } else {
        http_response_code(405);
        echo json_encode(['message' => 'Method Not Allowed']);
    }
}

function handle_admin_analytics_trials($requestMethod)
{
    global $pdo;
    if ($requestMethod === 'GET') {
        try {
            // Material Trial Starts
            $stmtMaterialTrials = $pdo->query('SELECT COUNT(*) FROM users WHERE materialTrialStartTime IS NOT NULL');
            $materialTrialStarts = $stmtMaterialTrials->fetchColumn();

            http_response_code(200);
            echo json_encode([
                'materialTrialStarts' => (int) $materialTrialStarts
            ]);
        } catch (PDOException $e) {
            error_log("Analytics Trials Error: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['message' => 'Failed to fetch trial analytics.', 'error' => $e->getMessage()]);
        }
    } else {
        http_response_code(405);
        echo json_encode(['message' => 'Method Not Allowed']);
    }
}

function handle_admin_analytics_payments($requestMethod)
{
    global $pdo;
    if ($requestMethod === 'GET') {
        try {
            // Total Payment Requests
            $stmtTotalPayments = $pdo->query('SELECT COUNT(*) FROM payment_requests');
            $totalPaymentRequests = $stmtTotalPayments->fetchColumn();

            // Payment Requests by Status
            $stmtPaymentsByStatus = $pdo->query('SELECT status, COUNT(*) as count FROM payment_requests GROUP BY status');
            $paymentRequestsByStatus = $stmtPaymentsByStatus->fetchAll(PDO::FETCH_ASSOC);

            // Payment Requests Over Time (last 30 days)
            $thirtyDaysAgo = date('Y-m-d H:i:s', strtotime('-30 days'));
            $stmtPaymentsOverTime = $pdo->prepare('SELECT DATE(createdAt) as date, COUNT(*) as count FROM payment_requests WHERE createdAt >= ? GROUP BY DATE(createdAt) ORDER BY date ASC');
            $stmtPaymentsOverTime->execute([$thirtyDaysAgo]);
            $paymentRequestsOverTime = $stmtPaymentsOverTime->fetchAll(PDO::FETCH_ASSOC);

            http_response_code(200);
            echo json_encode([
                'totalPaymentRequests' => (int) $totalPaymentRequests,
                'paymentRequestsByStatus' => $paymentRequestsByStatus,
                'paymentRequestsOverTime' => $paymentRequestsOverTime
            ]);
        } catch (PDOException $e) {
            error_log("Analytics Payments Error: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['message' => 'Failed to fetch payment analytics.', 'error' => $e->getMessage()]);
        }
    } else {
        http_response_code(405);
        echo json_encode(['message' => 'Method Not Allowed']);
    }
}

?>