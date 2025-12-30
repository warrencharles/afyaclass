import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { Card, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { useToast } from '../../../contexts/ToastContext';
import { ConfirmationModal } from '../../../components/ui/ConfirmationModal';
import { Edit, Trash2, Pin, PinOff, Search, MessageSquare, Eye, User as UserIcon, Calendar, ChevronDown, ChevronUp, XCircle, Info, Loader2, MessageCircle } from 'lucide-react';
import { API_BASE_URL } from '../../../utils/api';

interface Reply {
  id: number;
  discussionId: number;
  content: string;
  createdBy: number;
  createdByUsername: string;
  parentId: number | null;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Discussion {
  id: number;
  title: string;
  content: string;
  createdBy: number;
  createdByUsername: string;
  classId: number | null;
  subjectId: number | null;
  isPinned: boolean;
  viewCount: number;
  replyCount: number;
  createdAt: string;
  updatedAt: string;
  replies?: Reply[];
}

export const AdminForumTab: React.FC = () => {
  const { showToast } = useToast();
  const { user } = useAuth();
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<Discussion>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPinned, setFilterPinned] = useState<string>('all');
  const [expandedDiscussionId, setExpandedDiscussionId] = useState<number | null>(null);

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

  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const toggleSelection = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredDiscussions.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredDiscussions.map(d => d.id));
    }
  };

  const bulkDeleteDiscussions = async (ids: number[]) => {
    const headers = getAuthHeaders();
    if (!headers) return;
    await Promise.all(ids.map(id =>
      fetch(`${API_BASE_URL}/api/discussions/${id}`, { method: 'DELETE', headers })
    ));
    showToast(`${ids.length} discussions purged`, 'success');
    fetchDiscussions();
    setSelectedIds([]);
  };

  const triggerBulkDelete = () => {
    if (selectedIds.length === 0) return;
    setConfirmModal({
      isOpen: true,
      title: 'Bulk Delete Discussions',
      message: `Permanently delete ${selectedIds.length} discussions? All associated replies will also be removed.`,
      variant: 'danger',
      onConfirm: async () => {
        await bulkDeleteDiscussions(selectedIds);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const getAuthHeaders = useCallback(() => {
    if (!user?.token) return undefined;
    return { 'Authorization': `Bearer ${user.token}`, 'Content-Type': 'application/json' };
  }, [user]);

  const fetchDiscussions = useCallback(async () => {
    setIsLoading(true);
    try {
      const headers = getAuthHeaders();
      if (!headers) return;
      const response = await fetch(`${API_BASE_URL}/api/discussions`, { headers });
      const data = await response.json();
      setDiscussions(Array.isArray(data) ? data : []);
    } catch (err) {
      showToast('Fetch failed', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [getAuthHeaders, showToast]);

  const fetchReplies = useCallback(async (discussionId: number) => {
    try {
      const headers = getAuthHeaders();
      if (!headers) return;
      const response = await fetch(`${API_BASE_URL}/api/discussions/${discussionId}?incrementView=false`, { headers });
      const data = await response.json();
      setDiscussions(prev => prev.map(d => d.id === discussionId ? { ...d, replies: Array.isArray(data.replies) ? data.replies : [] } : d));
    } catch (err) {
      showToast('Replies failed', 'error');
    }
  }, [getAuthHeaders, showToast]);

  useEffect(() => { fetchDiscussions(); }, [fetchDiscussions]);

  const toggleReplies = async (id: number) => {
    if (expandedDiscussionId === id) setExpandedDiscussionId(null);
    else {
      setExpandedDiscussionId(id);
      const d = discussions.find(x => x.id === id);
      if (!d?.replies) await fetchReplies(id);
    }
  };

  const triggerDeleteDiscussion = (d: Discussion) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Discussion',
      message: `Are you sure you want to delete "${d.title}"? All replies and community sentiment data will be purged.`,
      variant: 'danger',
      onConfirm: async () => {
        const headers = getAuthHeaders();
        if (!headers) return;
        await fetch(`${API_BASE_URL}/api/discussions/${d.id}`, { method: 'DELETE', headers });
        showToast('Discussion purged', 'success');
        fetchDiscussions();
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const triggerDeleteReply = (reply: Reply) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Reply',
      message: 'Permanently remove this reply from the discussion thread?',
      variant: 'danger',
      onConfirm: async () => {
        const headers = getAuthHeaders();
        if (!headers) return;
        await fetch(`${API_BASE_URL}/api/admin/replies/${reply.id}`, { method: 'DELETE', headers });
        showToast('Reply removed', 'success');
        if (expandedDiscussionId) fetchReplies(expandedDiscussionId);
        fetchDiscussions();
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  }

  const handleTogglePin = async (d: Discussion) => {
    const headers = getAuthHeaders();
    if (!headers) return;
    await fetch(`${API_BASE_URL}/api/discussions/${d.id}/pin`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ isPinned: !d.isPinned })
    });
    showToast(d.isPinned ? 'Unpinned' : 'Pinned', 'success');
    fetchDiscussions();
  };

  const filteredDiscussions = useMemo(() => {
    if (!Array.isArray(discussions)) return [];
    return discussions.filter(d => {
      const search = searchTerm.toLowerCase();
      const title = (d.title || '').toLowerCase();
      const uName = (d.createdByUsername || '').toLowerCase();
      const matches = title.includes(search) || uName.includes(search);

      if (filterPinned === 'pinned') return matches && d.isPinned;
      if (filterPinned === 'unpinned') return matches && !d.isPinned;
      return matches;
    });
  }, [discussions, searchTerm, filterPinned]);

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Community Forum</h2>
          <p className="text-[10px] md:text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Moderate discussions and replies</p>
        </div>
        <div className="w-full md:w-64">
          <Select
            options={[
              { value: 'all', label: 'All Topics' },
              { value: 'pinned', label: 'Pinned Only' },
              { value: 'unpinned', label: 'Unpinned Only' }
            ]}
            value={filterPinned}
            onChange={setFilterPinned}
            fullWidth
            className="bg-white/50"
          />
        </div>
      </div>

      <div className="relative">
        <Input
          placeholder="Search topics or users..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-12 bg-white/60 backdrop-blur-md border-transparent rounded-2xl focus:bg-white transition-all shadow-sm"
          icon={<Search size={18} className="text-slate-400" />}
          fullWidth
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {isLoading ? (
          <div className="col-span-full py-20 text-center">
            <Loader2 className="animate-spin h-10 w-10 text-blue-500 mx-auto" />
          </div>
        ) : filteredDiscussions.length === 0 ? (
          <div className="col-span-full py-20 text-center bg-white/40 backdrop-blur-md rounded-[2.5rem] border border-white/80 border-dashed">
            <MessageSquare size={48} className="mx-auto text-slate-200 mb-4" />
            <p className="text-slate-500 font-black uppercase tracking-widest">No discussions active</p>
          </div>
        ) : filteredDiscussions.map(d => (
          <Card key={d.id} className={`group relative border-0 shadow-lg shadow-blue-900/5 backdrop-blur-md rounded-[2.5rem] overflow-hidden border ${selectedIds.includes(d.id) ? 'bg-blue-50/80 border-blue-200 ring-2 ring-blue-400 ring-offset-2' : 'bg-white/80 border-white/40'}`}>
            <div className="absolute top-4 left-4 z-10">
              <input
                type="checkbox"
                checked={selectedIds.includes(d.id)}
                onChange={() => toggleSelection(d.id)}
                className="w-5 h-5 rounded-lg border-slate-300 text-blue-600 focus:ring-blue-500 bg-white/50 backdrop-blur-sm cursor-pointer"
              />
            </div>
            <CardContent className="p-6 pt-12 space-y-4">
              <div className="flex justify-between items-start">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 font-black shadow-inner">
                    {(d.createdByUsername || '?').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-black text-slate-800 text-sm">{d.title}</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">by {d.createdByUsername}</p>
                  </div>
                </div>
                <button onClick={() => handleTogglePin(d)} className={`p-2 rounded-xl transition-all ${d.isPinned ? 'bg-amber-50 text-amber-500' : 'text-slate-300 hover:text-slate-500'}`}>
                  {d.isPinned ? <Pin size={16} /> : <PinOff size={16} />}
                </button>
              </div>

              <p className="text-xs text-slate-600 font-medium leading-relaxed line-clamp-3">{d.content}</p>

              <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <MessageSquare size={12} className="mr-1 text-blue-500" />
                    {d.replyCount}
                  </div>
                  <div className="flex items-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <Eye size={12} className="mr-1 text-green-500" />
                    {d.viewCount}
                  </div>
                </div>
                <div className="flex space-x-1">
                  <button onClick={() => toggleReplies(d.id)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all">
                    {expandedDiscussionId === d.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                  <button onClick={() => triggerDeleteDiscussion(d)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {expandedDiscussionId === d.id && (
                <div className="mt-4 pt-4 border-t border-slate-100 space-y-3 animate-in fade-in slide-in-from-top-2">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center">
                    <MessageCircle size={10} className="mr-1" /> Thread Activity
                  </h4>
                  {(!d.replies || d.replies.length === 0) ? (
                    <p className="text-[10px] font-bold text-slate-400 italic">No replies yet.</p>
                  ) : d.replies.map(r => (
                    <div key={r.id} className="p-3 bg-white/50 rounded-2xl border border-white/60 flex justify-between items-start group/reply">
                      <div className="flex-1">
                        <p className="text-xs text-slate-600 font-medium">{r.isDeleted ? '[[ Content Deleted ]]' : r.content}</p>
                        <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase">
                          {r.createdByUsername} • {new Date(r.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      {!r.isDeleted && (
                        <button onClick={() => triggerDeleteReply(r)} className="p-1.5 text-slate-300 hover:text-red-500 opacity-0 group-hover/reply:opacity-100 transition-all">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
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

export default AdminForumTab;
