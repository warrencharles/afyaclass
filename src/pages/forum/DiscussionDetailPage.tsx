import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, MessageSquare, User as UserIcon, Send, Trash2, Eye, ThumbsUp, Heart, Laugh, Zap, Frown, Angry } from 'lucide-react'; // Renamed User import to UserIcon, added Eye, and reaction icons
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import api, { API_BASE_URL } from '../../utils/api'; // Import api and API_BASE_URL

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
  reactions: Reaction[]; // Add reactions to discussion
}

interface Reaction {
  type: 'like' | 'love' | 'haha' | 'wow';
  count: number;
  reactedByMe: boolean; // Indicates if the current user has reacted with this type
}

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
  reactions: Reaction[]; // Add reactions to reply
}

export const DiscussionDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user, isAdmin, isAuthenticated } = useAuth();
  const [discussion, setDiscussion] = useState<Discussion | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [newReplyContent, setNewReplyContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userDiscussionReaction, setUserDiscussionReaction] = useState<Reaction['type'] | null>(null); // Track user's current reaction for the discussion
  const [userReplyReactions, setUserReplyReactions] = useState<Record<number, Reaction['type'] | null>>({}); // Track user's current reaction for each reply

  const reactionTypes = {
    like: ThumbsUp,
    love: Heart,
    haha: Laugh,
    wow: Zap,
  };

  const reactionColors: Record<Reaction['type'], string> = {
    like: 'text-blue-500',
    love: 'text-red-500',
    haha: 'text-yellow-500',
    wow: 'text-purple-500',
  };

  // If ID is missing, display an error immediately
  if (!id) {
    return <p className="text-center text-red-500 pt-20">Error: Discussion ID is missing.</p>;
  }

  const fetchDiscussionAndReplies = useCallback(async (shouldIncrementView: boolean = false) => {
    setLoading(true);
    setError(null);

    let actualShouldIncrementView = shouldIncrementView;

    // Client-side view tracking using sessionStorage
    if (shouldIncrementView) {
      const SESSION_STORAGE_KEY = 'discussion_views';
      const viewedDiscussions = JSON.parse(sessionStorage.getItem(SESSION_STORAGE_KEY) || '{}');
      const hasViewed = viewedDiscussions[id];

      if (hasViewed) {
        actualShouldIncrementView = false; // Already viewed in this session, do not increment again
      } else {
        // Mark as viewed for this session
        viewedDiscussions[id] = true;
        sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(viewedDiscussions));
      }
    }

    try {
      const queryParams = new URLSearchParams();
      if (actualShouldIncrementView) { // Use the actualShouldIncrementView flag
        queryParams.append('incrementView', 'true');
      }
      if (user?.id) { // Pass userId if authenticated
        queryParams.append('userId', user.id.toString());
      }
      
      const queryString = queryParams.toString();
      const urlPath = `/api/discussions/${id}${queryString ? `?${queryString}` : ''}`;
      
      const response = await api.get(urlPath); // Use api.get with the corrected relative path
      const data = response.data;
      if (!data || !data.discussion) {
        throw new Error('Invalid discussion data received from server.');
      }
      setDiscussion(data.discussion);
      setReplies(data.replies || []); // Ensure replies is an array, even if empty or null from API

      // Initialize user's discussion reaction
      if (data.discussion && user?.id) {
        const currentUserReaction = data.discussion.reactions?.find((r: Reaction) => r.reactedByMe);
        setUserDiscussionReaction(currentUserReaction ? currentUserReaction.type : null);
      }

      // Initialize user's reply reactions
      if (data.replies && user?.id) {
        const initialReplyReactions: Record<number, Reaction['type'] | null> = {};
        data.replies.forEach((reply: Reply) => {
          const currentUserReaction = reply.reactions?.find((r: Reaction) => r.reactedByMe);
          initialReplyReactions[reply.id] = currentUserReaction ? currentUserReaction.type : null;
        });
        setUserReplyReactions(initialReplyReactions);
      }

    } catch (err: any) {
      console.error("Error fetching discussion and replies:", err); // Log error for debugging
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id, user?.id]); // Added user.id to dependency array to re-fetch if user logs in/out

  useEffect(() => {
    fetchDiscussionAndReplies(true); // Call with true on initial mount to increment view
  }, [fetchDiscussionAndReplies]);

  const handlePostReply = async () => {
    if (!newReplyContent.trim() || !user?.id) {
      setError('Reply content cannot be empty.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await api.post(`/api/discussions/${id}/replies`, {
        content: newReplyContent,
        createdBy: user.id,
        parentId: null, // For now, all replies are top-level. Nested replies can be added later.
      });

      setNewReplyContent('');
      fetchDiscussionAndReplies(); // Refresh the list of replies
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDiscussion = async () => {
    if (!isAdmin || !discussion?.id) return;

    if (!window.confirm('Are you sure you want to delete this discussion topic and all its replies?')) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await api.delete(`/api/admin/discussions/${discussion.id}`);
      // Redirect to forum page after deletion
      window.location.href = '/forum';
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteReply = async (replyId: number) => {
    if (!isAdmin) return;

    if (!window.confirm('Are you sure you want to delete this reply?')) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await api.delete(`/api/admin/replies/${replyId}`);
      fetchDiscussionAndReplies(); // Refresh replies
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReaction = async (targetType: 'discussion' | 'reply', targetId: number, reactionType: Reaction['type']) => {
    if (!user?.id) {
      setError('You must be logged in to react.');
      return;
    }

    try {
      const endpoint = targetType === 'discussion' ? 'discussions' : 'replies';
      const response = await api.post(`/api/${endpoint}/${targetId}/react`, {
        userId: user.id,
        reactionType,
      });

      // Optimistically update UI
      if (targetType === 'discussion') {
        setUserDiscussionReaction(prev => (prev === reactionType ? null : reactionType));
      } else {
        setUserReplyReactions(prev => ({
          ...prev,
          [targetId]: prev[targetId] === reactionType ? null : reactionType,
        }));
      }

      fetchDiscussionAndReplies(); // Refresh to show updated reactions and counts
    } catch (err: any) {
      console.error("Error toggling reaction:", err);
      setError(err.message);
    }
  };

  if (loading && !discussion) {
    return <p className="text-center text-gray-600 pt-20">Loading discussion...</p>;
  }

  if (error) {
    return <p className="text-center text-red-500 pt-20">Error: {error}</p>;
  }

  if (!discussion) {
    return <p className="text-center text-gray-600 pt-20">Discussion not found.</p>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-100 py-12 px-4 sm:px-6 lg:px-8 pt-20">
      <div className="max-w-7xl mx-auto">
        <Link to="/dashboard/forum" className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors mb-6 font-medium">
          <ArrowLeft size={20} className="mr-2" /> Back to Forum
        </Link>

        <Card className="mb-8 p-6 shadow-lg border border-gray-200 bg-white/80 backdrop-blur-sm">
        <div className="flex justify-between items-start mb-4">
          <h1 className="text-3xl font-bold text-gray-900">{discussion.title}</h1>
          {isAdmin && (
            <Button variant="danger" onClick={handleDeleteDiscussion} disabled={loading} className="flex items-center space-x-2">
              <Trash2 size={18} />
              <span>Delete Topic</span>
            </Button>
          )}
        </div>
        <div className="flex items-center text-gray-600 text-sm mb-4">
          <UserIcon size={16} className="mr-2" />
          <span>{discussion.createdByUsername}</span>
          <span className="mx-2">•</span>
          <span>{new Date(discussion.createdAt).toLocaleDateString()}</span>
          <span className="mx-2">•</span>
          <Eye size={16} className="mr-2" /> {/* Ensure Eye icon is correctly rendered */}
          <span>{discussion.viewCount} views</span>
        </div>
        <p className="text-gray-800 leading-relaxed mb-6">{discussion.content}</p>
        <div className="flex items-center justify-between text-gray-600 text-sm mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center space-x-4">
            <span className="flex items-center space-x-1">
              <MessageSquare size={16} className="mr-2" />
              <span>{discussion.replyCount} replies</span>
            </span>
            {isAuthenticated && (
              <div className="flex space-x-2">
                {Object.entries(reactionTypes).map(([type, Icon]) => {
                  const reaction = discussion.reactions?.find(r => r.type === type as Reaction['type']);
                  const count = reaction?.count || 0;
                  const isSelected = userDiscussionReaction === (type as Reaction['type']);
                  return (
                    <Button
                      key={type}
                      variant="ghost"
                      size="sm"
                      onClick={() => handleReaction('discussion', discussion.id, type as Reaction['type'])}
                      className={`flex items-center space-x-1 transition-all duration-200 hover:scale-110 active:scale-90 
                                  ${isSelected ? `${reactionColors[type as Reaction['type']]} bg-opacity-20` : 'text-gray-500 hover:bg-gray-100'}
                                  ${reactionColors[type as Reaction['type']]}
                                  `}
                      style={{ backgroundColor: isSelected ? `${reactionColors[type as Reaction['type']].replace('text-', 'bg-')}1A` : '' }} // Dynamic background for selected
                    >
                      <Icon size={16} />
                      <span>{count > 0 ? count : ''}</span>
                    </Button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </Card>

      <h2 className="text-2xl font-bold text-gray-900 mb-6">Replies</h2>

      {isAuthenticated && (
        <Card className="mb-8 p-6 shadow-md border border-gray-200">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Post a Reply</h3>
          {error && <p className="text-red-500 mb-4">{error}</p>}
          <Textarea
            value={newReplyContent}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewReplyContent(e.target.value)}
            placeholder="Write your reply here..."
            rows={4}
            className="mb-4"
          />
          <div className="flex justify-end">
            <Button 
              onClick={handlePostReply} 
              disabled={loading || !newReplyContent.trim()}
              className="bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 text-white flex items-center space-x-2"
            >
              <Send size={18} />
              <span>Post Reply</span>
            </Button>
          </div>
        </Card>
      )}

      <div className="space-y-4">
        {replies.length === 0 ? (
          <p className="text-gray-600 text-center">No replies yet. Be the first to respond!</p>
        ) : (
          replies.map((reply) => (
            <Card key={reply.id} className="p-4 shadow-sm border border-gray-100">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center text-gray-700 text-sm">
                  <UserIcon size={14} className="mr-2" />
                  <span className="font-semibold">{reply.createdByUsername}</span>
                  <span className="mx-2 text-gray-400">•</span>
                  <span className="text-gray-500">{new Date(reply.createdAt).toLocaleString()}</span>
                </div>
                {isAdmin && (
                  <Button variant="ghost" size="sm" onClick={() => handleDeleteReply(reply.id)} disabled={loading} className="text-red-500 hover:bg-red-50">
                    <Trash2 size={16} />
                  </Button>
                )}
              </div>
              <p className="text-gray-800 leading-relaxed mb-4">
                {reply.isDeleted ? <em className="text-gray-500">This reply has been deleted.</em> : reply.content}
              </p>
              {isAuthenticated && !reply.isDeleted && (
                <div className="flex space-x-2 mt-2">
                  {Object.entries(reactionTypes).map(([type, Icon]) => {
                    const reaction = reply.reactions?.find(r => r.type === type as Reaction['type']);
                    const count = reaction?.count || 0;
                    const isSelected = userReplyReactions[reply.id] === (type as Reaction['type']);
                    return (
                      <Button
                        key={type}
                        variant="ghost"
                        size="sm"
                        onClick={() => handleReaction('reply', reply.id, type as Reaction['type'])}
                        className={`flex items-center space-x-1 transition-all duration-200 hover:scale-110 active:scale-90 
                                    ${isSelected ? `${reactionColors[type as Reaction['type']]} bg-opacity-20` : 'text-gray-500 hover:bg-gray-100'}
                                    ${reactionColors[type as Reaction['type']]}
                                    `}
                        style={{ backgroundColor: isSelected ? `${reactionColors[type as Reaction['type']].replace('text-', 'bg-')}1A` : '' }} // Dynamic background for selected
                      >
                        <Icon size={14} />
                        <span>{count > 0 ? count : ''}</span>
                      </Button>
                    );
                  })}
                </div>
              )}
            </Card>
          ))
        )}
        </div>
      </div>
    </div>
  );
};
