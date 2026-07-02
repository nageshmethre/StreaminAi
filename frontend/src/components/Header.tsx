'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/context/SocketContext';
import { Search, Bell, Film, LogOut, User, DollarSign, LogIn } from 'lucide-react';

export default function Header() {
  const { user, token, logout } = useAuth();
  const { socket } = useSocket();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // Initialize notifications on load
  useEffect(() => {
    if (!user || !token) return;

    // Listen for WebSocket notifications
    if (socket) {
      const room = `notifications_${user.id}`;
      socket.on(room, (notif: any) => {
        setNotifications((prev) => [notif, ...prev]);
      });
    }

    return () => {
      if (socket) {
        socket.off(`notifications_${user.id}`);
      }
    };
  }, [user, socket, token]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/?search=${encodeURIComponent(searchQuery)}`);
    } else {
      router.push('/');
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full glass-panel border-b border-white/5 px-6 py-4 flex items-center justify-between">
      {/* Brand Logo */}
      <Link href="/" className="flex items-center gap-2">
        <div className="p-2 rounded-lg bg-gradient-to-tr from-purple-500 to-cyan-400 shadow-md">
          <Film className="h-5 w-5 text-white" />
        </div>
        <span className="text-xl font-bold tracking-tight">
          Streamin<span className="text-gradient-purple font-black">Ai</span>
        </span>
      </Link>

      {/* Search Input Bar */}
      <form onSubmit={handleSearch} className="flex-1 max-w-lg mx-8 relative hidden md:block">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search videos, creators, or topics..."
          className="w-full px-5 py-2.5 pl-12 bg-[#0d111e]/40 border border-white/5 rounded-full text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
        />
        <Search className="absolute left-4 top-3 h-5 w-5 text-gray-500" />
      </form>

      {/* Action Group */}
      <div className="flex items-center gap-4">
        {user ? (
          <>
            {/* Upgrade Button */}
            {user.tier === 'FREE' && (
              <Link
                href="/billing"
                className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-xs font-bold uppercase tracking-wider rounded-full transition-all shadow-md"
              >
                <DollarSign className="h-3.5 w-3.5" />
                Upgrade to Pro
              </Link>
            )}

            {/* Notification bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2.5 rounded-full bg-[#0d111e]/60 hover:bg-[#141a2d]/60 border border-white/5 text-gray-300 hover:text-white transition-colors relative"
              >
                <Bell className="h-5 w-5" />
                {notifications.length > 0 && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-cyan-500 rounded-full animate-ping"></span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-3 w-80 glass-panel border border-white/10 rounded-2xl shadow-2xl p-4 overflow-y-auto max-h-96">
                  <h4 className="text-sm font-bold border-b border-white/5 pb-2 mb-3">Notifications</h4>
                  {notifications.length === 0 ? (
                    <p className="text-xs text-gray-500 text-center py-4">No new notifications</p>
                  ) : (
                    <div className="space-y-3">
                      {notifications.map((n, idx) => (
                        <div key={idx} className="p-2 hover:bg-white/5 rounded-lg transition-colors cursor-pointer text-xs">
                          <p className="font-semibold text-gray-200">{n.message}</p>
                          <span className="text-[10px] text-gray-500 mt-1 block">Just now</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-2 p-1 rounded-full border border-white/10 hover:border-purple-500/40 transition-colors"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={user.channel?.avatarUrl || 'https://api.dicebear.com/7.x/bottts/svg'}
                  alt="avatar"
                  className="w-8 h-8 rounded-full bg-slate-800"
                />
              </button>

              {showProfileMenu && (
                <div className="absolute right-0 mt-3 w-56 glass-panel border border-white/10 rounded-2xl shadow-2xl p-2">
                  <div className="px-3 py-2 border-b border-white/5 mb-2">
                    <p className="text-sm font-bold truncate">{user.channel?.name || user.email}</p>
                    <p className="text-[10px] text-gray-400 truncate">@{user.channel?.handle || 'user'}</p>
                    <span className="inline-block mt-1 text-[9px] font-extrabold uppercase bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded">
                      {user.tier} Plan
                    </span>
                  </div>

                  <Link
                    href={`/channel/${user.channel?.handle || ''}`}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
                  >
                    <User className="h-4 w-4" />
                    My Channel
                  </Link>

                  <Link
                    href="/studio"
                    className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
                  >
                    <Film className="h-4 w-4" />
                    Creator Studio
                  </Link>

                  <button
                    onClick={logout}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-xl transition-colors text-left"
                  >
                    <LogOut className="h-4 w-4" />
                    Log Out
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <Link
            href="/login"
            className="flex items-center gap-1.5 px-5 py-2 bg-[#0d111e]/80 border border-white/5 rounded-full hover:bg-white/5 text-sm font-semibold transition-colors"
          >
            <LogIn className="h-4 w-4" />
            Sign In
          </Link>
        )}
      </div>
    </header>
  );
}
