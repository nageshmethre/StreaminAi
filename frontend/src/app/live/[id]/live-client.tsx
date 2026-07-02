'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/context/SocketContext';
import { Loader2, Radio, Send, Play, AlertTriangle } from 'lucide-react';

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

interface ChatMessage {
  id: string;
  content: string;
  createdAt: string;
  author: {
    name: string;
    avatarUrl: string;
  };
}

export default function LiveRoomPage() {
  const { id } = useParams();
  const { user, token } = useAuth();
  const { socket, connected } = useSocket();
  const router = useRouter();

  const [stream, setStream] = useState<Stream | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMsg, setNewMsg] = useState('');
  const [loading, setLoading] = useState(true);

  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Fetch Stream details
  useEffect(() => {
    if (!id) return;
    const fetchStream = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/live/active');
        const data = await res.json();
        const active = data.streams?.find((s: any) => s.id === id);
        if (active) {
          setStream(active);
        } else {
          throw new Error('Active stream not found');
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStream();
  }, [id]);

  // Connect to Socket room and listen to incoming chat messages
  useEffect(() => {
    if (!socket || !id || !stream) return;

    socket.emit('join_stream', id);

    socket.on('new_chat_message', (message: ChatMessage) => {
      setMessages((prev) => [...prev, message]);
    });

    return () => {
      socket.emit('leave_stream', id);
      socket.off('new_chat_message');
    };
  }, [socket, id, stream]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMsg.trim() || !token) return;

    try {
      const res = await fetch(`http://localhost:5000/api/live/${id}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: newMsg }),
      });

      if (!res.ok) throw new Error('Failed to send message.');
      setNewMsg('');
    } catch (err) {
      console.error(err);
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

  if (!stream) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <div className="flex-1 flex flex-col justify-center items-center">
          <AlertTriangle className="h-12 w-12 text-yellow-500 mb-4 animate-bounce" />
          <h2 className="text-xl font-bold">This Live Stream has Ended</h2>
          <button
            onClick={() => router.push('/live')}
            className="mt-4 px-6 py-2 bg-purple-600 rounded-full hover:bg-purple-500 text-xs font-bold uppercase"
          >
            Back to Streams
          </button>
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
          {/* Stream Player */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Simulated Live Stream Player */}
            <div className="rounded-2xl overflow-hidden glass-panel border border-white/5 relative aspect-video shadow-2xl flex items-center justify-center bg-slate-950">
              <span className="absolute top-4 left-4 px-3 py-1 bg-red-600 text-xs font-bold rounded-full uppercase tracking-wider animate-pulse flex items-center gap-1.5 z-10">
                <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
                Live Broadcast
              </span>

              <div className="text-center p-6 flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-red-600/10 border border-red-500/20 flex items-center justify-center mb-4 text-red-500 animate-pulse">
                  <Radio className="h-8 w-8" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Simulated Live Feed</h3>
                <p className="text-xs text-gray-400 max-w-sm">
                  Connecting to live RTMP endpoint stream key: <span className="font-mono text-purple-400 font-bold">{stream.streamKey}</span>
                </p>
              </div>
            </div>

            {/* Metadata block */}
            <div className="flex gap-4 items-center justify-between border-b border-white/5 pb-4">
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={stream.channel.avatarUrl || 'https://api.dicebear.com/7.x/bottts/svg'}
                  alt="avatar"
                  className="w-10 h-10 rounded-full bg-slate-800 shrink-0"
                />
                <div>
                  <h1 className="text-base font-bold text-white mb-0.5">{stream.title}</h1>
                  <span className="text-[10px] text-gray-500">Hosted by {stream.channel.name}</span>
                </div>
              </div>
              
              <div className="px-3.5 py-1.5 bg-[#0d111e]/80 border border-white/5 rounded-full text-xs font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 bg-cyan-400 rounded-full animate-ping"></span>
                <span>{stream.viewerCount} Viewers</span>
              </div>
            </div>
          </div>

          {/* Live Chat Panel */}
          <div className="glass-panel border border-white/5 rounded-2xl flex flex-col h-[520px]">
            <div className="p-4 border-b border-white/5 bg-gradient-to-r from-red-950/10 to-transparent flex items-center justify-between">
              <h3 className="text-xs font-bold tracking-widest uppercase flex items-center gap-2">
                <Radio className="h-4 w-4 text-red-500 animate-pulse" />
                Realtime Stream Chat
              </h3>
              <span className="text-[10px] text-gray-500">
                {connected ? 'Connected' : 'Reconnecting...'}
              </span>
            </div>

            {/* Chat message thread container */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col justify-center items-center text-xs text-gray-500 italic">
                  <p>Welcome to live chat! Keep it friendly.</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div key={msg.id} className="flex gap-2.5 items-start text-xs leading-normal">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={msg.author.avatarUrl || 'https://api.dicebear.com/7.x/bottts/svg'}
                      alt="avatar"
                      className="w-6 h-6 rounded-full bg-slate-800 shrink-0 mt-0.5"
                    />
                    <div>
                      <span className="font-bold text-gray-400 mr-2">{msg.author.name}</span>
                      <span className="text-gray-200">{msg.content}</span>
                    </div>
                  </div>
                ))
              )}
              <div ref={chatEndRef}></div>
            </div>

            {/* Message input */}
            <form onSubmit={handleSendMessage} className="p-3 border-t border-white/5 flex gap-2">
              <input
                type="text"
                value={newMsg}
                onChange={(e) => setNewMsg(e.target.value)}
                placeholder={user ? "Send a chat message..." : "Login to participate in chat"}
                disabled={!user}
                className="flex-1 px-3 py-2 bg-[#0d111e]/80 border border-white/5 rounded-xl text-xs focus:outline-none focus:border-purple-500 transition-colors disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!user}
                className="p-2.5 bg-red-600 hover:bg-red-500 disabled:bg-slate-800 text-white rounded-xl shadow transition-colors"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}
