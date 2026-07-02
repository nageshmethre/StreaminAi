'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  email: string;
  role: 'VIEWER' | 'CREATOR' | 'ADMIN';
  tier: 'FREE' | 'PRO' | 'ENTERPRISE';
  channel?: {
    id: string;
    name: string;
    handle: string;
    avatarUrl: string;
    bannerUrl?: string;
    description?: string;
  };
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (token: string, userData: any) => void;
  logout: () => void;
  updateUserChannel: (channelData: any) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const savedToken = localStorage.getItem('streamin_token');
    const savedUser = localStorage.getItem('streamin_user');

    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = (newToken: string, userData: any) => {
    localStorage.setItem('streamin_token', newToken);
    localStorage.setItem('streamin_user', JSON.stringify(userData));
    setToken(newToken);
    setUser(userData);
    router.push('/');
  };

  const logout = () => {
    localStorage.removeItem('streamin_token');
    localStorage.removeItem('streamin_user');
    setToken(null);
    setUser(null);
    router.push('/login');
  };

  const updateUserChannel = (channelData: any) => {
    if (!user) return;
    const updatedUser = { ...user, channel: { ...user.channel, ...channelData } };
    localStorage.setItem('streamin_user', JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, updateUserChannel }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
