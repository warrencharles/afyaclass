import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, MessageCircle, Eye, User as UserIcon, TrendingUp, Search, Hash } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import api from '../../utils/api';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';

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
}

export const ForumPage: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const { showToast } = useToast();

  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTopicTitle, setNewTopicTitle] = useState('');
  const [newTopicContent, setNewTopicContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchDiscussions = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/discussions');
      setDiscussions(response.data);
    } catch (err: any) {
      console.error('Error fetching discussions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiscussions();
  }, []);

  const handleCreateTopic = async () => {
    if (!newTopicTitle || !newTopicContent || !user?.id) {
      showToast('Please fill in all fields', 'error');
      return;
    }

    setLoading(true);
    try {
      await api.post('/api/discussions', {
        title: newTopicTitle,
        content: newTopicContent,
        createdBy: user.id,
      });

      setNewTopicTitle('');
      setNewTopicContent('');
      setIsCreateModalOpen(false);
      fetchDiscussions();
      showToast('Topic created successfully', 'success');
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to create topic', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredDiscussions = discussions.filter(d =>
    d.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50/50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">

        {/* Forum Header */}
        <div className="bg-white rounded-3xl p-8 mb-8 shadow-sm border border-gray-100 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="max-w-xl">
            <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Community Forum</h1>
            <p className="text-gray-500 text-lg">
              Join the conversation. Share notes, ask questions, and help your peers master their subjects.
            </p>
          </div>
          {isAuthenticated && (
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl shadow-lg shadow-blue-500/30 text-base font-bold flex items-center gap-2 transform transition-transform hover:scale-105"
            >
              <Plus size={20} />
              Start Discussion
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">

          {/* Sidebar / Filters */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 sticky top-24">
              <div className="relative mb-6">
                <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Search topics..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-gray-50 border-gray-200 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                />
              </div>

              <h3 className="font-bold text-gray-800 mb-3 px-2 flex items-center gap-2">
                <TrendingUp size={16} className="text-blue-500" /> Trending Tags
              </h3>
              <div className="flex flex-wrap gap-2 px-2">
                {['ExamPrep', 'Anatomy', 'Clinical', 'Notes', 'Help'].map(tag => (
                  <span key={tag} className="px-3 py-1 bg-gray-50 hover:bg-blue-50 text-gray-600 hover:text-blue-600 rounded-full text-xs font-medium cursor-pointer transition-colors border border-gray-100">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Discussion Feed */}
          <div className="lg:col-span-3 space-y-4">
            {loading && filteredDiscussions.length === 0 ? (
              <div className="text-center py-12 text-gray-500">Loading community discussions...</div>
            ) : filteredDiscussions.length > 0 ? (
              filteredDiscussions.map((discussion) => (
                <div key={discussion.id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow group cursor-pointer">
                  <Link to={`/dashboard/forum/${discussion.id}`} className="block">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-50 to-blue-50 text-blue-600 flex items-center justify-center font-bold">
                          {discussion.createdByUsername?.[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 text-sm">{discussion.createdByUsername}</p>
                          <p className="text-gray-400 text-xs">{new Date(discussion.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <span className="bg-gray-50 text-gray-600 px-3 py-1 rounded-lg text-xs font-medium">
                        General
                      </span>
                    </div>

                    <h2 className="text-xl font-bold text-gray-800 mb-2 group-hover:text-blue-600 transition-colors">
                      {discussion.title}
                    </h2>
                    <p className="text-gray-600 mb-4 line-clamp-2 text-sm leading-relaxed">
                      {discussion.content}
                    </p>

                    <div className="flex items-center gap-6 pt-4 border-t border-gray-50">
                      <div className="flex items-center gap-2 text-gray-500 text-sm">
                        <MessageCircle size={16} />
                        <span>{discussion.replyCount} Replies</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-500 text-sm">
                        <Eye size={16} />
                        <span>{discussion.viewCount} Views</span>
                      </div>
                    </div>
                  </Link>
                </div>
              ))
            ) : (
              <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-200">
                <div className="mb-4 text-gray-300 mx-auto w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center">
                  <MessageCircle size={32} />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">No discussions found</h3>
                <p className="text-gray-500">Be the first to start a conversation!</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Start a New Discussion"
        size="lg"
      >
        <div className="p-4 space-y-4">
          <Input
            label="Topic Title"
            value={newTopicTitle}
            onChange={(e) => setNewTopicTitle(e.target.value)}
            placeholder="e.g., Help understanding Anatomy diagrams..."
            fullWidth
          />
          <Textarea
            label="Content"
            value={newTopicContent}
            onChange={(e) => setNewTopicContent(e.target.value)}
            placeholder="Describe your question or topic in detail..."
            rows={8}
            className="w-full"
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateTopic}
              isLoading={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Post Discussion
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
