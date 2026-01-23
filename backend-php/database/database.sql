CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'student',
    college VARCHAR(255),
    phone VARCHAR(20),
    classType VARCHAR(50),
    classTypeNameFull VARCHAR(255), -- New column for full program name
    classLevel VARCHAR(50),
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Add profilePictureUrl column to users if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS profilePictureUrl VARCHAR(255) NULL;

-- Add phone column to users if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20);

-- Add classTypeNameFull column to users if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS classTypeNameFull VARCHAR(255);

-- Add new access columns to users if they don't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS hasPendingPayment BOOLEAN DEFAULT FALSE; -- New column for pending payment status
ALTER TABLE users ADD COLUMN IF NOT EXISTS hasMaterialAccess BOOLEAN DEFAULT FALSE; -- New column for general material access
ALTER TABLE users ADD COLUMN IF NOT EXISTS materialTrialStartTime DATETIME NULL; -- New column for general material trial start time
ALTER TABLE users ADD COLUMN IF NOT EXISTS materialTrialEndTime DATETIME NULL; -- New column for general material trial end time
ALTER TABLE users ADD COLUMN IF NOT EXISTS materialPaidAccessEndTime DATETIME NULL; -- New column for general material paid access end time
ALTER TABLE users ADD COLUMN IF NOT EXISTS isConfirmed BOOLEAN DEFAULT FALSE; -- Renamed from is_confirmed for consistency
ALTER TABLE users ADD COLUMN IF NOT EXISTS confirmation_token VARCHAR(255) UNIQUE NULL; -- New column for storing email confirmation token
ALTER TABLE users ADD COLUMN IF NOT EXISTS confirmation_token_expires_at DATETIME NULL; -- New column for confirmation token expiration
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR(255) UNIQUE NULL; -- New column for password reset token
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_token_expires_at DATETIME NULL; -- New column for password reset token expiration

CREATE TABLE IF NOT EXISTS pricing_plans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    planType VARCHAR(50) UNIQUE NOT NULL, -- e.g., 'weekly_material_access', 'monthly_material_access'
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'Tshs',
    durationDays INT NOT NULL, -- Duration in days for the plan
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO pricing_plans (planType, amount, durationDays) VALUES ('weekly_material_access', 1000.00, 7) ON DUPLICATE KEY UPDATE amount = VALUES(amount), durationDays = VALUES(durationDays);
INSERT INTO pricing_plans (planType, amount, durationDays) VALUES ('monthly_material_access', 4000.00, 30) ON DUPLICATE KEY UPDATE amount = VALUES(amount), durationDays = VALUES(durationDays);


CREATE TABLE IF NOT EXISTS classes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    classCode VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Add semester column to classes if it doesn't exist
ALTER TABLE classes ADD COLUMN IF NOT EXISTS semester VARCHAR(50);

CREATE TABLE IF NOT EXISTS payment_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    paymentScreenshotUrl VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending', -- e.g., 'pending', 'approved', 'rejected'
    requestType VARCHAR(50) NOT NULL, -- e.g., 'exam_access', 'exam_guide_access'
    amount DECIMAL(10, 2) NOT NULL, -- Store the amount paid
    currency VARCHAR(10) DEFAULT 'Tshs', -- Store the currency
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS class_levels (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    classId INT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (classId) REFERENCES classes(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS subjects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    classLevelId INT,
    semester VARCHAR(50), -- Changed to VARCHAR to store 'Semester 1' or 'Semester 2'
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (classLevelId) REFERENCES class_levels(id) ON DELETE SET NULL
);

-- Alter subjects table to change semester column type if it's not VARCHAR(50)
ALTER TABLE subjects MODIFY COLUMN semester VARCHAR(50);

CREATE TABLE IF NOT EXISTS content (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    fileUrl LONGTEXT NULL, -- Changed to NULL to allow videos without a file
    fileType VARCHAR(50) NULL, -- Changed to NULL to allow videos without a file
    videoUrl VARCHAR(255) NULL, -- Added videoUrl column
    originalFileName VARCHAR(255) NULL, -- New column for original file name
    classLevelId INT,
    subjectId INT,
    classId INT,
    semester VARCHAR(50), -- Changed to VARCHAR to store 'Semester 1' or 'Semester 2'
    uploadedBy INT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (classLevelId) REFERENCES class_levels(id) ON DELETE SET NULL,
    FOREIGN KEY (subjectId) REFERENCES subjects(id) ON DELETE SET NULL,
    FOREIGN KEY (classId) REFERENCES classes(id) ON DELETE SET NULL,
    FOREIGN KEY (uploadedBy) REFERENCES users(id) ON DELETE SET NULL
);

-- Alter content table to change semester column type if it's not VARCHAR(50)
ALTER TABLE content MODIFY COLUMN semester VARCHAR(50);

-- Alter content table to use LONGTEXT for fileUrl if it's still VARCHAR and allow NULL
ALTER TABLE content MODIFY COLUMN fileUrl LONGTEXT NULL;

-- Alter content table to allow NULL for fileType if it's not already
ALTER TABLE content MODIFY COLUMN fileType VARCHAR(50) NULL;

-- Add videoUrl column to content (remove IF NOT EXISTS for broader MySQL compatibility)
ALTER TABLE content ADD COLUMN videoUrl VARCHAR(255) NULL;

CREATE TABLE IF NOT EXISTS advertisements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    imageUrl VARCHAR(255) NOT NULL,
    targetUrl VARCHAR(255),
    startDate DATE,
    endDate DATE,
    isActive BOOLEAN DEFAULT TRUE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    recipientId INT NOT NULL,
    senderId INT, -- Nullable, as some notifications might be system-generated
    type VARCHAR(50) NOT NULL, -- e.g., 'payment_status', 'password_change', 'trial_awarded', 'payment_proof_submitted'
    message TEXT NULL,
    isRead BOOLEAN DEFAULT FALSE,
    entityId INT NULL,
    entityType VARCHAR(50) NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (recipientId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (senderId) REFERENCES users(id) ON DELETE SET NULL
);

-- Add entityId and entityType columns to notifications if they don't exist
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS entityId INT NULL;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS entityType VARCHAR(50) NULL;

CREATE TABLE IF NOT EXISTS discussions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    createdBy INT NOT NULL,
    classId INT, -- Optional: link to existing classes
    subjectId INT, -- Optional: link to existing subjects
    isPinned BOOLEAN DEFAULT FALSE,
    viewCount INT DEFAULT 0,
    replyCount INT DEFAULT 0,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (createdBy) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (classId) REFERENCES classes(id) ON DELETE SET NULL,
    FOREIGN KEY (subjectId) REFERENCES subjects(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS discussion_replies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    discussionId INT NOT NULL,
    content TEXT NOT NULL,
    createdBy INT NOT NULL,
    parentId INT, -- For nested replies
    isDeleted BOOLEAN DEFAULT FALSE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (discussionId) REFERENCES discussions(id) ON DELETE CASCADE,
    FOREIGN KEY (createdBy) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (parentId) REFERENCES discussion_replies(id) ON DELETE CASCADE
);

-- Delete existing reactions to avoid conflicts with new unique constraints
DELETE FROM discussion_reactions;
DELETE FROM reply_reactions;

CREATE TABLE IF NOT EXISTS discussion_reactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    discussionId INT NOT NULL,
    userId INT NOT NULL,
    reactionType VARCHAR(50) NOT NULL, -- e.g., 'like', 'love', 'haha', 'wow', 'sad', 'angry'
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (discussionId, userId), -- A user can react once per discussion
    FOREIGN KEY (discussionId) REFERENCES discussions(id) ON DELETE CASCADE,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS reply_reactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    replyId INT NOT NULL,
    userId INT NOT NULL,
    reactionType VARCHAR(50) NOT NULL, -- e.g., 'like', 'love', 'haha', 'wow', 'sad', 'angry'
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (replyId, userId), -- A user can react once per reply
    FOREIGN KEY (replyId) REFERENCES discussion_replies(id) ON DELETE CASCADE,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_queries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId INT NOT NULL,
    userName VARCHAR(255), -- Added for easier display in admin panel
    message TEXT NULL, -- Allow NULL values for message
    filePath VARCHAR(255), -- For attached file path
    readStatus BOOLEAN DEFAULT FALSE, -- Renamed from 'status' to 'readStatus' and changed type to BOOLEAN
    adminResponse TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

-- Add userName column to user_queries if it doesn't exist
ALTER TABLE user_queries ADD COLUMN IF NOT EXISTS userName VARCHAR(255);

-- Rename queryContent to message if it exists
ALTER TABLE user_queries CHANGE COLUMN IF EXISTS queryContent message TEXT NULL;

-- Rename status to readStatus and change type to BOOLEAN if it exists
ALTER TABLE user_queries CHANGE COLUMN IF EXISTS status readStatus BOOLEAN DEFAULT FALSE;

-- New tables for chat conversations and messages
CREATE TABLE IF NOT EXISTS chat_conversations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId INT NOT NULL,
    lastMessageId INT, -- Reference to the last message in this conversation
    adminLastReadAt TIMESTAMP NULL, -- Timestamp when admin last read this conversation
    userLastReadAt TIMESTAMP NULL, -- Timestamp when user last read this conversation
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS chat_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    conversationId INT NOT NULL,
    senderId INT NOT NULL, -- User ID or Admin ID
    senderRole VARCHAR(50) NOT NULL, -- 'user' or 'admin'
    message TEXT NOT NULL,
    filePath VARCHAR(255), -- Optional file attachment
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversationId) REFERENCES chat_conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (senderId) REFERENCES users(id) ON DELETE CASCADE
);

-- Drop the foreign key if it exists before attempting to add it, to prevent duplicate key errors on schema re-initialization
ALTER TABLE chat_conversations DROP FOREIGN KEY IF EXISTS fk_last_message;

-- Add the foreign key for lastMessageId after chat_messages is created
-- This needs to be a separate ALTER TABLE statement because chat_messages must exist first
ALTER TABLE chat_conversations ADD CONSTRAINT fk_last_message
FOREIGN KEY (lastMessageId) REFERENCES chat_messages(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS pesapal_transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId INT NOT NULL,
    orderId VARCHAR(255) UNIQUE NOT NULL, -- Your unique merchant reference
    orderTrackingId VARCHAR(255) NULL, -- Pesapal's unique order tracking ID
    requestType VARCHAR(50) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(10) NOT NULL,
    paymentStatus VARCHAR(50) DEFAULT 'PENDING', -- e.g., PENDING, COMPLETED, FAILED, REVERSED
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

-- Drop the old 'sessions' table if it exists
DROP TABLE IF EXISTS sessions;

-- Add the new 'user_sessions' table definition for device-specific session management
CREATE TABLE IF NOT EXISTS user_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id VARCHAR(255) UNIQUE NOT NULL, -- Unique ID for each session
    user_id INT NOT NULL,
    device_info VARCHAR(255) NULL, -- Information about the device (e.g., user agent)
    is_active BOOLEAN DEFAULT TRUE, -- Whether the session is currently active
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS system_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(255) UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO system_settings (setting_key, setting_value) VALUES 
('global_free_access', 'false'),
('payment_mode', 'pesapal'),
('manual_payment_instructions', 'Proceed to make payment of the specified amount to Yas/Mix by Yas Vodacom Number: 0XXXXXXX. After payment, upload the screenshot of the transaction here for verification.')
ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value);
