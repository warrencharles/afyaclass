import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, MessageSquareText } from 'lucide-react';
import { fetchChatMessages, sendAdminMessage } from '../../utils/api';
import { ChatConversation, ChatMessage } from '../../types';
import { useAuth } from '../../contexts/AuthContext'; // To get admin user ID if needed for senderId

interface AdminChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversation: ChatConversation; // The conversation to display
  onSendMessage: (conversationId: string, message: string, filePath?: string) => Promise<void>;
}

const AdminChatModal: React.FC<AdminChatModalProps> = ({ isOpen, onClose, conversation, onSendMessage }) => {
  const { user } = useAuth(); // Assuming admin user is logged in via AuthContext
  const [messageInput, setMessageInput] = useState('');
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const getMessages = async () => {
    if (conversation?.id) {
      console.log(`AdminChatModal: Attempting to fetch messages for conversation ID: ${conversation.id}`);
      try {
        setLoadingMessages(true);
        const fetchedMessages = await fetchChatMessages(conversation.id);
        setMessages(fetchedMessages);
        console.log(`AdminChatModal: Fetched ${fetchedMessages.length} messages for conversation ID: ${conversation.id}`);
      } catch (err) {
        setError('Failed to fetch messages for this conversation.');
        console.error('AdminChatModal: Error fetching messages:', err);
      } finally {
        setLoadingMessages(false);
      }
    } else {
      console.log('AdminChatModal: No conversation ID available to fetch messages.');
    }
  };

  useEffect(() => {
    if (isOpen && conversation) {
      console.log('AdminChatModal: isOpen and conversation are true, calling getMessages.');
      getMessages();
    } else {
      console.log('AdminChatModal: isOpen or conversation is false. Not calling getMessages.');
    }
  }, [isOpen, conversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loadingMessages]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setAttachedFile(event.target.files[0]);
    } else {
      setAttachedFile(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!conversation?.id) {
      console.error('AdminChatModal: No conversation selected.');
      return;
    }

    if (messageInput.trim() || attachedFile) {
      const tempMessageId = `temp-${Date.now()}`;
      const newMessage: ChatMessage = {
        id: tempMessageId,
        conversationId: conversation.id,
        senderId: user?.id || 0, // Assuming admin user ID
        senderRole: 'admin',
        message: messageInput.trim(),
        filePath: attachedFile ? URL.createObjectURL(attachedFile) : undefined,
        timestamp: new Date().toISOString(),
        read: true, // Admin sending, so it's read by admin
      };

      setMessages(prev => [...prev, newMessage]);
      
      try {
        await onSendMessage(conversation.id, messageInput, attachedFile?.name); // Assuming file path is handled by backend
        // After successful send, messages will be re-fetched by getMessages due to conversation dependency
      } catch (error) {
        console.error('Error sending message:', error);
        setMessages(prev => prev.filter(msg => msg.id !== tempMessageId)); // Remove optimistic message
        setError('Failed to send message. Please try again.');
      } finally {
        setMessageInput('');
        setAttachedFile(null);
      }
    }
  };

  // Handle escape key and click outside
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.addEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'hidden'; // Prevent body scroll
    } else {
      document.body.style.overflow = 'unset'; // Restore body scroll
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={modalRef}
          className="fixed bottom-8 right-8 w-full max-w-sm h-[400px] shadow-2xl flex flex-col overflow-hidden z-[9999]"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.1))',
            backdropFilter: 'blur(20px) saturate(180%)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            transformStyle: 'preserve-3d',
            perspective: '1000px',
            borderRadius: '25px',
            borderBottomRightRadius: '60px',
          }}
          initial={{ opacity: 0, scale: 0.2, originX: 'right', originY: 'bottom' }}
          animate={{ opacity: 1, scale: 1, originX: 'right', originY: 'bottom' }}
          exit={{ opacity: 0, scale: 0.2, originX: 'right', originY: 'bottom',
            transition: { type: "spring", stiffness: 120, damping: 12, duration: 0.75 }
          }}
          transition={{ type: "spring", stiffness: 280, damping: 25, duration: 0.2 }}
        >
          {/* Header with Chatbot avatar */}
          <div className="flex-shrink-0 flex items-center p-4 pb-2">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm mr-3 shadow-md">
              <MessageSquareText size={20} />
            </div>
            <h2 className="text-lg font-semibold text-neutral-700">Chat with {conversation.userName}</h2>
          </div>
          {/* Close Button - positioned absolutely for guaranteed visibility */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-red-600 text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all duration-200 z-50"
            aria-label="Close chat modal"
          >
            <X size={20} strokeWidth={3} />
          </button>

          {/* Chat Messages Area */}
          <div className="flex-grow overflow-y-auto p-4 pt-0 space-y-4 custom-scrollbar">
            {loadingMessages ? (
              <div>Loading messages...</div>
            ) : error ? (
              <div className="text-red-500">{error}</div>
            ) : messages.length === 0 ? (
              <div className="text-gray-500 text-center">No messages yet. Start the conversation!</div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.senderRole === 'admin' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] p-3 shadow-sm ${
                      msg.senderRole === 'admin'
                        ? 'bg-blue-600 text-white rounded-tl-2xl rounded-tr-lg rounded-br-2xl rounded-bl-2xl'
                        : 'bg-gray-200 text-gray-800 rounded-tl-lg rounded-tr-2xl rounded-br-2xl rounded-bl-2xl'
                    }`}
                  >
                    <p className="text-xs text-gray-400 mb-1">
                      {msg.senderRole === 'admin' ? 'You' : conversation.userName} - {new Date(msg.timestamp).toLocaleTimeString()}
                    </p>
                    <p>{msg.message}</p>
                    {msg.filePath && (
                      <div className="mt-2">
                        <a
                          href={`http://localhost:8001${msg.filePath}`} // Assuming backend serves uploads from /uploads
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-200 hover:underline text-sm"
                        >
                          View Attached File
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} /> {/* Scroll anchor */}
          </div>

          {/* Input Area */}
          {/* Attached File Display */}
          {attachedFile && (
            <div className="flex items-center justify-between p-2 bg-gray-100 rounded-md mx-4 mb-2">
              <span className="text-sm text-gray-700 truncate">{attachedFile.name}</span>
              <button
                onClick={() => setAttachedFile(null)}
                className="ml-2 text-gray-500 hover:text-gray-700"
                aria-label="Remove attached file"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* Input Area and Send Button */}
          <form onSubmit={handleSubmit} className="flex-shrink-0 p-4 pt-2 flex items-center w-full">
            <input
              type="file"
              id="file-upload"
              className="hidden"
              onChange={handleFileChange}
            />
            <label htmlFor="file-upload" className={`cursor-pointer mr-2 p-2 rounded-full ${attachedFile ? 'bg-blue-500' : 'bg-neutral-700'} text-white hover:bg-neutral-600 transition-colors focus:outline-none focus:ring-2 focus:ring-neutral-500 shadow-lg`}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-paperclip"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.49"/></svg>
            </label>
            <input
              type="text"
              className="flex-grow p-3 rounded-full bg-white text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-inner"
              placeholder="Type your message here....."
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
            />
            <button
              type="submit"
              className={`ml-2 w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-lg ${!messageInput.trim() && !attachedFile ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-600'}`}
              aria-label="Send message"
              disabled={!messageInput.trim() && !attachedFile}
            >
              <Send size={20} />
            </button>
          </form>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AdminChatModal;
