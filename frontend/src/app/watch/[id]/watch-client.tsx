'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import { useAuth } from '@/context/AuthContext';
import { 
  Play, ThumbsUp, ThumbsDown, MessageSquare, Send, Sparkles, 
  Loader2, AlertTriangle, ChevronRight, UserPlus, Check 
} from 'lucide-react';

interface Video {
  id: string;
  title: string;
  description?: string;
  url?: string;
  thumbnailUrl: string;
  views: number;
  duration: number;
  category: string;
  createdAt: string;
  transcript?: string;
  aiSummary?: string;
  channel: {
    id: string;
    name: string;
    avatarUrl: string;
    subscribers: { subscriberId: string }[];
  };
  likes: { userId: string; isDislike: boolean }[];
}

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  author: {
    channel?: {
      name: string;
      avatarUrl: string;
      handle: string;
    };
  };
  replies?: Comment[];
}

export default function WatchPage() {
  const { id } = useParams();
  const { user, token } = useAuth();
  const router = useRouter();

  const [video, setVideo] = useState<Video | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [recommended, setRecommended] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  // Likes & Subscribes
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [dislikesCount, setDislikesCount] = useState(0);
  const [userVote, setUserVote] = useState<'LIKE' | 'DISLIKE' | null>(null);

  // Interactive comments
  const [newComment, setNewComment] = useState('');
  const [commentError, setCommentError] = useState('');

  // AI Assistant Chat state
  const [aiChatOpen, setAiChatOpen] = useState(true);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([
    { role: 'assistant', content: 'Hi! I am your AI Video Companion. Ask me anything about the content of this video!' }
  ]);
  const [chatLoading, setChatLoading] = useState(false);

  const viewIncremented = useRef(false);

  // Fetch video data
  useEffect(() => {
    if (!id) return;
    const fetchVideoData = async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/videos/${id}`);
        if (!res.ok) throw new Error('Video not found.');
        const data = await res.json();
        setVideo(data.video);

        // Process vote stats
        const likes = data.video.likes.filter((l: any) => !l.isDislike);
        const dislikes = data.video.likes.filter((l: any) => l.isDislike);
        setLikesCount(likes.length);
        setDislikesCount(dislikes.length);

        if (user) {
          const vote = data.video.likes.find((l: any) => l.userId === user.id);
          if (vote) setUserVote(vote.isDislike ? 'DISLIKE' : 'LIKE');

          const subbed = data.video.channel.subscribers.some((s: any) => s.subscriberId === user.id);
          setIsSubscribed(subbed);
        }

        // Increment view count exactly once
        if (!viewIncremented.current) {
          fetch(`http://localhost:5000/api/videos/${id}/view`, { method: 'POST' });
          viewIncremented.current = true;
        }

        // Fetch comments
        const commsRes = await fetch(`http://localhost:5000/api/comments/video/${id}`);
        const commsData = await commsRes.json();
        setComments(commsData.comments || []);

        // Fetch category recommendations
        const recsRes = await fetch(`http://localhost:5000/api/videos?category=${encodeURIComponent(data.video.category)}`);
        const recsData = await recsRes.json();
        setRecommended(recsData.videos?.filter((v: any) => v.id !== id) || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchVideoData();
  }, [id, user]);

  const handleVote = async (isDislike: boolean) => {
    if (!user || !token) {
      router.push('/login');
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/videos/${id}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isDislike }),
      });

      if (response.ok) {
        const type = isDislike ? 'DISLIKE' : 'LIKE';
        if (userVote === type) {
          setUserVote(null);
          if (isDislike) setDislikesCount((prev) => prev - 1);
          else setLikesCount((prev) => prev - 1);
        } else {
          if (userVote === null) {
            if (isDislike) setDislikesCount((prev) => prev + 1);
            else setLikesCount((prev) => prev + 1);
          } else {
            // toggled vote
            if (isDislike) {
              setDislikesCount((prev) => prev + 1);
              setLikesCount((prev) => prev - 1);
            } else {
              setLikesCount((prev) => prev + 1);
              setDislikesCount((prev) => prev - 1);
            }
          }
          setUserVote(type);
        }
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleSubscribe = async () => {
    if (!user || !token) {
      router.push('/login');
      return;
    }

    try {
      const res = await fetch('http://localhost:5000/api/channels/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ channelId: video?.channel.id }),
      });

      if (res.ok) {
        setIsSubscribed(!isSubscribed);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const postComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    if (!user || !token) {
      router.push('/login');
      return;
    }

    setCommentError('');

    try {
      const res = await fetch('http://localhost:5000/api/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: newComment, videoId: id }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to post comment.');
      }

      setComments([data.comment, ...comments]);
      setNewComment('');
    } catch (err: any) {
      setCommentError(err.message);
    }
  };

  const handleAiChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;

    const userMessage = chatInput;
    setChatMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setChatInput('');
    setChatLoading(true);

    try {
      const history = chatMessages.slice(1); // Exclude initial welcome
      const res = await fetch(`http://localhost:5000/api/videos/${id}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: userMessage, history }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setChatMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);
    } catch (err: any) {
      setChatMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Sorry, I failed to process that request. Verify your AI key setup.' }
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <div className="flex-1 flex justify-center items-center">
          <Loader2 className="h-10 w-10 text-purple-500 animate-spin" />
        </div>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <div className="flex-1 flex flex-col justify-center items-center">
          <AlertTriangle className="h-12 w-12 text-yellow-500 mb-4" />
          <h2 className="text-xl font-bold">Video not found</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <div className="flex flex-1">
        <Sidebar />

        <main className="flex-1 p-6 overflow-y-auto max-h-[calc(100vh-73px)] grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Player, Video info, Comments */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Custom Glowing Video Player */}
            <div className="rounded-2xl overflow-hidden glass-panel border border-white/5 relative aspect-video shadow-2xl">
              <video
                src={video.url || ''}
                controls
                autoPlay
                className="w-full h-full object-cover"
                poster={video.thumbnailUrl}
              />
            </div>

            {/* Video metadata */}
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-white mb-3">{video.title}</h1>
              
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/5 pb-4 mb-4">
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={video.channel.avatarUrl || 'https://api.dicebear.com/7.x/bottts/svg'}
                    alt="avatar"
                    className="w-10 h-10 rounded-full bg-slate-800 shrink-0"
                  />
                  <div>
                    <h3 className="text-sm font-bold text-white leading-none mb-1">{video.channel.name}</h3>
                    <span className="text-[10px] text-gray-500">
                      {video.channel.subscribers?.length || 0} subscribers
                    </span>
                  </div>

                  <button
                    onClick={handleSubscribe}
                    className={`ml-4 px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-full flex items-center gap-1.5 transition-all ${
                      isSubscribed
                        ? 'bg-[#141a2d] border border-white/10 text-gray-300 hover:bg-white/5'
                        : 'bg-purple-600 hover:bg-purple-500 text-white'
                    }`}
                  >
                    {isSubscribed ? (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        Subscribed
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-3.5 w-3.5" />
                        Subscribe
                      </>
                    )}
                  </button>
                </div>

                {/* Like / Dislike actions */}
                <div className="flex items-center gap-1 bg-[#0d111e]/80 border border-white/5 rounded-full p-1">
                  <button
                    onClick={() => handleVote(false)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-colors ${
                      userVote === 'LIKE' ? 'bg-purple-500/20 text-purple-400' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <ThumbsUp className="h-4 w-4" />
                    {likesCount}
                  </button>
                  <span className="h-4 w-px bg-white/5"></span>
                  <button
                    onClick={() => handleVote(true)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-colors ${
                      userVote === 'DISLIKE' ? 'bg-pink-500/20 text-pink-400' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <ThumbsDown className="h-4 w-4" />
                    {dislikesCount}
                  </button>
                </div>
              </div>

              {/* Video Description box */}
              <div className="bg-[#0d111e]/40 border border-white/5 rounded-2xl p-4 text-sm text-gray-300">
                <div className="flex gap-4 text-xs font-bold text-gray-500 mb-2">
                  <span>{video.views} views</span>
                  <span>{new Date(video.createdAt).toLocaleDateString()}</span>
                </div>
                <p className="whitespace-pre-wrap leading-relaxed">{video.description}</p>
              </div>
            </div>

            {/* Comments Thread Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-purple-400" />
                Comments Section
              </h3>

              {commentError && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-200 text-xs p-3 rounded-xl">
                  <AlertTriangle className="h-4 w-4" />
                  <span>{commentError}</span>
                </div>
              )}

              {/* Input for new comment */}
              <form onSubmit={postComment} className="flex gap-3">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Post a comment... (Type 'kill' or 'hate' to check AI toxicity rejection)"
                  className="flex-1 px-4 py-3 bg-[#0d111e]/60 border border-white/5 rounded-xl text-sm focus:outline-none focus:border-purple-500 transition-colors"
                />
                <button
                  type="submit"
                  className="p-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl transition-all shadow-md"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>

              {/* Comments list */}
              <div className="space-y-4 pt-4">
                {comments.length === 0 ? (
                  <p className="text-xs text-gray-500 italic">No comments yet. Write the first one!</p>
                ) : (
                  comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3 text-sm border-b border-white/5 pb-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={comment.author.channel?.avatarUrl || 'https://api.dicebear.com/7.x/bottts/svg'}
                        alt="avatar"
                        className="w-8 h-8 rounded-full bg-slate-800 shrink-0"
                      />
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-white">
                            {comment.author.channel?.name || 'Anonymous User'}
                          </span>
                          <span className="text-[10px] text-gray-500">
                            {new Date(comment.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-gray-300">{comment.content}</p>

                        {/* Rendering Nested Replies */}
                        {comment.replies && comment.replies.map((reply) => (
                          <div key={reply.id} className="flex gap-2.5 mt-3 pl-4 border-l border-white/5">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={reply.author.channel?.avatarUrl || 'https://api.dicebear.com/7.x/bottts/svg'}
                              alt="avatar"
                              className="w-6 h-6 rounded-full bg-slate-800 shrink-0"
                            />
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-semibold text-white text-xs">
                                  {reply.author.channel?.name || 'Anonymous User'}
                                </span>
                              </div>
                              <p className="text-gray-300 text-xs">{reply.content}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right Column: AI Video Companion & Sidebar suggestions */}
          <div className="space-y-6">
            
            {/* AI Companion Window */}
            {aiChatOpen ? (
              <div className="glass-panel border border-white/5 rounded-2xl flex flex-col h-[480px]">
                <div className="p-4 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-purple-900/20 to-cyan-900/20">
                  <h3 className="text-sm font-extrabold tracking-wider uppercase flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-purple-400 animate-spin" style={{ animationDuration: '6s' }} />
                    AI Video Companion
                  </h3>
                  <button
                    onClick={() => setAiChatOpen(false)}
                    className="text-xs text-gray-400 hover:text-white"
                  >
                    Hide
                  </button>
                </div>

                {/* Messages scroll box */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {chatMessages.map((msg, index) => (
                    <div
                      key={index}
                      className={`flex flex-col max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-purple-600 text-white ml-auto rounded-tr-none'
                          : 'bg-[#0d111e]/90 text-gray-300 border border-white/5 mr-auto rounded-tl-none'
                      }`}
                    >
                      <span className="font-bold text-[9px] uppercase tracking-wider text-gray-500 mb-1">
                        {msg.role === 'user' ? 'You' : 'StreaminAi Bot'}
                      </span>
                      <p>{msg.content}</p>
                    </div>
                  ))}
                  {chatLoading && (
                    <div className="flex gap-1.5 items-center text-xs text-gray-500">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span>Thinking...</span>
                    </div>
                  )}
                </div>

                {/* Input block */}
                <form onSubmit={handleAiChatSubmit} className="p-3 border-t border-white/5 flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Ask about this video content..."
                    className="flex-1 px-3 py-2 bg-[#0d111e]/80 border border-white/5 rounded-xl text-xs focus:outline-none focus:border-purple-500 transition-colors"
                  />
                  <button
                    type="submit"
                    className="p-2.5 bg-gradient-to-tr from-purple-500 to-cyan-400 text-white rounded-xl shadow"
                  >
                    <Send className="h-3.5 w-3.5" />
                  </button>
                </form>
              </div>
            ) : (
              <button
                onClick={() => setAiChatOpen(true)}
                className="w-full py-4 glass-panel border border-purple-500/20 text-purple-400 hover:text-purple-300 rounded-2xl flex items-center justify-center gap-2 font-bold text-xs uppercase tracking-wider transition-colors shadow-lg shadow-purple-500/5"
              >
                <Sparkles className="h-4 w-4" />
                Show AI Companion Chat
              </button>
            )}

            {/* Sidebar Recommended list */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Similar Videos</h4>
              {recommended.length === 0 ? (
                <p className="text-xs text-gray-500 italic">No similar suggestions available.</p>
              ) : (
                recommended.map((vid) => {
                  const minutes = Math.floor(vid.duration / 60);
                  const seconds = Math.floor(vid.duration % 60).toString().padStart(2, '0');

                  return (
                    <Link
                      key={vid.id}
                      href={`/watch/${vid.id}`}
                      className="group flex gap-3 p-2 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/5 transition-all"
                    >
                      <div className="w-28 aspect-video bg-slate-900 rounded-lg overflow-hidden shrink-0 relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={vid.thumbnailUrl || 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7'}
                          alt={vid.title}
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute bottom-1 right-1 px-1 bg-black/80 text-[8px] font-bold rounded">
                          {minutes}:{seconds}
                        </span>
                      </div>
                      <div className="flex flex-col justify-between overflow-hidden">
                        <div>
                          <h4 className="text-xs font-bold text-white group-hover:text-purple-400 transition-colors line-clamp-2 leading-tight">
                            {vid.title}
                          </h4>
                          <p className="text-[10px] text-gray-400 mt-1">{vid.channel.name}</p>
                        </div>
                        <span className="text-[9px] text-gray-500 mt-1">
                          {vid.views} views
                        </span>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
