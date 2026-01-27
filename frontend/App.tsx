
import React, { useState, useEffect, useMemo, useRef } from 'react';
import IdeaInput from './components/idea-input/IdeaInput';
import IdeaCard from './components/idea-card/IdeaCard';
import AuthScreen from './components/auth/AuthScreen';
import AdminDashboard from './components/admin/AdminDashboard';
import { Idea, User, ViewMode, MainTab, Comment, SharePermission } from './types';

import { analyzeIdea, getIdeas, toggleShare, deleteIdea, addComment, addReply, toggleCommentLike, updateIdea, updateShareLink } from './services/geminiService';

const ImageSlideshow: React.FC<{ images: string[] }> = ({ images }) => {
  const [index, setIndex] = useState(0);

  if (!images || images.length === 0) return null;

  const next = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIndex((prev) => (prev + 1) % images.length);
  };
  const prev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <div className="relative rounded-[2rem] overflow-hidden border border-slate-800 shadow-2xl bg-slate-900 group aspect-video flex items-center justify-center">
      <img
        src={images[index]}
        alt={`Image ${index + 1}`}
        className="max-w-full max-h-full object-contain transition-all duration-500"
      />
      {images.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-4 w-12 h-12 flex items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60 transition-all opacity-0 group-hover:opacity-100"
          >
            <i className="fas fa-chevron-left"></i>
          </button>
          <button
            onClick={next}
            className="absolute right-4 w-12 h-12 flex items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60 transition-all opacity-0 group-hover:opacity-100"
          >
            <i className="fas fa-chevron-right"></i>
          </button>
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-black/40 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-widest border border-white/10">
            {index + 1} / {images.length}
          </div>
        </>
      )}
    </div>
  );
};

interface CommentItemProps {
  comment: Comment;
  depth: number;
  currentUserId: string;
  replyingTo: string | null;
  setReplyingTo: (id: string | null) => void;
  replyText: string;
  setReplyText: (val: string) => void;
  onToggleLike: (id: string) => void;
  onAddReply: (e: React.FormEvent, id: string) => void;
}

const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  depth,
  currentUserId,
  replyingTo,
  setReplyingTo,
  replyText,
  setReplyText,
  onToggleLike,
  onAddReply
}) => {
  const [showAllReplies, setShowAllReplies] = useState(false);
  const hasLiked = comment.likes?.includes(currentUserId);

  let indentationClass = '';
  if (depth === 0) {
    indentationClass = 'p-5 bg-slate-900/40 rounded-2xl border border-slate-800/50';
  } else if (depth <= 2) {
    indentationClass = 'ml-8 border-l-2 border-slate-800 pl-4 mt-4';
  } else {
    indentationClass = 'mt-4 border-t border-slate-800/10 pt-4';
  }

  const hasReplies = comment.replies && comment.replies.length > 0;
  const displayReplies = showAllReplies ? comment.replies : (comment.replies?.slice(0, 2) || []);
  const hiddenCount = (comment.replies?.length || 0) - 2;

  return (
    <div className={`${indentationClass} animate-in slide-in-from-top-2 duration-300 mb-4 last:mb-0`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-full bg-[#fd7912]/20 border border-[#fd7912]/20 flex items-center justify-center text-[10px] font-bold text-[#fd7912]">
            {comment.userName.substring(0, 2).toUpperCase()}
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-slate-200">{comment.userName}</span>
            <span className="text-[9px] text-[#fd7912] uppercase font-black tracking-widest">{comment.userDepartment}</span>
          </div>
        </div>
        <span className="text-[10px] text-slate-600">
          {new Date(comment.createdAt).toLocaleDateString()}
        </span>
      </div>

      <p className="text-sm text-slate-300 leading-relaxed mb-3">{comment.text}</p>

      <div className="flex items-center space-x-4">
        <button
          onClick={() => onToggleLike(comment.id)}
          className={`flex items-center space-x-1.5 text-[11px] font-bold transition-colors ${hasLiked ? 'text-rose-400' : 'text-slate-500 hover:text-slate-300'}`}
        >
          <i className={`${hasLiked ? 'fas' : 'far'} fa-heart`}></i>
          <span>{comment.likes?.length || 0}</span>
        </button>

        <button
          onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
          className="text-[11px] font-bold text-slate-500 hover:text-[#fd7912] transition-colors"
        >
          <i className="far fa-comment-dots mr-1.5"></i>
          Reply
        </button>
      </div>

      {replyingTo === comment.id && (
        <form onSubmit={(e) => onAddReply(e, comment.id)} className="mt-4">
          <div className="relative">
            <input
              autoFocus
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Write a reply..."
              className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#fd7912]/50"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[#fd7912] hover:text-[#fd7912]/80 font-bold text-[10px]"
            >
              Send
            </button>
          </div>
        </form>
      )}

      {hasReplies && (
        <div className="mt-2">
          {displayReplies.map(reply => (
            <CommentItem
              key={reply.id}
              comment={reply}
              depth={depth + 1}
              currentUserId={currentUserId}
              replyingTo={replyingTo}
              setReplyingTo={setReplyingTo}
              replyText={replyText}
              setReplyText={setReplyText}
              onToggleLike={onToggleLike}
              onAddReply={onAddReply}
            />
          ))}

          {hiddenCount > 0 && !showAllReplies && (
            <button
              onClick={() => setShowAllReplies(true)}
              className="mt-3 text-[11px] font-bold text-[#fd7912] hover:text-[#fd7912]/80 flex items-center space-x-2 px-2 py-1 rounded hover:bg-[#fd7912]/5 transition-all"
            >
              <i className="fas fa-chevron-down mr-1"></i>
              <span>Show {hiddenCount} more replies</span>
            </button>
          )}

          {showAllReplies && comment.replies && comment.replies.length > 2 && (
            <button
              onClick={() => setShowAllReplies(false)}
              className="mt-3 text-[11px] font-bold text-slate-500 hover:text-slate-400 flex items-center space-x-2 px-2 py-1 rounded hover:bg-slate-800/50 transition-all"
            >
              <i className="fas fa-chevron-up mr-1"></i>
              <span>Hide replies</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [activeTab, setActiveTab] = useState<MainTab>('workspace');
  const [previewIdea, setPreviewIdea] = useState<Idea | null>(null);
  const [commentText, setCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [showAllRootComments, setShowAllRootComments] = useState(false);

  // Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [editImages, setEditImages] = useState<string[]>([]);
  const editEditorRef = useRef<HTMLDivElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  // Sharing State
  const [isSharePopoverOpen, setIsSharePopoverOpen] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);



  // ... (in useEffect)

  // 1. Initial Load Effect (Run ONCE)
  useEffect(() => {
    // Legacy: Clear old local storage to stop confusion
    localStorage.removeItem('workflow_ideas_v3');

    const savedUserStr = localStorage.getItem('workflow_user');
    if (savedUserStr) {
      try {
        const user = JSON.parse(savedUserStr);
        // Only set if actually different to avoid trivial re-renders
        setCurrentUser(user);
      } catch (e) { console.error(e); }
    }

    // Check for shareable link in URL
    const urlParams = new URLSearchParams(window.location.search);
    const sId = urlParams.get('shareId');
    if (sId) {
      (window as any)._pendingShareId = sId; // Stashing globally for the fetch effect
    }
  }, []);

  // 2. Data Fetching Effect (Run when currentUser changes)
  useEffect(() => {
    const fetchIdeas = async () => {
      if (currentUser) {
        const remoteIdeas = await getIdeas();
        const mappedIdeas: Idea[] = remoteIdeas.map((analysis: any, index) => ({
          id: analysis.id || analysis._id || Date.now().toString() + index,
          userId: analysis.userId || currentUser.id,
          authorName: analysis.authorName || currentUser.name,
          authorDepartment: analysis.authorDepartment || currentUser.department,
          isShared: analysis.isShared || false,
          type: analysis.image_urls && analysis.image_urls.length > 0 ? 'image' : 'text',
          content: analysis.content || "Fetched content",
          imageDatas: analysis.image_urls,
          title: analysis.title,
          category: analysis.category,
          tags: analysis.tags,
          createdAt: analysis.createdAt || Date.now(),
          connections: [],
          comments: analysis.comments || [],
          shareLinkId: analysis.shareLinkId,
          sharePermission: analysis.sharePermission as SharePermission | undefined
        }));
        // Only update if ideas actually changed (deep check hard, but length check simple)
        setIdeas(mappedIdeas);

        const pendingId = (window as any)._pendingShareId;
        if (pendingId) {
          const sharedIdea = mappedIdeas.find(i => i.shareLinkId === pendingId);
          if (sharedIdea) {
            setPreviewIdea(sharedIdea);

            // Google Sheets-style: Auto-open editor if user has edit access
            if (sharedIdea.userId === currentUser.id || sharedIdea.sharePermission === 'editor') {
              setIsEditing(true);
              setEditContent(sharedIdea.content);
              setEditImages(sharedIdea.imageDatas || []);
            }

            delete (window as any)._pendingShareId;

            // Optional: Clean up URL to keep it pretty
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        }
      }
    };

    fetchIdeas();
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('workflow_ideas_v3', JSON.stringify(ideas));
  }, [ideas]);

  const handleAuthSuccess = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('workflow_user', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('workflow_user');
  };

  const handleAddIdea = async (content: string, imageDatas?: string[]) => {
    if (!currentUser) return;
    setIsAnalyzing(true);
    try {
      if (!currentUser) return;

      const analysis = await analyzeIdea(content, imageDatas, currentUser);

      const newIdea: Idea = {
        id: analysis.id || Date.now().toString(),
        userId: analysis.userId || currentUser.id,
        authorName: analysis.authorName || currentUser.name,
        authorDepartment: analysis.authorDepartment || currentUser.department,
        isShared: analysis.isShared || false,
        type: imageDatas && imageDatas.length > 0 ? 'image' : 'text',
        content: analysis.content || content,
        imageDatas: analysis.image_urls || imageDatas, // Prefer URL from backend
        title: analysis.title,
        category: analysis.category,
        tags: analysis.tags,
        createdAt: analysis.createdAt || Date.now(),
        connections: [],
        comments: []
      };

      setIdeas(prev => [newIdea, ...prev]);
      setActiveTab('workspace');
    } catch (error) {
      console.error("Analysis failed", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDeleteIdea = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this idea?")) return;

    // Optimistic update
    setIdeas(prev => prev.filter(i => i.id !== id));
    if (previewIdea?.id === id) setPreviewIdea(null);

    try {
      await deleteIdea(id);
    } catch (error) {
      console.error("Failed to delete", error);
      // Could revert here if needed, but for now we trust the user won't mind refreshing if it fails
    }
  };

  const handleToggleShare = async (id: string) => {
    try {
      // Optimistic update
      setIdeas(prev => prev.map(i => {
        if (i.id === id && i.userId === currentUser?.id) {
          return { ...i, isShared: !i.isShared };
        }
        return i;
      }));

      // Call Backend
      await toggleShare(id);

      if (previewIdea?.id === id) {
        setPreviewIdea(prev => prev ? { ...prev, isShared: !prev.isShared } : null);
      }
    } catch (error) {
      console.error("Failed to share", error);
      // Revert optimistic update if needed, but for prototype we just log
    }
  };

  const handleGenerateShareLink = async () => {
    if (!previewIdea || !currentUser) return;
    const shareLinkId = Math.random().toString(36).substring(2, 15);
    const updatedIdea: Idea = {
      ...previewIdea,
      shareLinkId,
      sharePermission: 'viewer'
    };

    try {
      await updateShareLink(previewIdea.id, shareLinkId, 'viewer');
      setIdeas(prev => prev.map(i => i.id === previewIdea.id ? updatedIdea : i));
      setPreviewIdea(updatedIdea);
    } catch (error) {
      console.error("Failed to generate share link", error);
    }
  };

  const handleUpdateSharePermission = async (perm: SharePermission) => {
    if (!previewIdea) return;
    const updatedIdea: Idea = { ...previewIdea, sharePermission: perm };

    try {
      if (previewIdea.shareLinkId) {
        await updateShareLink(previewIdea.id, previewIdea.shareLinkId, perm);
      }
      setIdeas(prev => prev.map(i => i.id === previewIdea.id ? updatedIdea : i));
      setPreviewIdea(updatedIdea);
    } catch (error) {
      console.error("Failed to update share permission", error);
    }
  };

  const handleCopyShareLink = () => {
    if (!previewIdea?.shareLinkId) return;
    const url = `${window.location.origin}${window.location.pathname}?shareId=${previewIdea.shareLinkId}`;
    navigator.clipboard.writeText(url);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !previewIdea || !commentText.trim()) return;

    try {
      const newComment = await addComment(previewIdea.id, commentText.trim());

      const updatedIdea = {
        ...previewIdea,
        comments: [...(previewIdea.comments || []), newComment]
      };

      setIdeas(prev => prev.map(i => i.id === previewIdea.id ? updatedIdea : i));
      setPreviewIdea(updatedIdea);
      setCommentText('');
    } catch (error) {
      console.error("Failed to add comment", error);
    }
  };

  const handleToggleLike = async (commentId: string) => {
    if (!currentUser || !previewIdea) return;

    try {
      await toggleCommentLike(previewIdea.id, commentId);

      const toggleLikeRecursive = (comments: Comment[]): Comment[] => {
        return comments.map(c => {
          if (c.id === commentId) {
            const currentLikes = c.likes || [];
            const alreadyLiked = currentLikes.includes(currentUser.id);
            return {
              ...c,
              likes: alreadyLiked
                ? currentLikes.filter(id => id !== currentUser.id)
                : [...currentLikes, currentUser.id]
            };
          }
          if (c.replies && c.replies.length > 0) {
            return { ...c, replies: toggleLikeRecursive(c.replies) };
          }
          return c;
        });
      };

      const updatedComments = toggleLikeRecursive(previewIdea.comments || []);
      const updatedIdea = { ...previewIdea, comments: updatedComments };

      setIdeas(prev => prev.map(i => i.id === previewIdea.id ? updatedIdea : i));
      setPreviewIdea(updatedIdea);
    } catch (error) {
      console.error("Failed to toggle comment like", error);
    }
  };

  const handleAddReply = async (e: React.FormEvent, parentId: string) => {
    e.preventDefault();
    if (!currentUser || !previewIdea || !replyText.trim()) return;

    try {
      const newReply = await addReply(previewIdea.id, parentId, replyText.trim());

      const addReplyRecursive = (comments: Comment[]): Comment[] => {
        return comments.map(c => {
          if (c.id === parentId) {
            return { ...c, replies: [...(c.replies || []), newReply] };
          }
          if (c.replies && c.replies.length > 0) {
            return { ...c, replies: addReplyRecursive(c.replies) };
          }
          return c;
        });
      };

      const updatedComments = addReplyRecursive(previewIdea.comments || []);
      const updatedIdea = { ...previewIdea, comments: updatedComments };

      setIdeas(prev => prev.map(i => i.id === previewIdea.id ? updatedIdea : i));
      setPreviewIdea(updatedIdea);
      setReplyText('');
      setReplyingTo(null);
    } catch (error) {
      console.error("Failed to add reply", error);
    }
  };

  const visibleIdeas = useMemo(() => {
    if (!currentUser) return [];
    return ideas.filter(idea => {
      const isMine = idea.userId === currentUser.id;
      const isSharedWithMe = idea.isShared && idea.authorDepartment === currentUser.department;

      if (!isMine && !isSharedWithMe) return false;
      if (viewMode === 'mine' && !isMine) return false;
      if (viewMode === 'shared' && !isSharedWithMe) return false;

      const matchesSearch = idea.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        idea.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCat = !activeFilter || idea.category === activeFilter;

      return matchesSearch && matchesCat;
    });
  }, [ideas, currentUser, viewMode, searchQuery, activeFilter]);

  const dynamicCategories = useMemo(() => {
    const cats = Array.from(new Set(visibleIdeas.map(i => i.category)));
    return cats.sort();
  }, [visibleIdeas]);

  const rootComments = useMemo(() => {
    if (!previewIdea?.comments) return [];
    const reversed = [...previewIdea.comments].reverse();
    return showAllRootComments ? reversed : reversed.slice(0, 5);
  }, [previewIdea, showAllRootComments]);

  const hiddenRootCount = (previewIdea?.comments?.length || 0) - 5;

  const handleClosePreview = () => {
    setPreviewIdea(null);
    setReplyingTo(null);
    setShowAllRootComments(false);
    setIsEditing(false);
    setIsSharePopoverOpen(false);
  };

  const handleStartEdit = () => {
    if (!previewIdea) return;
    setIsEditing(true);
    setEditContent(previewIdea.content);
    setEditImages(previewIdea.imageDatas || []);
  };

  const handleSaveEdit = async () => {
    if (!previewIdea || !currentUser) return;
    setIsAnalyzing(true);
    try {
      const currentContent = editEditorRef.current?.innerHTML || editContent;
      const analysis = await analyzeIdea(currentContent, editImages);

      const updatedIdea: Idea = {
        ...previewIdea,
        content: currentContent,
        imageDatas: editImages.length > 0 ? editImages : undefined,
        title: analysis.title,
        category: analysis.category,
        tags: analysis.tags,
        type: editImages.length > 0 ? 'image' : 'text'
      };

      // Persist to DB
      await updateIdea(previewIdea.id, updatedIdea.content, updatedIdea.title, updatedIdea.category, updatedIdea.tags);

      setIdeas(prev => prev.map(i => i.id === previewIdea.id ? updatedIdea : i));
      setPreviewIdea(updatedIdea);
      setIsEditing(false);
    } catch (error) {
      console.error("Save edit failed", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAddEditImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const fileList = Array.from(e.target.files);
      fileList.forEach((file: File) => {
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onloadend = () => {
            setEditImages((prev) => [...prev, reader.result as string]);
          };
          reader.readAsDataURL(file);
        }
      });
    }
    if (editFileInputRef.current) editFileInputRef.current.value = '';
  };

  const canEdit = useMemo(() => {
    if (!currentUser || !previewIdea) return false;
    if (previewIdea.userId === currentUser.id) return true;
    if (previewIdea.sharePermission === 'editor') return true;
    return false;
  }, [currentUser, previewIdea]);

  if (!currentUser) {
    return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#0c1422]">
      {/* Top Navigation */}
      <nav className="glass shrink-0 z-50 px-6 py-4 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <img src="/ideabucket.png" alt="Idea Bucket Logo" className="w-16 h-16 object-contain group-hover:scale-105 transition-transform" />
          <h1 className="text-xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent hidden sm:block">
            Idea <span className="text-[#fd7912]">Bucket</span>
          </h1>
        </div>

        <div className="flex-1 max-w-md mx-8">
          <div className="relative">
            <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"></i>
            <input
              type="text"
              placeholder="Search ideas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900/50 border border-slate-700 rounded-full py-2 pl-12 pr-4 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#fd7912] transition-all"
            />
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex flex-col items-end mr-2 hidden sm:flex">
            <span className="text-xs font-bold text-white">{currentUser.name}</span>
            <span className="text-[10px] text-slate-500 font-medium">{currentUser.department}</span>
            <button onClick={handleLogout} className="text-[10px] text-slate-500 hover:text-red-400 mt-0.5">Logout</button>
          </div>
          <div className="w-10 h-10 rounded-full bg-[#fd7912]/20 border border-[#fd7912] flex items-center justify-center text-sm font-bold text-white shadow-lg shadow-[#fd7912]/20">
            {currentUser.name.substring(0, 2).toUpperCase()}
          </div>
        </div>
      </nav>

      <div className="flex flex-1 overflow-hidden">
        {/* Persistent Side Panel */}
        <aside className="w-72 glass border-r border-slate-800 shrink-0 hidden lg:flex flex-col overflow-y-auto overflow-x-hidden">
          <div className="p-6 space-y-8">
            <section>
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 px-2">Operations</h2>
              <ul className="space-y-1">
                <li>
                  <button
                    onClick={() => setActiveTab('capture')}
                    className={`w-full text-left px-4 py-3 rounded-xl transition-all text-sm font-bold flex items-center ${activeTab === 'capture' ? 'bg-[#fd7912] text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
                  >
                    <i className="fas fa-plus-circle mr-3 text-lg"></i> New Idea
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setActiveTab('workspace')}
                    className={`w-full text-left px-4 py-3 rounded-xl transition-all text-sm font-bold flex items-center ${activeTab === 'workspace' ? 'bg-[#fd7912] text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
                  >
                    <i className="fas fa-th-large mr-3 text-lg"></i> Idea Repository
                  </button>
                </li>
                {currentUser.userLevel === 1 && (
                  <li>
                    <button
                      onClick={() => setActiveTab('admin')}
                      className={`w-full text-left px-4 py-3 rounded-xl transition-all text-sm font-bold flex items-center ${activeTab === 'admin' ? 'bg-[#fd7912] text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
                    >
                      <i className="fas fa-users-cog mr-3"></i> User Management
                    </button>
                  </li>
                )}
              </ul>

            </section>

            {activeTab === 'workspace' && (
              <>
                <section className="pt-6 border-t border-slate-800/50">
                  <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 px-2">View Context</h2>
                  <ul className="space-y-1">
                    <li>
                      <button
                        onClick={() => setViewMode('all')}
                        className={`w-full text-left px-4 py-2 rounded-xl transition-all text-xs font-medium ${viewMode === 'all' ? 'text-[#fd7912] bg-[#fd7912]/10' : 'text-slate-400 hover:bg-slate-800'}`}
                      >
                        <i className="fas fa-globe mr-2 opacity-50"></i> All Insights
                      </button>
                    </li>
                    <li>
                      <button
                        onClick={() => setViewMode('mine')}
                        className={`w-full text-left px-4 py-2 rounded-xl transition-all text-xs font-medium ${viewMode === 'mine' ? 'text-[#fd7912] bg-[#fd7912]/10' : 'text-slate-400 hover:bg-slate-800'}`}
                      >
                        <i className="fas fa-user mr-2 opacity-50"></i> My Ideas
                      </button>
                    </li>
                    <li>
                      <button
                        onClick={() => setViewMode('shared')}
                        className={`w-full text-left px-4 py-2 rounded-xl transition-all text-xs font-medium ${viewMode === 'shared' ? 'text-[#fd7912] bg-[#fd7912]/10' : 'text-slate-400 hover:bg-slate-800'}`}
                      >
                        <i className="fas fa-users mr-2 opacity-50"></i> Shared with Me
                      </button>
                    </li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 px-2 flex justify-between items-center">
                    <span>Categories</span>
                    {activeFilter && (
                      <button onClick={() => setActiveFilter(null)} className="text-[#fd7912] text-[10px] hover:underline">Clear</button>
                    )}
                  </h2>
                  <ul className="space-y-1 max-h-[300px] overflow-y-auto pr-2 scrollbar-preview">
                    {dynamicCategories.length === 0 ? (
                      <li className="px-4 py-2 text-slate-600 text-[11px] italic">No categories yet.</li>
                    ) : (
                      dynamicCategories.map(cat => (
                        <li key={cat}>
                          <button
                            onClick={() => setActiveFilter(cat)}
                            className={`w-full text-left px-3 py-1.5 rounded-lg transition-all text-[11px] font-medium truncate ${activeFilter === cat ? 'bg-[#fd7912]/10 text-[#fd7912] border border-[#fd7912]/30' : 'text-slate-500 hover:bg-slate-800 hover:text-slate-300'}`}
                          >
                            <i className="fas fa-hashtag mr-2 opacity-30"></i>
                            {cat}
                          </button>
                        </li>
                      ))
                    )}
                  </ul>
                </section>
              </>
            )}

            <section className="pt-6 border-t border-slate-800/50">
              <div className="p-4 rounded-2xl bg-[#fd7912]/5 border border-[#fd7912]/10">
                <h3 className="text-sm font-bold text-[#fd7912] mb-2 flex items-center">
                  <i className="fas fa-robot mr-2"></i> Content Analyst
                </h3>
                <div className="flex items-center space-x-2 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                  <span>Gemini Intelligence</span>
                </div>
              </div>
            </section>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-8 lg:p-12">
          {activeTab === 'capture' ? (
            <div className="max-w-3xl mx-auto py-8 animate-in fade-in duration-300">
              <div className="mb-8">
                <h2 className="text-3xl font-black text-white mb-2 tracking-tight">Capture Insight</h2>
                <p className="text-slate-400 font-medium">Capture text or images. Gemini will automatically organize and contextualize them for you.</p>
              </div>
              <IdeaInput onAdd={handleAddIdea} isAnalyzing={isAnalyzing} />

              {ideas.length > 0 && (
                <div className="mt-12">
                  <h3 className="text-xs font-black text-slate-600 uppercase tracking-widest mb-6 flex items-center">
                    <div className="w-8 h-px bg-slate-800 mr-3"></div>
                    Latest Workspace Additions
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {ideas.slice(0, 2).map(idea => (
                      <div key={idea.id} className="glass p-5 rounded-2xl border-slate-800/50 opacity-60 hover:opacity-100 transition-opacity cursor-pointer" onClick={() => { setPreviewIdea(idea); setActiveTab('workspace'); }}>
                        <h4 className="text-sm font-bold text-slate-300 truncate">{idea.title}</h4>
                        <div className="flex items-center mt-2 space-x-2">
                          <span className="text-[10px] text-[#fd7912] font-black uppercase tracking-wider">{idea.category}</span>
                          <span className="text-[10px] text-slate-600">•</span>
                          <span className="text-[10px] text-slate-500">{new Date(idea.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : activeTab === 'admin' ? (
            <AdminDashboard />
          ) : (

            <div className="animate-in fade-in duration-500">
              <div className="mb-8 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black text-slate-200 capitalize flex items-center tracking-tight">
                    <i className="fas fa-database mr-4 text-[#fd7912]"></i>
                    {viewMode === 'all' ? 'Knowledge Hub' : viewMode === 'mine' ? 'My Desk' : 'Team Library'}
                  </h2>
                  <p className="text-slate-500 text-sm mt-1 font-medium">Viewing {visibleIdeas.length} curated {visibleIdeas.length === 1 ? 'item' : 'items'} in your active workspace.</p>
                </div>
              </div>

              {visibleIdeas.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
                  {visibleIdeas.map(idea => (
                    <IdeaCard
                      key={idea.id}
                      idea={idea}
                      currentUserId={currentUser.id}
                      onDelete={handleDeleteIdea}
                      onToggleShare={handleToggleShare}
                      onPreview={setPreviewIdea}
                    />
                  ))}
                </div>
              ) : (
                <div className="glass rounded-[3rem] p-24 text-center border-dashed border-slate-800 bg-slate-900/20">
                  <div className="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
                    <i className="fas fa-lightbulb text-slate-600 text-4xl"></i>
                  </div>
                  <h3 className="text-2xl font-black text-slate-300 mb-3 tracking-tight">Workspace is empty</h3>
                  <p className="text-slate-500 max-w-sm mx-auto text-sm leading-relaxed">
                    Start by capturing a new idea, screenshot, or text snippet. Our AI will handle the organization.
                  </p>
                  <button
                    onClick={() => setActiveTab('capture')}
                    className="mt-10 px-10 py-3.5 bg-[#fd7912] text-white text-sm font-black rounded-2xl hover:bg-[#fd7912]/80 transition-all transform hover:-translate-y-0.5"
                  >
                    Capture First Insight
                  </button>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {previewIdea && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8"
          onClick={handleClosePreview}
        >
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md transition-opacity animate-in fade-in duration-300"></div>

          <div
            className="glass relative w-full max-w-7xl max-h-[92vh] overflow-y-auto scrollbar-preview rounded-[2.5rem] shadow-2xl border border-white/10 animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-8 border-b border-slate-800 sticky top-0 bg-slate-900/95 backdrop-blur-xl z-10">
              <div className="flex items-center space-x-4">
                <span className="text-[11px] uppercase tracking-[0.2em] font-black px-3 py-1.5 rounded-lg bg-[#fd7912]/10 text-[#fd7912] border border-[#fd7912]/20">
                  {previewIdea.category}
                </span>
                {previewIdea.isShared ? (
                  <span className="text-[11px] uppercase tracking-[0.2em] font-black px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    Shared with {previewIdea.authorDepartment}
                  </span>
                ) : (
                  <span className="text-[11px] uppercase tracking-[0.2em] font-black px-3 py-1.5 rounded-lg bg-slate-500/10 text-slate-400 border border-slate-500/20">
                    Private
                  </span>
                )}
                {(previewIdea.userId === currentUser.id || previewIdea.sharePermission === 'editor') && (
                  <span className="text-[11px] uppercase tracking-[0.2em] font-black px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Edit Access
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2">
                {previewIdea.userId === currentUser.id && (
                  <div className="relative">
                    <button
                      onClick={() => setIsSharePopoverOpen(!isSharePopoverOpen)}
                      className="w-12 h-12 flex items-center justify-center rounded-full hover:bg-slate-800 text-slate-400 hover:text-emerald-400 transition-all"
                      title="Link Sharing"
                    >
                      <i className="fas fa-link text-xl"></i>
                    </button>
                    {isSharePopoverOpen && (
                      <div className="absolute right-0 top-14 w-64 glass p-6 rounded-2xl border border-white/10 shadow-2xl z-20 animate-in slide-in-from-top-2 duration-200">
                        <h4 className="text-xs font-black uppercase text-slate-500 mb-4 tracking-widest">Link Sharing</h4>
                        {!previewIdea.shareLinkId ? (
                          <button
                            onClick={handleGenerateShareLink}
                            className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black uppercase rounded-lg transition-all"
                          >
                            Generate Link
                          </button>
                        ) : (
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <label className="text-[9px] font-black uppercase text-slate-600">Permission</label>
                              <div className="flex rounded-lg bg-slate-950 p-1 border border-slate-800">
                                <button
                                  onClick={() => handleUpdateSharePermission('viewer')}
                                  className={`flex-1 py-1 text-[9px] font-black uppercase rounded ${previewIdea.sharePermission === 'viewer' ? 'bg-slate-800 text-emerald-400' : 'text-slate-500'}`}
                                >
                                  Viewer
                                </button>
                                <button
                                  onClick={() => handleUpdateSharePermission('editor')}
                                  className={`flex-1 py-1 text-[9px] font-black uppercase rounded ${previewIdea.sharePermission === 'editor' ? 'bg-slate-800 text-emerald-400' : 'text-slate-500'}`}
                                >
                                  Editor
                                </button>
                              </div>
                            </div>
                            <button
                              onClick={handleCopyShareLink}
                              className={`w-full py-2 text-[10px] font-black uppercase rounded-lg transition-all flex items-center justify-center space-x-2 ${linkCopied ? 'bg-emerald-500 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'}`}
                            >
                              {linkCopied ? (
                                <><i className="fas fa-check"></i> <span>Copied!</span></>
                              ) : (
                                <><i className="far fa-copy"></i> <span>Copy Link</span></>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
                {canEdit && !isEditing && (
                  <button
                    onClick={handleStartEdit}
                    className="w-12 h-12 flex items-center justify-center rounded-full hover:bg-slate-800 text-slate-400 hover:text-[#fd7912] transition-all"
                  >
                    <i className="fas fa-edit text-xl"></i>
                  </button>
                )}
                <button
                  onClick={handleClosePreview}
                  className="w-12 h-12 flex items-center justify-center rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-all transform hover:rotate-90"
                >
                  <i className="fas fa-times text-2xl"></i>
                </button>
              </div>
            </div>

            <div className="flex-1 p-8 sm:p-14 space-y-12">
              <div className="space-y-6">
                <h1 className="text-4xl sm:text-6xl font-black text-white leading-tight tracking-tight">
                  {previewIdea.title}
                </h1>
                <div className="flex items-center space-x-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-sm font-bold text-slate-300">
                      {previewIdea.authorName.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-base text-slate-200 font-semibold">{previewIdea.authorName}</span>
                      <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest">{previewIdea.authorDepartment}</span>
                    </div>
                  </div>
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-700"></div>
                  <span className="text-base text-slate-500">
                    {new Date(previewIdea.createdAt).toLocaleDateString(undefined, { dateStyle: 'full' })}
                  </span>
                </div>
              </div>

              <div className="flex flex-col space-y-8">
                <div className="space-y-3">
                  <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-2">Images</h3>
                  {isEditing ? (
                    <div className="space-y-4">
                      <div className="flex flex-wrap gap-4">
                        {editImages.map((src, idx) => (
                          <div key={idx} className="relative group w-32 h-32">
                            <img src={src} className="rounded-xl object-cover w-full h-full border border-slate-700" />
                            <button
                              onClick={() => setEditImages(prev => prev.filter((_, i) => i !== idx))}
                              className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white shadow-xl opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <i className="fas fa-trash-alt text-xs"></i>
                            </button>
                          </div>
                        ))}
                        <button
                          onClick={() => editFileInputRef.current?.click()}
                          className="w-32 h-32 rounded-xl border-2 border-dashed border-slate-700 flex flex-col items-center justify-center text-slate-600 hover:text-[#fd7912] hover:border-[#fd7912] transition-all"
                        >
                          <i className="fas fa-plus mb-2"></i>
                          <span className="text-[10px] font-bold uppercase tracking-widest">Add Image</span>
                        </button>
                        <input type="file" multiple accept="image/*" ref={editFileInputRef} onChange={handleAddEditImage} className="hidden" />
                      </div>
                    </div>
                  ) : (
                    <ImageSlideshow images={previewIdea.imageDatas || []} />
                  )}
                </div>

                <div className="space-y-3">
                  <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-2">Content</h3>
                  <div className="w-full p-8 rounded-[2rem] bg-slate-900/50 border border-slate-800/50 hover:border-slate-700 transition-colors">
                    {isEditing ? (
                      <div className="space-y-4">
                        <div className="flex items-center space-x-1 p-2 bg-slate-950/80 rounded-t-xl border border-slate-800">
                          <button onClick={() => document.execCommand('bold')} className="w-8 h-8 rounded hover:bg-slate-700 text-slate-300 transition-colors"><i className="fas fa-bold"></i></button>
                          <button onClick={() => document.execCommand('italic')} className="w-8 h-8 rounded hover:bg-slate-700 text-slate-300 transition-colors"><i className="fas fa-italic"></i></button>
                          <button onClick={() => document.execCommand('formatBlock', false, 'h2')} className="w-8 h-8 rounded hover:bg-slate-700 text-slate-300 transition-colors font-bold">H</button>
                          <button onClick={() => document.execCommand('insertUnorderedList')} className="w-8 h-8 rounded hover:bg-slate-700 text-slate-300 transition-colors"><i className="fas fa-list-ul"></i></button>
                        </div>
                        <div
                          ref={editEditorRef}
                          contentEditable
                          dangerouslySetInnerHTML={{ __html: editContent }}
                          className="w-full bg-slate-950 p-6 min-h-[300px] text-slate-100 outline-none border-x border-b border-slate-800 rounded-b-xl focus:ring-1 focus:ring-[#fd7912]/30"
                        />
                      </div>
                    ) : (
                      <div
                        className="prose prose-invert max-w-none text-slate-200 leading-relaxed text-base xl:text-lg font-normal preview-content"
                        dangerouslySetInnerHTML={{ __html: previewIdea.content || (previewIdea.imageDatas && previewIdea.imageDatas.length > 0 ? "Visual inputs captured." : "No text description.") }}
                      />
                    )}
                  </div>
                </div>

                {!isEditing && (
                  <>
                    <div className="space-y-3">
                      <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-2">Metadata & Tags</h3>
                      <div className="w-full p-8 bg-slate-800/20 rounded-[2rem] border border-slate-700/30 hover:border-slate-600 transition-colors">
                        <div className="flex flex-wrap gap-3">
                          {previewIdea.tags.map(tag => (
                            <span key={tag} className="px-5 py-2.5 bg-slate-800 text-slate-400 rounded-xl text-[11px] font-bold border border-slate-700/50 shadow-sm uppercase tracking-wider">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-2">Team Insights</h3>
                      <div className="w-full p-8 glass rounded-[2rem] border border-slate-800/50">
                        {(previewIdea.userId === currentUser.id || (previewIdea.isShared && previewIdea.authorDepartment === currentUser.department) || previewIdea.sharePermission === 'editor') ? (
                          <form onSubmit={handleAddComment} className="mb-8">
                            <div className="relative group">
                              <textarea
                                value={commentText}
                                onChange={(e) => setCommentText(e.target.value)}
                                placeholder="Add a thought..."
                                className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl p-4 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#fd7912]/50 transition-all resize-none min-h-[100px]"
                                required
                              />
                              <button
                                type="submit"
                                disabled={!commentText.trim()}
                                className="absolute bottom-3 right-3 px-6 py-2 bg-[#fd7912] hover:bg-[#fd7912]/80 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-[#fd7912]/20 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Post Comment
                              </button>
                            </div>
                          </form>
                        ) : (
                          <p className="text-slate-500 text-xs mb-8 italic">Public link viewer mode. Collaboration is disabled unless granted editor rights.</p>
                        )}

                        <div className="space-y-2">
                          {previewIdea.comments && previewIdea.comments.length > 0 ? (
                            <>
                              {rootComments.map(comment => (
                                <CommentItem
                                  key={comment.id}
                                  comment={comment}
                                  depth={0}
                                  currentUserId={currentUser.id}
                                  replyingTo={replyingTo}
                                  setReplyingTo={setReplyingTo}
                                  replyText={replyText}
                                  setReplyText={setReplyText}
                                  onToggleLike={handleToggleLike}
                                  onAddReply={handleAddReply}
                                />
                              ))}

                              {hiddenRootCount > 0 && !showAllRootComments && (
                                <button
                                  onClick={() => setShowAllRootComments(true)}
                                  className="mt-4 w-full py-3 rounded-2xl border border-slate-800 bg-slate-900/40 text-xs font-bold text-[#fd7912] hover:bg-slate-800 transition-all flex items-center justify-center space-x-2"
                                >
                                  <i className="fas fa-chevron-down"></i>
                                  <span>Show {hiddenRootCount} more root comments</span>
                                </button>
                              )}
                            </>
                          ) : (
                            <div className="text-center py-8">
                              <i className="fas fa-comments text-slate-800 text-3xl mb-3"></i>
                              <p className="text-slate-600 text-xs">No insights shared yet. Be the first to comment!</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="p-8 border-t border-slate-800 flex justify-end space-x-4 sticky bottom-0 bg-slate-900/95 backdrop-blur-xl z-10">
              {isEditing ? (
                <>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-8 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl text-sm font-black transition-all border border-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    disabled={isAnalyzing}
                    className="px-8 py-3 bg-[#fd7912] hover:bg-[#fd7912]/80 text-white rounded-2xl text-sm font-black transition-all shadow-xl shadow-[#fd7912]/20 disabled:opacity-50"
                  >
                    {isAnalyzing ? <><i className="fas fa-circle-notch fa-spin mr-2"></i> Analyzing...</> : <><i className="fas fa-save mr-2"></i> Save & Re-analyze</>}
                  </button>
                </>
              ) : (
                <>
                  {previewIdea.userId === currentUser.id && (
                    <button
                      onClick={() => handleToggleShare(previewIdea.id)}
                      className={`px-8 py-3 rounded-2xl text-sm font-black transition-all shadow-xl ${previewIdea.isShared
                        ? 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                        : 'bg-[#fd7912] hover:bg-[#fd7912]/80 text-white shadow-[#fd7912]/20'
                        }`}
                    >
                      {previewIdea.isShared ? <><i className="fas fa-lock mr-2"></i> Unshare</> : <><i className="fas fa-share mr-2"></i> Share with {currentUser.department}</>}
                    </button>
                  )}
                  <button
                    onClick={handleClosePreview}
                    className="px-8 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl text-sm font-black transition-all border border-slate-700"
                  >
                    Close
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .preview-content h2 { font-weight: 800; margin: 1.5rem 0 1rem 0; color: white; line-height: 1.2; }
        .preview-content ul { list-style-type: disc; padding-left: 2rem; margin: 1rem 0; }
        .preview-content li { margin-bottom: 0.5rem; }
        .preview-content b, .preview-content strong { font-weight: 700; color: white; }
        .preview-content i, .preview-content em { font-style: italic; }
        .preview-content p { margin-bottom: 1rem; }
      `}</style>
    </div>
  );
};

export default App;
