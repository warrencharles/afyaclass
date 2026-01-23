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

function handle_admin_active_subscriptions($requestMethod)
{
    global $pdo;

    if ($requestMethod === 'GET') {
        try {
            // Fetch users who currently have material access
            // We also try to get the latest payment date as 'subscriptionStart'
            $sql = "
                SELECT 
                    u.id, u.username, u.email, u.phone, u.college, 
                    u.hasMaterialAccess, u.materialPaidAccessEndTime, u.materialTrialEndTime,
                    (
                        SELECT MAX(createdAt) 
                        FROM payment_requests 
                        WHERE userId = u.id AND status = 'approved'
                    ) as latestPaymentDate,
                    (
                        SELECT MAX(createdAt)
                        FROM pesapal_transactions
                        WHERE userId = u.id AND paymentStatus = 'COMPLETED'
                    ) as latestPesapalDate
                FROM users u 
                WHERE u.hasMaterialAccess = 1
                ORDER BY u.materialPaidAccessEndTime ASC
            ";

            $stmt = $pdo->query($sql);
            $users = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Process to determine effective start date
            foreach ($users as &$user) {
                // Determine start date (latest of payment or pesapal)
                $payDate = $user['latestPaymentDate'];
                $pesapalDate = $user['latestPesapalDate'];

                if ($payDate && $pesapalDate) {
                    $user['subscriptionStartDate'] = ($payDate > $pesapalDate) ? $payDate : $pesapalDate;
                } elseif ($payDate) {
                    $user['subscriptionStartDate'] = $payDate;
                } elseif ($pesapalDate) {
                    $user['subscriptionStartDate'] = $pesapalDate;
                } else {
                    // Fallback to trial start or unknown
                    $user['subscriptionStartDate'] = null;
                }
            }

            http_response_code(200);
            echo json_encode($users);
        } catch (PDOException $e) {
            error_log("Admin fetch active subscriptions error: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['message' => 'Failed to fetch active subscriptions.', 'details' => $e->getMessage()]);
        }
    } else {
        http_response_code(405);
        echo json_encode(['message' => 'Method Not Allowed']);
    }
}

function handle_admin_manage_subscription($requestMethod)
{
    global $pdo;

    if ($requestMethod === 'POST') {
        $data = json_decode(file_get_contents("php://input"), true);
        $userId = $data['userId'] ?? null;
        $action = $data['action'] ?? ''; // 'extend' or 'revoke'
        $value = $data['value'] ?? 0; // Days to extend

        if (!$userId || !$action) {
            http_response_code(400);
            echo json_encode(['message' => 'Missing required fields.']);
            return;
        }

        try {
            $userStmt = $pdo->prepare("SELECT materialPaidAccessEndTime, hasMaterialAccess FROM users WHERE id = ?");
            $userStmt->execute([$userId]);
            $user = $userStmt->fetch(PDO::FETCH_ASSOC);

            if (!$user) {
                http_response_code(404);
                echo json_encode(['message' => 'User not found.']);
                return;
            }

            if ($action === 'revoke') {
                // Determine logical "previous" end time - simply set to NOW()
                $now = new DateTime();
                $stmt = $pdo->prepare("UPDATE users SET hasMaterialAccess = 0, materialPaidAccessEndTime = ? WHERE id = ?");
                $stmt->execute([$now->format('Y-m-d H:i:s'), $userId]);

                createNotification($userId, 'system_alert', "Your subscription has been cancelled by an administrator.", null);

                http_response_code(200);
                echo json_encode(['message' => 'Subscription revoked successfully.']);

            } elseif ($action === 'extend') {
                $days = (int) $value;
                if ($days <= 0) {
                    http_response_code(400);
                    echo json_encode(['message' => 'Invalid extension duration.']);
                    return;
                }

                $currentExpiryStr = $user['materialPaidAccessEndTime'];
                $expiryDate = $currentExpiryStr ? new DateTime($currentExpiryStr) : new DateTime();
                $now = new DateTime();

                // If expired, start from NOW. If active, add to existing expiry.
                if ($expiryDate < $now) {
                    $expiryDate = $now;
                }

                $expiryDate->modify("+{$days} days");
                $newExpiryStr = $expiryDate->format('Y-m-d H:i:s');

                $stmt = $pdo->prepare("UPDATE users SET hasMaterialAccess = 1, materialPaidAccessEndTime = ? WHERE id = ?");
                $stmt->execute([$newExpiryStr, $userId]);

                createNotification($userId, 'payment_status', "Your subscription has been extended by {$days} days. New expiry: {$newExpiryStr}", null);

                http_response_code(200);
                echo json_encode(['message' => "Subscription extended successfully! New expiry: {$newExpiryStr}"]);
            } else {
                http_response_code(400);
                echo json_encode(['message' => 'Invalid action.']);
            }

        } catch (Exception $e) {
            error_log("Admin manage subscription error: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['message' => 'Server error occurred.']);
        }
    } else {
        http_response_code(405);
        echo json_encode(['message' => 'Method Not Allowed']);
    }
}

function handle_submit_payment_proof($requestMethod)
{
    global $pdo;

    if ($requestMethod !== 'POST') {
        http_response_code(405);
        echo json_encode(['message' => 'Method Not Allowed']);
        return;
    }

    $userId = $_POST['userId'] ?? null;
    $name = $_POST['name'] ?? '';
    $email = $_POST['email'] ?? '';
    $requestType = $_POST['requestType'] ?? '';
    $amount = $_POST['amount'] ?? 0;

    if (!$userId || !isset($_FILES['paymentScreenshot'])) {
        http_response_code(400);
        echo json_encode(['message' => 'User ID and payment screenshot are required.']);
        return;
    }

    $file = $_FILES['paymentScreenshot'];
    if ($file['error'] !== UPLOAD_ERR_OK) {
        http_response_code(400);
        echo json_encode(['message' => 'File upload failed.']);
        return;
    }

    $uploadDir = __DIR__ . '/../public/uploads/payments/';
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0777, true);
    }

    $fileExtension = pathinfo($file['name'], PATHINFO_EXTENSION);
    $fileName = 'proof_' . $userId . '_' . time() . '.' . $fileExtension;
    $targetPath = $uploadDir . $fileName;
    $dbPath = '/uploads/payments/' . $fileName;

    if (move_uploaded_file($file['tmp_name'], $targetPath)) {
        try {
            $stmt = $pdo->prepare("INSERT INTO payment_requests (userId, name, email, paymentScreenshotUrl, requestType, amount, status) VALUES (?, ?, ?, ?, ?, ?, 'pending')");
            $stmt->execute([$userId, $name, $email, $dbPath, $requestType, $amount]);

            // Set pending status in users table
            $stmtUpdate = $pdo->prepare("UPDATE users SET hasPendingPayment = 1 WHERE id = ?");
            $stmtUpdate->execute([$userId]);

            require_once __DIR__ . '/notifications.php';
            // Notify user
            createNotification($userId, 'payment_proof_submitted', "Your payment proof for " . str_replace('_', ' ', $requestType) . " has been submitted and is awaiting review.", null);
            
            // Notify Admins
            notifyAdmins('payment_proof_submitted', "New payment proof submitted by $name for " . str_replace('_', ' ', $requestType) . ".", $userId, (int)$userId, 'payment_request');

            http_response_code(201);
            echo json_encode(['message' => 'Payment proof submitted successfully!']);
        } catch (PDOException $e) {
            error_log("Proof submission DB error: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['message' => 'Database error recording proof.']);
        }
    }
}

function handle_admin_pending_payments_count($requestMethod)
{
    global $pdo;

    if ($requestMethod === 'GET') {
        try {
            $stmt = $pdo->query("SELECT COUNT(*) as count FROM payment_requests WHERE status = 'pending'");
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            http_response_code(200);
            echo json_encode(['count' => (int)$result['count']]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['message' => 'Error fetching pending payments count.', 'error' => $e->getMessage()]);
        }
    } else {
        http_response_code(405);
        echo json_encode(['message' => 'Method Not Allowed']);
    }
}
