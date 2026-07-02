'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import Link from 'next/link';
import { Play, Flame, Film, Loader2 } from 'lucide-react';

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
  channel: {
    name: string;
    handle: string;
    avatarUrl: string;
  };
}

interface Stream {
  id: string;
  title: string;
  streamKey: string;
  isActive: boolean;
  viewerCount: number;
  channel: {
    name: string;
    avatarUrl: string;
  };
}

const CATEGORIES = ['All', 'Education', 'AI & Machine Learning', 'Gaming', 'Music', 'Dev Logs'];

function HomeFeed() {
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get('search') || '';

  const [videos, setVideos] = useState<Video[]>([]);
  const [streams, setStreams] = useState<Stream[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch videos
        let videosUrl = 'http://localhost:5000/api/videos';
        const params = new URLSearchParams();
        if (searchQuery) params.append('search', searchQuery);
        if (selectedCategory !== 'All') params.append('category', selectedCategory);
        
        if (params.toString()) {
          videosUrl += `?${params.toString()}`;
        }

        const videosRes = await fetch(videosUrl);
        const videosData = await videosRes.json();
        setVideos(videosData.videos || []);

        // Fetch streams
        const streamsRes = await fetch('http://localhost:5000/api/live/active');
        const streamsData = await streamsRes.json();
        setStreams(streamsData.streams || []);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [searchQuery, selectedCategory]);

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <div className="flex flex-1">
        <Sidebar />
        
        <main className="flex-1 p-6 md:p-8 overflow-y-auto max-h-[calc(100vh-73px)]">
          {/* Categories bar */}
          <div className="flex gap-2.5 overflow-x-auto pb-4 mb-6">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors border ${
                  selectedCategory === cat
                    ? 'bg-purple-600 border-purple-500 text-white'
                    : 'bg-[#0d111e]/60 border-white/5 text-gray-400 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Active Live Streams */}
          {streams.length > 0 && selectedCategory === 'All' && !searchQuery && (
            <div className="mb-10">
              <div className="flex items-center gap-2 mb-4">
                <Flame className="h-5 w-5 text-red-500 fill-red-500 animate-pulse" />
                <h2 className="text-lg font-bold tracking-tight uppercase text-red-400">Live Broadcasts</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {streams.map((stream) => (
                  <Link
                    key={stream.id}
                    href={`/live/${stream.id}`}
                    className="group rounded-2xl overflow-hidden glass-card border border-white/5 relative"
                  >
                    {/* Simulated live thumbnail */}
                    <div className="aspect-video bg-slate-900 flex items-center justify-center relative">
                      <span className="absolute top-3 left-3 px-2 py-0.5 bg-red-600 text-[10px] font-bold rounded uppercase tracking-wider animate-pulse">
                        Live
                      </span>
                      <span className="absolute top-3 right-3 px-2 py-0.5 bg-black/60 text-[10px] font-bold rounded">
                        {stream.viewerCount} watching
                      </span>
                      <div className="p-3 bg-red-600 rounded-full scale-90 group-hover:scale-100 transition-transform">
                        <Play className="h-5 w-5 text-white fill-white ml-0.5" />
                      </div>
                    </div>

                    <div className="p-4 flex gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={stream.channel.avatarUrl || 'https://api.dicebear.com/7.x/bottts/svg'}
                        alt="avatar"
                        className="w-9 h-9 rounded-full shrink-0 bg-slate-800"
                      />
                      <div>
                        <h3 className="text-sm font-bold text-white leading-tight group-hover:text-purple-400 transition-colors line-clamp-1">
                          {stream.title}
                        </h3>
                        <p className="text-xs text-gray-400 mt-1">{stream.channel.name}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Videos Grid Section */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Film className="h-5 w-5 text-purple-400" />
              <h2 className="text-lg font-bold tracking-tight uppercase">Recommended Videos</h2>
            </div>

            {loading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="h-10 w-10 text-purple-500 animate-spin" />
              </div>
            ) : videos.length === 0 ? (
              <div className="text-center py-20 glass-panel border border-white/5 rounded-2xl">
                <p className="text-gray-400">No videos found. Check back later or upload one!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {videos.map((vid) => {
                  const minutes = Math.floor(vid.duration / 60);
                  const seconds = Math.floor(vid.duration % 60).toString().padStart(2, '0');

                  return (
                    <Link
                      key={vid.id}
                      href={`/watch/${vid.id}`}
                      className="group rounded-2xl overflow-hidden glass-card border border-white/5 relative flex flex-col"
                    >
                      <div className="aspect-video bg-slate-900 flex items-center justify-center relative overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={vid.thumbnailUrl || 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7'}
                          alt={vid.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <span className="absolute bottom-3 right-3 px-2 py-0.5 bg-black/80 text-[10px] font-bold rounded">
                          {minutes}:{seconds}
                        </span>
                      </div>

                      <div className="p-4 flex gap-3 flex-1">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={vid.channel.avatarUrl || 'https://api.dicebear.com/7.x/bottts/svg'}
                          alt="avatar"
                          className="w-9 h-9 rounded-full shrink-0 bg-slate-800"
                        />
                        <div className="flex flex-col justify-between flex-1">
                          <div>
                            <h3 className="text-sm font-bold text-white leading-snug group-hover:text-purple-400 transition-colors line-clamp-2">
                              {vid.title}
                            </h3>
                            <p className="text-xs text-gray-400 mt-1">{vid.channel.name}</p>
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] text-gray-500 mt-2">
                            <span>{vid.views} views</span>
                            <span>•</span>
                            <span>{new Date(vid.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col min-h-screen bg-[#05070f] text-[#f3f4f6]">
        <Header />
        <div className="flex-1 flex justify-center items-center">
          <Loader2 className="h-10 w-10 text-purple-500 animate-spin" />
        </div>
      </div>
    }>
      <HomeFeed />
    </Suspense>
  );
}
