'use client';

import React, { useState, useEffect } from 'react';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import Link from 'next/link';
import { Radio, Loader2, Play } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface Stream {
  id: string;
  title: string;
  streamKey: string;
  isActive: boolean;
  viewerCount: number;
  channel: {
    id: string;
    name: string;
    avatarUrl: string;
    handle: string;
  };
}

export default function LiveFeedPage() {
  const { user } = useAuth();
  const [streams, setStreams] = useState<Stream[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActiveStreams = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/live/active');
      const data = await res.json();
      setStreams(data.streams || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveStreams();
  }, []);

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <div className="flex flex-1">
        <Sidebar />

        <main className="flex-1 p-6 md:p-8 overflow-y-auto max-h-[calc(100vh-73px)] space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
                <Radio className="h-6 w-6 text-red-500 fill-red-500 animate-pulse" />
                Live Broadcast Center
              </h1>
              <p className="text-sm text-gray-400">Discover channels streaming live tech, tutorial tutorials, and build logs</p>
            </div>

            {user && (
              <button
                onClick={async () => {
                  const title = prompt('Enter Live Stream Title:');
                  if (!title) return;

                  try {
                    const res = await fetch('http://localhost:5000/api/live/start', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${localStorage.getItem('streamin_token')}`,
                      },
                      body: JSON.stringify({ title }),
                    });
                    const data = await res.json();
                    if (res.ok) {
                      window.location.href = `/live/${data.stream.id}`;
                    }
                  } catch (err) {
                    console.error(err);
                  }
                }}
                className="px-5 py-3 bg-red-600 hover:bg-red-500 text-white font-bold uppercase tracking-wider text-xs rounded-xl transition-colors shadow-lg shadow-red-500/10"
              >
                Go Live Now
              </button>
            )}
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-10 w-10 text-purple-500 animate-spin" />
            </div>
          ) : streams.length === 0 ? (
            <div className="text-center py-20 glass-panel border border-white/5 rounded-2xl">
              <p className="text-gray-400">No active live streams at the moment. Start your own live stream!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
              {streams.map((stream) => (
                <Link
                  key={stream.id}
                  href={`/live/${stream.id}`}
                  className="group rounded-2xl overflow-hidden glass-card border border-white/5 relative flex flex-col"
                >
                  <div className="aspect-video bg-slate-900 flex items-center justify-center relative overflow-hidden">
                    <span className="absolute top-3 left-3 px-2 py-0.5 bg-red-600 text-[10px] font-bold rounded uppercase tracking-wider animate-pulse">
                      Live
                    </span>
                    <span className="absolute top-3 right-3 px-2 py-0.5 bg-black/60 text-[10px] font-bold rounded">
                      {stream.viewerCount} viewing
                    </span>
                    <div className="p-3 bg-red-600 rounded-full scale-90 group-hover:scale-100 transition-transform">
                      <Play className="h-5 w-5 text-white fill-white ml-0.5" />
                    </div>
                  </div>

                  <div className="p-4 flex gap-3 flex-1">
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
          )}
        </main>
      </div>
    </div>
  );
}
