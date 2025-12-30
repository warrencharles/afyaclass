export type UserRole = 'admin' | 'student';

export type ClassType = 'CMT' | 'PST' | 'MLT' | 'NMT' | 'HIT';

export interface User {
  id: number;
  email: string;
  username: string;
  college: string;
  phone?: string;
  classType: ClassType;
  classTypeNameFull?: string; // New field for full program name
  classLevel: string;
  role: UserRole;
  hasMaterialAccess?: boolean; // New field for general material access
  materialTrialStartTime?: string | null; // DATETIME from backend, will be string or null in frontend
  materialTrialEndTime?: string | null; // New field for material trial end time
  materialPaidAccessEndTime?: string | null; // New field for general material paid access end time
  password?: string; // Add optional password field
  hasPendingPayment?: boolean; // New field to indicate if user has a pending payment request
  isConfirmed?: boolean; // New field for email confirmation status
  confirmation_token?: string | null; // New field for storing email confirmation token
  token: string | null; // New field for JWT token, can be string or null
  device_id: string | null; // New field to store the current device ID
  canAccessExams?: boolean; // Derived field: true if hasMaterialAccess
  canAccessExamGuides?: boolean; // Derived field: true if hasMaterialAccess
  // Fields for admin to set trial time (not stored in DB, only for update requests)
  setMaterialTrialHours?: number; // New field for admin to set material trial time
}

export interface Session {
  session_id: string;
  user_id: number;
  device_info: string;
  is_active: boolean;
  login_time: string; // Corresponds to last_activity or a dedicated login_time if added
}

export interface Class {
  id: number;
  classCode: ClassType; // Changed to ClassType
  name: string;
  description?: string; // Made optional
}

export interface ClassLevel {
  id: number;
  name: string;
  description?: string;
  classId?: number;
}

export interface Subject {
  id: number;
  name: string;
  description?: string;
  classLevelId?: number;
  semester?: string | null; // Allow null for semester
}

export type ContentType = 'note' | 'book' | 'nactvet' | 'exam' | 'examGuide' | 'video' | 'practical'; // Added 'practical'

export interface Content {
  id: string;
  title: string;
  fileUrl?: string; // Made optional as videoUrl might be used instead
  fileType?: 'pdf' | 'image' | 'video'; // Made optional and added 'video'
  videoUrl?: string | null; // New field for YouTube video URL
  originalFileName?: string | null; // New field for the original file name
  classId?: number;
  classLevelId?: number;
  semester?: string | null; // Allow null for semester
  subjectId: number;
  type: ContentType;
  uploadedBy?: number; // Changed to number
  createdAt: string;
  updatedAt: string;
  accessStatus?: 'unlocked' | 'trial' | 'locked'; // New field to indicate content access status
  remainingTrialTime?: number; // New field for remaining trial time in milliseconds
}

export interface Advertisement {
  id: string;
  title: string;
  description?: string;
  imageUrl: string;
  targetUrl?: string; // Renamed from linkUrl and made optional
  startDate: string; // Added
  endDate: string; // Added
  isActive: boolean; // Added
  createdAt: string;
}

export interface UserQuery {
  id: string;
  userId: number;
  userName?: string;
  message: string;
  filePath?: string;
  timestamp: string;
  read: boolean; // This indicates if the admin has read this specific query
}

export interface ChatMessage {
  id: string;
  conversationId: string; // Links to the ChatConversation
  senderId: number; // User ID or Admin ID
  senderRole: 'user' | 'admin';
  message: string;
  filePath?: string;
  timestamp: string;
  read: boolean; // This indicates if the recipient has read this message
}

export interface ChatConversation {
  id: string; // This will be the userId for now, or a unique conversation ID
  userId: number;
  userName: string;
  lastMessagePreview: string; // A snippet of the last message for display
  lastMessageTimestamp: string;
  unreadCount: number; // Number of unread messages for the admin in this conversation
  messages?: ChatMessage[]; // Optional: full messages when viewing a specific conversation
  isSolved?: boolean; // New field for admin to mark conversation as solved
  isArchived?: boolean; // New field for admin to archive conversation
  isPinned?: boolean; // New field for admin to pin conversation
  avatar?: string; // Optional: User avatar
  from?: string; // Optional: Source of the query
}

export interface Notification {
  id: number;
  recipientId: number;
  senderId?: number | null;
  type: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  entityId?: number | null;
  entityType?: string | null;
}
