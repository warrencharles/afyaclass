<?php

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/notifications.php'; // Include the notifications functions


function handle_pricing_plans($requestMethod)
{
    global $pdo;

    if ($requestMethod === 'GET') {
        try {
            $stmt = $pdo->query('SELECT planType, amount, currency, durationDays FROM pricing_plans');
            $plans = $stmt->fetchAll(PDO::FETCH_ASSOC);

            http_response_code(200);
            echo json_encode($plans);
        } catch (PDOException $e) {
            error_log("Error fetching pricing plans: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['message' => 'Failed to fetch pricing plans due to server error.']);
        }
    } else {
        http_response_code(405);
        echo json_encode(['message' => 'Method Not Allowed']);
    }
}


function handle_admin_payment_requests($requestMethod, $requestId = null)
{
    global $pdo;

    if ($requestMethod === 'GET') {
        try {
            $stmt = $pdo->query('SELECT pr.*, u.username, u.email FROM payment_requests pr JOIN users u ON pr.userId = u.id ORDER BY pr.createdAt DESC');
            $paymentRequests = $stmt->fetchAll(PDO::FETCH_ASSOC);
            http_response_code(200);
            echo json_encode($paymentRequests);
        } catch (PDOException $e) {
            error_log("Admin fetch payment requests error: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['message' => 'Error fetching payment requests for admin.', 'details' => $e->getMessage()]);
        }
    } elseif ($requestMethod === 'PUT' && $requestId !== null) {
        $data = json_decode(file_get_contents("php://input"), true);
        $status = $data['status'] ?? '';
        $userId = $data['userId'] ?? null;
        $requestType = $data['requestType'] ?? null;

        if (!in_array($status, ['approved', 'rejected'])) {
            http_response_code(400);
            echo json_encode(['message' => 'Invalid status provided. Must be "approved" or "rejected".']);
            return;
        }

        try {
            $stmt = $pdo->prepare('UPDATE payment_requests SET status = ? WHERE id = ?');
            $success = $stmt->execute([$status, $requestId]);

            if (!$success || $stmt->rowCount() === 0) {
                http_response_code(404);
                echo json_encode(['message' => 'Payment request not found.']);
                return;
            }

            if ($status === 'approved' && $userId && $requestType) {
                $sevenDaysFromNow = new DateTime();
                $sevenDaysFromNow->modify('+7 days');

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
                        $updateQuery = "UPDATE users SET {$updateField} = ?, hasMaterialAccess = ? WHERE id = ?";
                        $updateParams = [$accessEndTime->format('Y-m-d H:i:s'), true, $userId];
                    }
                }

                if ($updateField && $updateQuery) {
                    $stmtUpdateUser = $pdo->prepare($updateQuery);
                    $stmtUpdateUser->execute($updateParams);
                }
            }

            $stmtUpdateUserStatus = $pdo->prepare('UPDATE users SET hasPendingPayment = FALSE WHERE id = ?');
            $stmtUpdateUserStatus->execute([$userId]);

            if ($userId) {
                $userMessage = ($status === 'approved')
                    ? "Your payment for " . str_replace('_', ' ', $requestType) . " has been approved. Access granted."
                    : "Your payment for " . str_replace('_', ' ', $requestType) . " was rejected. Please review and resubmit if needed.";
                createNotification($userId, 'payment_status', $userMessage, null, $requestId, 'payment_request');
            }

            http_response_code(200);
            echo json_encode(['message' => "Payment request {$status} successfully!"]);
        } catch (PDOException $e) {
            error_log("Update payment request status error: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['message' => 'Failed to update payment request status due to server error.']);
        }
    } elseif ($requestMethod === 'DELETE' && $requestId !== null) {
        try {
            $stmt = $pdo->prepare('DELETE FROM payment_requests WHERE id = ?');
            $success = $stmt->execute([$requestId]);

            if ($success && $stmt->rowCount() > 0) {
                http_response_code(200);
                echo json_encode(['message' => 'Payment request deleted successfully!']);
            } elseif ($stmt->rowCount() === 0) {
                http_response_code(404);
                echo json_encode(['message' => 'Payment request not found.']);
            } else {
                http_response_code(500);
                echo json_encode(['message' => 'Failed to delete payment request.']);
            }
        } catch (PDOException $e) {
            error_log("Admin delete payment request error: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['message' => 'Failed to delete payment request due to server error.']);
        }
    } else {
        http_response_code(405);
        echo json_encode(['message' => 'Method Not Allowed']);
    }
}

function handle_admin_pesapal_transactions($requestMethod, $transactionId = null)
{
    global $pdo;

    if ($requestMethod === 'GET') {
        try {
            $stmt = $pdo->query('SELECT pt.*, u.username, u.email FROM pesapal_transactions pt JOIN users u ON pt.userId = u.id ORDER BY pt.createdAt DESC');
            $transactions = $stmt->fetchAll(PDO::FETCH_ASSOC);
            http_response_code(200);
            echo json_encode($transactions);
        } catch (PDOException $e) {
            error_log("Admin fetch pesapal transactions error: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['message' => 'Error fetching pesapal transactions for admin.', 'details' => $e->getMessage()]);
        }
    } elseif ($requestMethod === 'DELETE' && $transactionId !== null) {
        try {
            $stmt = $pdo->prepare('DELETE FROM pesapal_transactions WHERE id = ?');
            $stmt->execute([$transactionId]);
            if ($stmt->rowCount() > 0) {
                http_response_code(200);
                echo json_encode(['message' => 'Transaction log deleted successfully!']);
            } else {
                http_response_code(404);
                echo json_encode(['message' => 'Transaction not found.']);
            }
        } catch (PDOException $e) {
            error_log("Admin delete pesapal transaction error: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['message' => 'Failed to delete transaction log.']);
        }
    } else {
        http_response_code(405);
        echo json_encode(['message' => 'Method Not Allowed']);
    }
}

function handle_admin_bulk_delete_pesapal_transactions($requestMethod)
{
    global $pdo;

    if ($requestMethod === 'POST') {
        $data = json_decode(file_get_contents("php://input"), true);
        $ids = $data['ids'] ?? [];

        if (empty($ids) || !is_array($ids)) {
            http_response_code(400);
            echo json_encode(['message' => 'No transaction IDs provided for deletion.']);
            return;
        }

        try {
            $placeholders = implode(',', array_fill(0, count($ids), '?'));
            $stmt = $pdo->prepare("DELETE FROM pesapal_transactions WHERE id IN ($placeholders)");
            $stmt->execute($ids);

            $count = $stmt->rowCount();
            http_response_code(200);
            echo json_encode(['message' => "Successfully deleted $count transaction logs."]);
        } catch (PDOException $e) {
            error_log("Admin bulk delete pesapal transactions error: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['message' => 'Failed to delete transaction logs.']);
        }
    } else {
        http_response_code(405);
        echo json_encode(['message' => 'Method Not Allowed']);
    }
}

function handle_admin_manual_grant($requestMethod)
{
    global $pdo;

    if ($requestMethod === 'POST') {
        $data = json_decode(file_get_contents("php://input"), true);
        $userId = $data['userId'] ?? null;
        $requestType = $data['requestType'] ?? ''; // 'weekly_material_access' or 'monthly_material_access' or 'exam_access' etc.
        $durationDays = $data['durationDays'] ?? 0;

        if (!$userId || !$requestType) {
            http_response_code(400);
            echo json_encode(['message' => 'Missing required fields: userId, requestType.']);
            return;
        }

        try {
            $accessEndTime = new DateTime();
            if ($durationDays > 0) {
                $accessEndTime->modify("+{$durationDays} days");
            } else {
                // Fallback to pricing plan if duration not provided
                $stmtPlan = $pdo->prepare('SELECT durationDays FROM pricing_plans WHERE planType = ?');
                $stmtPlan->execute([$requestType]);
                $plan = $stmtPlan->fetch(PDO::FETCH_ASSOC);
                if ($plan) {
                    $accessEndTime->modify("+{$plan['durationDays']} days");
                } else {
                    // Default to 7 days if no plan found
                    $accessEndTime->modify("+7 days");
                }
            }

            $formattedEndTime = $accessEndTime->format('Y-m-d H:i:s');

            if (strpos($requestType, 'material') !== false) {
                $stmt = $pdo->prepare('UPDATE users SET materialPaidAccessEndTime = ?, hasMaterialAccess = 1, hasPendingPayment = 0 WHERE id = ?');
                $stmt->execute([$formattedEndTime, $userId]);
            } else {
                http_response_code(400);
                echo json_encode(['message' => 'Invalid request type for manual grant.']);
                return;
            }

            require_once __DIR__ . '/notifications.php';
            $displayType = str_replace('_', ' ', $requestType);
            createNotification($userId, 'payment_status', "Admin has manually granted you access to {$displayType} until {$formattedEndTime}.", null);

            http_response_code(200);
            echo json_encode(['message' => "Access granted successfully until {$formattedEndTime}!"]);

        } catch (Exception $e) {
            error_log("Admin manual grant access error: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['message' => 'Failed to grant access due to server error.']);
        }
    } else {
        http_response_code(405);
        echo json_encode(['message' => 'Method Not Allowed']);
    }
}
