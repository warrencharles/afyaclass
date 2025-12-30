<?php

// Define the base URL of your application
// This is used for generating links in emails (e.g., verification, password reset)
define('APP_URL', 'https://dev.afyaclass.co.tz'); // Adjust this to your frontend URL

// Define JWT Secret Key
// Use the environment variable if it exists, otherwise fall back to a default key.
// For production, it is STRONGLY recommended to set this in your server's environment variables.
$jwtSecret = $_ENV['JWT_SECRET_KEY'] ?? 'your-super-secret-and-long-key-that-is-hard-to-guess';
define('JWT_SECRET_KEY', $jwtSecret);

?>
