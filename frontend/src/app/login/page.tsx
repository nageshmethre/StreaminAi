'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Loader2, Play, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Authentication failed.');
      }

      login(data.token, data.user);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please check your connections.');
    } finally {
      setLoading(false);
    }
  };

  const handleMockLogin = async (role: 'CREATOR' | 'VIEWER' | 'ADMIN') => {
    setLoading(true);
    setError('');

    let mockEmail = 'creator@streamin.ai';
    if (role === 'VIEWER') mockEmail = 'viewer@streamin.ai';
    if (role === 'ADMIN') mockEmail = 'admin@streamin.ai';

    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: mockEmail, password: 'password123' }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Mock login failed.');
      }

      login(data.token, data.user);
    } catch (err: any) {
      setError('Could not connect to mock server. Make sure the backend server is running!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-center items-center px-4 relative min-h-screen">
      {/* Background Orbs */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-purple-600/20 rounded-full blur-3xl -z-10 animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-cyan-600/20 rounded-full blur-3xl -z-10 animate-pulse delay-700"></div>

      <div className="w-full max-w-md p-8 rounded-2xl glass-panel shadow-2xl border border-white/5">
        <div className="text-center mb-8">
          <div className="inline-flex p-3 rounded-full bg-gradient-to-tr from-purple-500 to-cyan-400 mb-3 shadow-lg">
            <Play className="h-6 w-6 text-white fill-white ml-0.5" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            Streamin<span className="text-gradient-purple font-black">Ai</span>
          </h1>
          <p className="text-sm text-gray-400 mt-2">Login to start streaming premium AI-transcribed content</p>
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-200 text-sm p-3 rounded-lg mb-6">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-4 py-3 bg-[#0d111e]/60 border border-white/5 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 bg-[#0d111e]/60 border border-white/5 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white font-semibold rounded-xl transition-all shadow-lg hover:shadow-purple-500/10 flex justify-center items-center gap-2 glow-btn disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Sign In'}
          </button>
        </form>

        {/* Quick Testing Accounts */}
        <div className="mt-8 border-t border-white/5 pt-6">
          <p className="text-xs text-gray-400 text-center mb-3">Quick Demo Fast-Login</p>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleMockLogin('CREATOR')}
              className="py-2 px-3 text-xs bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 text-purple-300 rounded-lg transition-colors font-medium"
            >
              Creator
            </button>
            <button
              onClick={() => handleMockLogin('VIEWER')}
              className="py-2 px-3 text-xs bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 text-cyan-300 rounded-lg transition-colors font-medium"
            >
              Viewer
            </button>
            <button
              onClick={() => handleMockLogin('ADMIN')}
              className="py-2 px-3 text-xs bg-pink-500/10 hover:bg-pink-500/20 border border-pink-500/20 text-pink-300 rounded-lg transition-colors font-medium"
            >
              Admin
            </button>
          </div>
        </div>

        <div className="mt-6 text-center text-sm text-gray-400">
          New to StreaminAi?{' '}
          <Link href="/register" className="text-purple-400 hover:underline">
            Create an account
          </Link>
        </div>
      </div>
    </div>
  );
}
