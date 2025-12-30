import React, { useState, useRef, useEffect, ChangeEvent, FormEvent } from 'react';
import {
  fetchChatConversations,
  fetchChatMessages,
  sendAdminMessage,
  markConversationAsRead,
  updateConversationSolvedStatus,
  updateConversationPinnedStatus,
  updateConversationArchivedStatus,
  deleteChatConversation,
  uploadChatFile,
} from '../../../utils/api';
import { ChatConversation, ChatMessage } from '../../../types';
import { API_BASE_URL } from '../../../utils/api';
import { Search, MoreVertical, Send, Paperclip, CheckCircle2, Pin, Archive, Trash2, XCircle, ArrowLeft, Loader2, User, UserCircle } from 'lucide-react';
import { useToast } from '../../../contexts/ToastContext';
import { ConfirmationModal } from '../../../components/ui/ConfirmationModal';
import { Modal } from '../../../components/ui/Modal';
import { ProgressiveImage } from '../../../components/ui/ProgressiveImage';

export const AdminQueriesTab: React.FC = () => {
  const [conversations, setConversations] = useState<Record<string, ChatConversation>>({});
  const [activeUser, setActiveUser] = useState<string | null>(null);
  const [input, setInput] = useState<string>('');
  const [isBotTyping, setIsBotTyping] = useState<boolean>(false);
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImageViewerOpen, setIsImageViewerOpen] = useState<boolean>(false);
  const [viewerImageUrl, setViewerImageUrl] = useState<string>('');
  const [loadingConversations, setLoadingConversations] = useState<boolean>(true);
  const [loadingMessages, setLoadingMessages] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { showToast } = useToast();

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    variant: 'danger' | 'warning' | 'info' | 'success';
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    variant: 'info',
    onConfirm: () => { }
  });

  const getConversations = async () => {
    try {
      setLoadingConversations(true);
      const data = await fetchChatConversations();
      const conversationsMap: Record<string, ChatConversation> = {};
      data.forEach(conv => { conversationsMap[conv.id] = { ...conv, messages: conv.messages || [] }; });
      setConversations(conversationsMap);
    } catch (err) {
      showToast('Failed to load conversations', 'error');
    } finally {
      setLoadingConversations(false);
    }
  };

  useEffect(() => { getConversations(); }, []);

  useEffect(() => {
    if (messagesEndRef.current) messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [conversations, activeUser, isBotTyping]);

  const handleUserClick = async (id: string) => {
    setActiveUser(id);
    setIsMenuOpen(false);
    setLoadingMessages(true);
    try {
      const messages = await fetchChatMessages(id);
      setConversations(prev => ({
        ...prev,
        [id]: { ...prev[id], messages: messages, unreadCount: 0 },
      }));
      await markConversationAsRead(id);
    } catch (err) {
      showToast('Failed to load messages', 'error');
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    const textToSend = input.trim();
    const file = fileInputRef.current?.files?.[0];
    if (!activeUser || (!textToSend && !file)) return;

    let uploadedFilePath: string | undefined;
    if (file) {
      try {
        const uploadResponse = await uploadChatFile(file);
        uploadedFilePath = uploadResponse.filePath;
      } catch (err) {
        showToast('File upload failed', 'error');
        return;
      }
    }

    const optimisticMessage: ChatMessage = {
      id: `opt_${Date.now()}`,
      conversationId: activeUser,
      senderId: 0,
      senderRole: 'admin',
      message: textToSend,
      timestamp: new Date().toISOString(),
      read: true,
      filePath: uploadedFilePath,
    };

    setConversations(prev => ({
      ...prev,
      [activeUser]: {
        ...prev[activeUser],
        messages: [...(prev[activeUser].messages || []), optimisticMessage],
        lastMessagePreview: textToSend || 'Attachment',
        lastMessageTimestamp: optimisticMessage.timestamp,
      },
    }));
    setInput('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    setIsBotTyping(true);

    try {
      const sentMessage = await sendAdminMessage(activeUser, textToSend, uploadedFilePath);
      setConversations(prev => ({
        ...prev,
        [activeUser]: {
          ...prev[activeUser],
          messages: [...(prev[activeUser].messages?.filter(m => m.id !== optimisticMessage.id) || []), sentMessage],
          lastMessagePreview: sentMessage.message || 'File sent',
          lastMessageTimestamp: sentMessage.timestamp,
        },
      }));
    } catch (err) {
      showToast('Failed to sync message', 'error');
    } finally {
      setIsBotTyping(false);
    }
  };

  const triggerDelete = () => {
    if (!activeUser) return;
    const userName = conversations[activeUser].userName;
    setConfirmModal({
      isOpen: true,
      title: 'Purge Conversation',
      message: `Permanently delete the entire chat history with ${userName}? This action is irreversible.`,
      variant: 'danger',
      onConfirm: async () => {
        await deleteChatConversation(activeUser);
        setConversations(prev => {
          const updated = { ...prev };
          delete updated[activeUser];
          return updated;
        });
        setActiveUser(null);
        showToast('Thread deleted', 'success');
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleStatusToggle = async (type: 'solved' | 'pinned' | 'archived') => {
    if (!activeUser) return;
    const conv = conversations[activeUser];
    try {
      if (type === 'solved') await updateConversationSolvedStatus(activeUser, !conv.isSolved);
      if (type === 'pinned') await updateConversationPinnedStatus(activeUser, !conv.isPinned);
      if (type === 'archived') await updateConversationArchivedStatus(activeUser, !conv.isArchived);

      setConversations(prev => ({
        ...prev,
        [activeUser]: {
          ...prev[activeUser],
          isSolved: type === 'solved' ? !conv.isSolved : conv.isSolved,
          isPinned: type === 'pinned' ? !conv.isPinned : conv.isPinned,
          isArchived: type === 'archived' ? !conv.isArchived : conv.isArchived
        }
      }));
      showToast('Settings updated', 'success');
    } catch (err) {
      showToast('Update failed', 'error');
    }
    setIsMenuOpen(false);
  };

  const sortedConversations = Object.values(conversations)
    .filter(c => c.userName.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.lastMessageTimestamp).getTime() - new Date(a.lastMessageTimestamp).getTime();
    });

  if (loadingConversations) return (
    <div className="flex flex-col items-center justify-center h-full p-20">
      <Loader2 className="animate-spin h-12 w-12 text-blue-500 mb-4" />
      <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Opening Secure Channels...</p>
    </div>
  );

  return (
    <div className="h-[calc(100vh-100px)] md:h-[calc(100vh-140px)] flex bg-white/40 backdrop-blur-md rounded-[2.5rem] overflow-hidden border border-white/60 shadow-2xl relative">
      {/* Sidebar */}
      <div className={`${activeUser ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-80 border-r border-slate-100 bg-white/50 h-full`}>
        <div className="p-6 border-b border-slate-50">
          <h2 className="text-xl font-black text-slate-800 tracking-tight mb-4">Support Inbox</h2>
          <div className="relative">
            <Input
              placeholder="Find student..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10 bg-slate-50 border-transparent rounded-xl focus:bg-white"
              icon={<Search size={16} className="text-slate-400" />}
              fullWidth
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1 no-scrollbar">
          {sortedConversations.map(conv => (
            <button
              key={conv.id}
              onClick={() => handleUserClick(conv.id)}
              className={`w-full flex items-center p-3 rounded-2xl transition-all ${activeUser === conv.id ? 'bg-blue-600 shadow-xl shadow-blue-200 text-white translate-x-1' : 'hover:bg-blue-50/50 text-slate-600'
                }`}
            >
              <div className="relative shrink-0">
                <div className={`h-11 w-11 rounded-full flex items-center justify-center font-black ${activeUser === conv.id ? 'bg-white/20' : 'bg-slate-100 text-slate-400 shadow-inner'}`}>
                  {conv.userName.charAt(0).toUpperCase()}
                </div>
                {conv.unreadCount > 0 && <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 border-2 border-white rounded-full animate-ping" />}
                {conv.isPinned && <Pin size={10} className={`absolute -bottom-1 -right-1 ${activeUser === conv.id ? 'text-white' : 'text-blue-500'}`} />}
              </div>
              <div className="ml-3 text-left overflow-hidden flex-1">
                <div className="flex justify-between items-center">
                  <span className="font-black text-sm truncate">{conv.userName}</span>
                  <span className={`text-[9px] font-bold uppercase opacity-60`}>
                    {new Date(conv.lastMessageTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className={`text-[11px] font-medium truncate opacity-70`}>{conv.lastMessagePreview}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className={`${!activeUser ? 'hidden md:flex' : 'flex'} flex-col flex-1 bg-white/30 h-full`}>
        {!activeUser ? (
          <div className="flex flex-col items-center justify-center flex-1 p-10 text-center">
            <div className="h-20 w-20 bg-blue-50 rounded-[2rem] flex items-center justify-center text-blue-500 mb-4 shadow-inner">
              <User size={40} />
            </div>
            <h3 className="text-lg font-black text-slate-800">Ready to assist?</h3>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-2">Select a thread to start responding</p>
          </div>
        ) : (
          <>
            <div className="p-4 md:px-6 md:py-4 bg-white/80 backdrop-blur-md border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center">
                <button onClick={() => setActiveUser(null)} className="md:hidden p-2 mr-2 text-slate-400"><ArrowLeft size={18} /></button>
                <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-black shadow-lg shadow-blue-200">
                  {conversations[activeUser].userName.charAt(0).toUpperCase()}
                </div>
                <div className="ml-3">
                  <h3 className="font-black text-slate-800 text-sm leading-none">{conversations[activeUser].userName}</h3>
                  <div className="flex items-center mt-1">
                    <span className={`h-1.5 w-1.5 rounded-full ${conversations[activeUser].isSolved ? 'bg-green-500' : 'bg-amber-500'} mr-1.5`} />
                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">
                      {conversations[activeUser].isSolved ? 'Resolved' : 'In Progress'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="relative">
                <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 text-slate-400 hover:text-blue-600 transition-colors"><MoreVertical size={20} /></button>
                {isMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white/95 backdrop-blur-xl border border-slate-100 rounded-3xl shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-200">
                    {[
                      { icon: CheckCircle2, label: conversations[activeUser].isSolved ? 'Reopen Query' : 'Mark Solved', color: 'text-green-600', action: () => handleStatusToggle('solved') },
                      { icon: Pin, label: conversations[activeUser].isPinned ? 'Unpin Chat' : 'Pin to Top', color: 'text-blue-600', action: () => handleStatusToggle('pinned') },
                      { icon: Archive, label: 'Archive Thread', color: 'text-amber-600', action: () => handleStatusToggle('archived') },
                    ].map((opt, i) => (
                      <button key={i} onClick={opt.action} className="w-full flex items-center px-4 py-3 text-xs font-black text-slate-700 hover:bg-blue-50 transition-colors">
                        <opt.icon size={16} className={`mr-3 ${opt.color}`} />
                        {opt.label}
                      </button>
                    ))}
                    <div className="h-px bg-slate-100 my-1 mx-4" />
                    <button onClick={triggerDelete} className="w-full flex items-center px-4 py-3 text-xs font-black text-red-500 hover:bg-red-50 transition-colors">
                      <Trash2 size={16} className="mr-3" /> Purge Chat
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 no-scrollbar bg-slate-50/50">
              {loadingMessages ? (
                <div className="flex items-center justify-center h-full text-slate-400 italic font-bold text-xs uppercase tracking-widest">
                  Syncing data...
                </div>
              ) : (
                conversations[activeUser].messages?.map((msg, i) => (
                  <div key={msg.id || i} className={`flex ${msg.senderRole === 'user' ? 'justify-start' : 'justify-end'}`}>
                    <div className={`max-w-[85%] md:max-w-[70%] p-4 rounded-3xl shadow-sm text-sm font-medium leading-relaxed ${msg.senderRole === 'user'
                        ? 'bg-white text-slate-800 rounded-bl-none border border-slate-100'
                        : 'bg-blue-600 text-white rounded-br-none shadow-blue-200'
                      }`}>
                      {msg.filePath ? (
                        <div className="space-y-2">
                          {msg.filePath.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                            <ProgressiveImage src={`${API_BASE_URL}/${msg.filePath}`} alt="Attachment" className="rounded-xl w-full h-auto cursor-zoom-in shadow-sm" />
                          ) : (
                            <a href={`${API_BASE_URL}/${msg.filePath}`} target="_blank" rel="noreferrer" className="flex items-center p-2 bg-black/10 rounded-xl hover:bg-black/20 transition-colors">
                              <Paperclip size={14} className="mr-2" />
                              <span className="text-[10px] truncate">{msg.filePath.split('/').pop()}</span>
                            </a>
                          )}
                          {msg.message && <p>{msg.message}</p>}
                        </div>
                      ) : (
                        <p>{msg.message}</p>
                      )}
                      <div className={`text-[8px] font-black uppercase mt-1 opacity-50 text-right`}>
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))
              )}
              {isBotTyping && (
                <div className="flex justify-end pr-2">
                  <div className="flex space-x-1 p-2 bg-blue-100 rounded-full px-4 border border-blue-200">
                    <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" />
                    <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 md:p-6 bg-white border-t border-slate-100">
              <form onSubmit={handleSendMessage} className="relative flex items-center gap-2">
                <button type="button" onClick={() => fileInputRef.current?.click()} className="p-3 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-2xl transition-all">
                  <Paperclip size={20} />
                </button>
                <input type="file" ref={fileInputRef} className="hidden" />
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder="Type your response..."
                  className="flex-1 bg-slate-50 border-transparent rounded-[1.5rem] py-3.5 px-6 font-bold text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-300 transition-all shadow-inner"
                />
                <button type="submit" className="p-4 bg-blue-600 text-white rounded-[1.2rem] shadow-xl shadow-blue-200 active:scale-90 transition-all">
                  <Send size={20} />
                </button>
              </form>
            </div>
          </>
        )}
      </div>

      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        variant={confirmModal.variant}
      />
    </div>
  );
};

export default AdminQueriesTab;
