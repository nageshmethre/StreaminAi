'use client';

import React, { useState, useEffect } from 'react';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/context/SocketContext';
import { useRouter } from 'next/navigation';
import { 
  Upload, Film, Users, Eye, Clock, Loader2, Sparkles, AlertCircle, CheckCircle 
} from 'lucide-react';

interface AnalyticsSummary {
  totalVideos: number;
  totalSubscribers: number;
  totalViews: number;
  totalWatchTimeMinutes: number;
}

interface VideoMetric {
  id: string;
  title: string;
  views: number;
  createdAt: string;
}

interface ChartItem {
  label: string;
  views: number;
}

export default function StudioPage() {
  const { user, token } = useAuth();
  const { socket } = useSocket();
  const router = useRouter();

  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [videos, setVideos] = useState<VideoMetric[]>([]);
  const [chartData, setChartData] = useState<ChartItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Upload Form States
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDesc, setUploadDesc] = useState('');
  const [uploadCategory, setUploadCategory] = useState('Education');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  
  // AI Suggestions
  const [suggesting, setSuggesting] = useState(false);
  
  // Upload status tracking
  const [uploading, setUploading] = useState(false);
  const [currentUploadVideoId, setCurrentUploadVideoId] = useState<string | null>(null);
  const [transcodingProgress, setTranscodingProgress] = useState<number>(0);

  // Check auth
  useEffect(() => {
    if (!user) {
      router.push('/login');
    }
  }, [user, router]);

  // Fetch Analytics & Video Metrics
  const fetchAnalytics = async () => {
    if (!token) return;
    try {
      const res = await fetch('http://localhost:5000/api/analytics/studio', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setSummary(data.summary);
        setVideos(data.videos || []);
        setChartData(data.chartData || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [token]);

  // Hook up WebSockets to listen to transcoding progress updates
  useEffect(() => {
    if (!socket || !currentUploadVideoId) return;

    socket.emit('join_upload', currentUploadVideoId);
    
    socket.on('upload_progress', (data: { videoId: string; progress: number }) => {
      if (data.videoId === currentUploadVideoId) {
        setTranscodingProgress(data.progress);
        if (data.progress >= 100) {
          // Finished processing
          setUploading(false);
          setCurrentUploadVideoId(null);
          fetchAnalytics(); // reload video logs
        }
      }
    });

    return () => {
      socket.off('upload_progress');
    };
  }, [socket, currentUploadVideoId]);

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoFile || !uploadTitle || !token) return;

    setUploading(true);
    setTranscodingProgress(0);

    const formData = new FormData();
    formData.append('video', videoFile);
    formData.append('title', uploadTitle);
    formData.append('description', uploadDesc);
    formData.append('category', uploadCategory);

    try {
      const res = await fetch('http://localhost:5000/api/videos/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Upload failed.');

      setCurrentUploadVideoId(data.videoId);
      setShowUploadModal(false);
      
      // Clean form fields
      setUploadTitle('');
      setUploadDesc('');
      setVideoFile(null);
    } catch (err) {
      console.error(err);
      setUploading(false);
    }
  };

  const triggerAISuggestions = async () => {
    if (!uploadTitle.trim() || !token) return;
    setSuggesting(true);

    try {
      const res = await fetch('http://localhost:5000/api/videos/ai-suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title: uploadTitle, category: uploadCategory }),
      });

      const data = await res.json();
      if (res.ok) {
        setUploadDesc(data.description);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setSuggesting(false);
    }
  };

  // Custom SVG render chart computation metrics
  const maxVal = chartData.length > 0 ? Math.max(...chartData.map((d) => d.views)) : 100;
  const padding = 40;
  const chartHeight = 200;
  const chartWidth = 500;

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <div className="flex flex-1">
        <Sidebar />

        <main className="flex-1 p-6 md:p-8 overflow-y-auto max-h-[calc(100vh-73px)] space-y-8">
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight">Creator Studio</h1>
              <p className="text-sm text-gray-400">Manage upload transcoders and track audience analytics</p>
            </div>

            <button
              onClick={() => setShowUploadModal(true)}
              className="flex items-center gap-1.5 px-5 py-3 bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-sm font-bold uppercase tracking-wider rounded-xl transition-all shadow-lg glow-btn"
            >
              <Upload className="h-4 w-4" />
              Upload Video
            </button>
          </div>

          {/* Transcoding Progress Panel */}
          {uploading && (
            <div className="p-4 rounded-2xl glass-panel border border-purple-500/20 bg-purple-500/5 flex items-center justify-between">
              <div className="flex-1 mr-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-white flex items-center gap-2">
                    <Loader2 className="h-4 w-4 text-purple-400 animate-spin" />
                    Transcoding Uploaded Video File (HLS Bitrates)
                  </span>
                  <span className="text-xs font-bold text-purple-400">{transcodingProgress}%</span>
                </div>
                <div className="w-full h-2 bg-[#0d111e] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-cyan-400 transition-all duration-300"
                    style={{ width: `${transcodingProgress}%` }}
                  ></div>
                </div>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-10 w-10 text-purple-500 animate-spin" />
            </div>
          ) : (
            <>
              {/* Analytics metrics overview */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { title: 'Total Videos', val: summary?.totalVideos || 0, icon: Film, color: 'text-purple-400' },
                  { title: 'Subscribers', val: summary?.totalSubscribers || 0, icon: Users, color: 'text-cyan-400' },
                  { title: 'Total Views', val: summary?.totalViews || 0, icon: Eye, color: 'text-pink-400' },
                  { title: 'Watch Time (Min)', val: summary?.totalWatchTimeMinutes || 0, icon: Clock, color: 'text-yellow-400' },
                ].map((stat, i) => (
                  <div key={i} className="p-6 rounded-2xl glass-card border border-white/5 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest block mb-1">{stat.title}</span>
                      <span className="text-2xl font-black text-white">{stat.val}</span>
                    </div>
                    <div className={`p-3 rounded-xl bg-white/5 border border-white/5 ${stat.color}`}>
                      <stat.icon className="h-5 w-5" />
                    </div>
                  </div>
                ))}
              </div>

              {/* Analytics Charts & Details */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* SVG Performance Chart */}
                <div className="lg:col-span-2 p-6 rounded-2xl glass-panel border border-white/5 flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider mb-1">Views Traffic Trend</h3>
                    <p className="text-xs text-gray-500 mb-6">Views tracking logs for the past week</p>
                  </div>

                  {chartData.length > 0 ? (
                    <div className="relative w-full aspect-[2.5/1]">
                      <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-full">
                        {/* Grid lines */}
                        {[0, 0.25, 0.5, 0.75, 1].map((r, idx) => (
                          <line
                            key={idx}
                            x1={padding}
                            y1={padding + r * (chartHeight - padding * 2)}
                            x2={chartWidth - padding}
                            y2={padding + r * (chartHeight - padding * 2)}
                            stroke="rgba(255,255,255,0.05)"
                            strokeWidth="1"
                          />
                        ))}

                        {/* Chart Line path */}
                        <path
                          d={chartData.reduce((pathStr, pt, idx) => {
                            const x = padding + (idx / (chartData.length - 1)) * (chartWidth - padding * 2);
                            const y = chartHeight - padding - (pt.views / maxVal) * (chartHeight - padding * 2);
                            return pathStr + `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
                          }, '')}
                          fill="none"
                          stroke="url(#purpleCyanGrad)"
                          strokeWidth="3.5"
                        />

                        {/* Data Points */}
                        {chartData.map((pt, idx) => {
                          const x = padding + (idx / (chartData.length - 1)) * (chartWidth - padding * 2);
                          const y = chartHeight - padding - (pt.views / maxVal) * (chartHeight - padding * 2);
                          return (
                            <g key={idx}>
                              <circle cx={x} cy={y} r="5" fill="#a855f7" className="animate-pulse" />
                              <text x={x} y={chartHeight - 12} textAnchor="middle" fill="#9ca3af" fontSize="9" fontWeight="bold">
                                {pt.label}
                              </text>
                            </g>
                          );
                        })}

                        <defs>
                          <linearGradient id="purpleCyanGrad" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#a855f7" />
                            <stop offset="100%" stopColor="#06b6d4" />
                          </linearGradient>
                        </defs>
                      </svg>
                    </div>
                  ) : (
                    <div className="flex justify-center items-center h-32">
                      <p className="text-xs text-gray-500 italic">No chart logs available yet</p>
                    </div>
                  )}
                </div>

                {/* Video metrics rankings list */}
                <div className="p-6 rounded-2xl glass-panel border border-white/5">
                  <h3 className="text-sm font-bold uppercase tracking-wider mb-4">Video Standings</h3>
                  <div className="space-y-4 max-h-[220px] overflow-y-auto pr-2">
                    {videos.length === 0 ? (
                      <p className="text-xs text-gray-500 italic text-center py-8">No uploads recorded yet</p>
                    ) : (
                      videos.map((vid, idx) => (
                        <div key={vid.id} className="flex items-center justify-between border-b border-white/5 pb-2 text-xs">
                          <div className="truncate pr-4 flex-1">
                            <span className="font-semibold text-white block truncate mb-0.5">{vid.title}</span>
                            <span className="text-[10px] text-gray-500">{new Date(vid.createdAt).toLocaleDateString()}</span>
                          </div>
                          <span className="font-bold text-purple-400 shrink-0">{vid.views} views</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Upload Modal Dialog box */}
          {showUploadModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="w-full max-w-xl glass-panel border border-white/10 rounded-2xl shadow-2xl p-6 relative">
                <h3 className="text-lg font-bold mb-4">Upload Video Content</h3>
                
                <form onSubmit={handleUploadSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Video Title</label>
                    <input
                      type="text"
                      required
                      value={uploadTitle}
                      onChange={(e) => setUploadTitle(e.target.value)}
                      placeholder="My New AI tutorial"
                      className="w-full px-4 py-2 bg-[#0d111e]/80 border border-white/5 rounded-xl text-sm focus:outline-none focus:border-purple-500 transition-colors"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest">Video Description</label>
                      <button
                        type="button"
                        onClick={triggerAISuggestions}
                        disabled={suggesting}
                        className="text-[10px] font-bold uppercase tracking-wider bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded flex items-center gap-1 hover:bg-purple-500/20 transition-all disabled:opacity-50"
                      >
                        {suggesting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                        AI Write Description
                      </button>
                    </div>
                    <textarea
                      rows={4}
                      value={uploadDesc}
                      onChange={(e) => setUploadDesc(e.target.value)}
                      placeholder="Input description details..."
                      className="w-full px-4 py-2 bg-[#0d111e]/80 border border-white/5 rounded-xl text-sm focus:outline-none focus:border-purple-500 transition-colors"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Category</label>
                      <select
                        value={uploadCategory}
                        onChange={(e) => setUploadCategory(e.target.value)}
                        className="w-full px-4 py-2 bg-[#0d111e]/80 border border-white/5 rounded-xl text-sm focus:outline-none focus:border-purple-500 transition-colors text-gray-300"
                      >
                        <option value="Education">Education</option>
                        <option value="AI & Machine Learning">AI & Machine Learning</option>
                        <option value="Gaming">Gaming</option>
                        <option value="Music">Music</option>
                        <option value="Dev Logs">Dev Logs</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Select File</label>
                      <input
                        type="file"
                        required
                        accept="video/*"
                        onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                        className="w-full text-xs text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-white/5 file:text-white file:cursor-pointer hover:file:bg-white/10"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowUploadModal(false)}
                      className="px-4 py-2 bg-transparent hover:bg-white/5 text-gray-400 hover:text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2 bg-gradient-to-tr from-purple-500 to-cyan-400 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-md"
                    >
                      Start Upload
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
