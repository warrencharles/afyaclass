import axios from 'axios';
import axiosClient from './axiosClient'; // Import the new axiosClient
import { Class, ClassLevel, UserQuery, ChatMessage, ChatConversation, Advertisement } from '../types'; // Corrected import path for types

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://dev.afyaclass.co.tz/backend-php/public"; // Use VITE_API_BASE_URL

// Remove setAuthToken and setSessionInvalidatedCallback as they are handled by axiosClient interceptors and AuthContext
// Remove the interceptor here as it's now in axiosClient.ts

// Utility function to fetch all classes
export const fetchClasses = async (): Promise<Class[]> => {
  const response = await axiosClient.get('/classes'); // Use axiosClient
  if (!Array.isArray(response.data)) {
    console.error('API Error: /classes endpoint did not return an array. Received:', response.data);
    // Depending on desired error handling, you might throw an error or return an empty array
    throw new Error('Invalid data format received for classes.');
  }
  return response.data;
};

// Utility function to fetch all class levels
export const fetchClassLevels = async (): Promise<ClassLevel[]> => {
  const response = await axiosClient.get('/class-levels'); // Use axiosClient
  return response.data;
};

// Utility function to fetch all pricing plans
export const fetchPricingPlans = async () => {
  const response = await axiosClient.get('/pricing-plans'); // Use axiosClient
  return response.data;
};

// Utility function to submit payment proof for material access
export const submitMaterialAccessPaymentProof = async (formData: FormData) => {
  const response = await axiosClient.post('/users/request-material-access', formData, { // Use axiosClient
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

// Utility function to submit a user query to the admin, now supporting file uploads
export const submitUserQuery = async (query: string, file: File | null, userId: number) => {
  const formData = new FormData();
  if (query.trim()) {
    formData.append('query', query);
  }
  if (file) {
    formData.append('file', file);
  }
  formData.append('userId', userId.toString()); // Add userId to the form data

  const response = await axiosClient.post('/user/queries', formData, { // Use axiosClient
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

// Utility function to fetch all advertisements
export const fetchAdvertisements = async (): Promise<Advertisement[]> => {
  const response = await axiosClient.get('/advertisements'); // Use axiosClient
  return response.data;
};

// Utility function to fetch all chat conversations for admin
export const fetchChatConversations = async (): Promise<ChatConversation[]> => {
  try {
    const response = await axiosClient.get('/admin/chat/conversations'); // Use axiosClient
    return response.data;
  } catch (error) {
    console.error('API Error: Failed to fetch chat conversations:', error);
    throw error;
  }
};

// Utility function to fetch messages for a specific conversation
export const fetchChatMessages = async (conversationId: string): Promise<ChatMessage[]> => {
  try {
    const response = await axiosClient.get(`/admin/chat/conversations/${conversationId}/messages`); // Use axiosClient
    return response.data;
  } catch (error) {
    console.error(`API Error: Failed to fetch messages for conversation ${conversationId}:`, error);
    throw error;
  }
};

// Utility function to send a message from admin to user
export const sendAdminMessage = async (conversationId: string, message: string, filePath?: string): Promise<ChatMessage> => {
  const data: { message: string; filePath?: string } = { message };
  if (filePath) {
    data.filePath = filePath; // Send filePath as a string in the request body
  }
  // The backend will associate this with the admin user
  const response = await axiosClient.post(`/admin/chat/conversations/${conversationId}/messages`, data); // Use axiosClient
  return response.data;
};

// Utility function to mark a conversation as read
export const markConversationAsRead = async (conversationId: string) => {
  const response = await axiosClient.put(`/admin/chat/conversations/${conversationId}/read`); // Use axiosClient
  return response.data;
};

// Utility function to fetch the count of unread chat conversations
// Utility function to mark a conversation as solved/unsolved
export const updateConversationSolvedStatus = async (conversationId: string, isSolved: boolean) => {
  const response = await axiosClient.put(`/admin/chat/conversations/${conversationId}/solved`, { isSolved }); // Use axiosClient
  return response.data;
};

// Utility function to mark a conversation as pinned/unpinned
export const updateConversationPinnedStatus = async (conversationId: string, isPinned: boolean) => {
  const response = await axiosClient.put(`/admin/chat/conversations/${conversationId}/pinned`, { isPinned }); // Use axiosClient
  return response.data;
};

// Utility function to mark a conversation as archived/unarchived
export const updateConversationArchivedStatus = async (conversationId: string, isArchived: boolean) => {
  const response = await axiosClient.put(`/admin/chat/conversations/${conversationId}/archived`, { isArchived }); // Use axiosClient
  return response.data;
};

// Utility function to delete a conversation
export const deleteChatConversation = async (conversationId: string) => {
  const response = await axiosClient.delete(`/admin/chat/conversations/${conversationId}`); // Use axiosClient
  return response.data;
};

// Utility function to upload a file for a chat message
export const uploadChatFile = async (file: File): Promise<{ filePath: string }> => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await axiosClient.post('/admin/chat/upload-file', formData, { // Use axiosClient
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const fetchUnreadChatConversationsCount = async (): Promise<number> => {
  try {
    const response = await axiosClient.get('/admin/chat/conversations/unread/count'); // Use axiosClient
    return response.data.count;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      console.error('API Error: Failed to fetch unread chat conversations count:', error.response.data);
    } else {
      console.error('API Error: Failed to fetch unread chat conversations count:', error);
    }
    throw error;
  }
};

// Utility function to fetch notifications for a specific user
export const fetchUserNotifications = async (userId: number): Promise<Notification[]> => {
  try {
    const response = await axiosClient.get(`/notifications/${userId}`); // Use axiosClient
    return response.data;
  } catch (error) {
    console.error(`API Error: Failed to fetch notifications for user ${userId}:`, error);
    throw error;
  }
};

// Utility function to mark a specific notification as read
export const markNotificationAsRead = async (notificationId: number) => {
  try {
    const response = await axiosClient.put(`/notifications/${notificationId}/read`); // Use axiosClient
    return response.data;
  } catch (error) {
    console.error(`API Error: Failed to mark notification ${notificationId} as read:`, error);
    throw error;
  }
};

// Utility function to mark all notifications for a user as read
export const markAllNotificationsAsRead = async (userId: number) => {
  try {
    const response = await axiosClient.put(`/notifications/${userId}/read-all`, { action: 'mark_all_as_read' }); // Use axiosClient
    return response.data;
  } catch (error) {
    console.error(`API Error: Failed to mark all notifications for user ${userId} as read:`, error);
    throw error;
  }
};

// Utility function to fetch all Pesapal transactions (admin only)
export const fetchPesapalTransactions = async () => {
  const response = await axiosClient.get('/admin/pesapal-transactions');
  return response.data;
};

// Utility function to delete multiple Pesapal transaction logs (admin only)
export const bulkDeletePesapalTransactions = async (ids: number[]) => {
  const response = await axiosClient.post('/admin/pesapal-transactions/bulk', { ids });
  return response.data;
};

// Utility function for manual access grant (admin only)
export const manualGrantAccess = async (data: { userId: number; requestType: string; durationDays: number }) => {
  const response = await axiosClient.post('/admin/manual-grant', data);
  return response.data;
};

// Utility function to search for users (for manual grant)
export const searchUsersForGrant = async (query: string) => {
  const response = await axiosClient.get(`/admin/users?search=${query}`);
  return response.data;
};

export default axiosClient; // Export the new axiosClient as default
