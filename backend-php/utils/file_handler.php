<?php

require_once __DIR__ . '/auth.php'; // Include authentication functions

function handle_serve_file($filename, $uploadsBaseDir)
{ // Renamed function to be more generic
    // Security: Sanitize filename to prevent directory traversal attacks
    $basename = basename($filename);
    if ($basename !== $filename) {
        http_response_code(400);
        echo "Invalid filename.";
        exit();
    }

    $filePath = realpath($uploadsBaseDir . '/' . $basename);
    error_log("DEBUG: handle_serve_file - Attempting to serve file from (realpath): " . $filePath);

    if ($filePath === false || !file_exists($filePath)) {
        error_log("ERROR: handle_serve_file - File not found or inaccessible at (realpath): " . $filePath);
        http_response_code(404);
        echo "File not found.";
        exit();
    }

    $mime_type = mime_content_type($filePath);
    // Allow both image and PDF types
    if ($mime_type === false || (strpos($mime_type, 'image/') !== 0 && $mime_type !== 'application/pdf')) {
        error_log("ERROR: handle_serve_file - Unsupported media type: " . $mime_type . " for file: " . $filePath);
        http_response_code(415);
        echo "Unsupported media type. Only images and PDFs are supported.";
        exit();
    }

    // Start output buffering specifically for this file to ensure clean output
    ob_start();

    header('Content-Type: ' . $mime_type);
    header('Content-Length: ' . filesize($filePath));
    header('Content-Disposition: inline; filename="' . $basename . '"'); // Suggest browser to display inline
    header('Cache-Control: public, max-age=31536000'); // Cache files for a year
    header('Expires: ' . gmdate('D, d M Y H:i:s', time() + 31536000) . ' GMT'); // Set expiry date

    // Read the file and output its contents
    readfile($filePath);

    // Flush the output buffer and send to client
    ob_end_flush();
    exit();
}

/**
 * Sanitizes a filename to be safe for servers while keeping it recognizable.
 */
function sanitize_filename($filename)
{
    // Remove directory traversal components
    $filename = basename($filename);

    // Get extension and name without extension
    $pathinfo = pathinfo($filename);
    $name = $pathinfo['filename'];
    $ext = isset($pathinfo['extension']) ? '.' . strtolower($pathinfo['extension']) : '';

    // Replace spaces and special characters with underscores
    $name = preg_replace('/[^a-zA-Z0-9_\-]/', '_', $name);

    // Limit length to avoid filesystem issues
    $name = substr($name, 0, 100);

    return $name . $ext;
}

/**
 * Handles file uploads, including authentication and validation.
 * Only authenticated admin users are allowed to upload files.
 * @param string $requestMethod The HTTP request method.
 */
function handle_upload($requestMethod)
{
    // Ensure only POST requests are handled for uploads
    if ($requestMethod !== 'POST') {
        http_response_code(405);
        echo json_encode(['message' => 'Method Not Allowed. Only POST requests are accepted for uploads.']);
        exit();
    }

    // Authenticate the user as an admin
    // This function will exit if the user is not authenticated or not an admin
    authenticate_admin();

    // Check if a file was uploaded
    if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
        http_response_code(400);
        echo json_encode(['message' => 'No file uploaded or upload error.', 'error' => $_FILES['file']['error'] ?? 'Unknown error']);
        exit();
    }

    $file = $_FILES['file'];
    $fileName = $file['name'];
    $fileTmpName = $file['tmp_name'];
    $fileSize = $file['size'];
    $fileError = $file['error'];
    $fileType = $file['type'];

    $fileExt = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));
    $allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx', 'mp4', 'avi', 'mov'];

    // Validate file extension
    if (!in_array($fileExt, $allowedExtensions)) {
        http_response_code(400);
        echo json_encode(['message' => 'Invalid file type. Allowed types: ' . implode(', ', $allowedExtensions)]);
        exit();
    }

    // Validate file size (e.g., max 20MB)
    if ($fileSize > 20 * 1024 * 1024) {
        http_response_code(400);
        echo json_encode(['message' => 'File too large. Maximum size is 20MB.']);
        exit();
    }

    // Generate a nice name
    $sanitized = sanitize_filename($fileName);
    $namePart = pathinfo($sanitized, PATHINFO_FILENAME);
    $newFileName = $sanitized;
    $uploadPath = __DIR__ . '/../uploads/' . $newFileName;

    // Handle collisions
    $counter = 1;
    while (file_exists($uploadPath)) {
        $newFileName = $namePart . '_' . bin2hex(random_bytes(2)) . '.' . $fileExt;
        $uploadPath = __DIR__ . '/../uploads/' . $newFileName;
        $counter++;
        if ($counter > 5)
            break; // Defensive
    }

    error_log("DEBUG: handle_upload - Attempting to move file to: " . $uploadPath);

    if (move_uploaded_file($fileTmpName, $uploadPath)) {
        $protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https://' : 'http://';
        $publicBaseUrl = $protocol . $_SERVER['HTTP_HOST'] . '/backend-php/public';

        $filePathForDb = 'uploads/' . $newFileName;
        $fullFileUrl = $publicBaseUrl . '/uploads/' . $newFileName;

        http_response_code(200);
        echo json_encode([
            'message' => 'File uploaded successfully!',
            'filePath' => $filePathForDb,
            'fileUrl' => $fullFileUrl,
            'originalFileName' => $fileName
        ]);
    } else {
        http_response_code(500);
        echo json_encode(['message' => 'Failed to move uploaded file.']);
    }
    exit();
}
