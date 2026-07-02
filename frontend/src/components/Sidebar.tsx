'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Radio, Film, Settings, CreditCard, Award, HelpCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();

  const links = [
    { name: 'Discover', href: '/', icon: Home },
    { name: 'Live Streams', href: '/live', icon: Radio },
    ...(user
      ? [
          { name: 'Creator Studio', href: '/studio', icon: Film },
          { name: 'Billing', href: '/billing', icon: CreditCard },
        ]
      : []),
  ];

  return (
    <aside className="w-64 glass-panel border-r border-white/5 h-[calc(100vh-73px)] p-4 hidden md:flex flex-col justify-between shrink-0">
      <div className="space-y-6">
        <div>
          <h3 className="px-3 text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Navigation</h3>
          <nav className="space-y-1">
            {links.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-purple-500/10 to-cyan-500/10 text-white border border-purple-500/20'
                      : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <Icon className={`h-5 w-5 ${isActive ? 'text-purple-400' : ''}`} />
                  {link.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {user && (
          <div>
            <h3 className="px-3 text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Subscriptions</h3>
            <div className="space-y-2 px-3">
              <p className="text-xs text-gray-500 italic">No subbed channels yet.</p>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="p-3 bg-[#0d111e]/40 border border-white/5 rounded-2xl">
          <p className="text-xs font-bold text-gradient-purple uppercase tracking-wider mb-1">StreaminAi Pro</p>
          <p className="text-[10px] text-gray-400">Unlock Whisper translation and video chat companions.</p>
          <Link
            href="/billing"
            className="block text-center mt-2.5 py-1.5 px-3 bg-white/5 hover:bg-white/10 text-[10px] font-bold uppercase rounded-lg border border-white/5 text-purple-300 transition-colors"
          >
            Upgrade Now
          </Link>
        </div>
      </div>
    </aside>
  );
}
