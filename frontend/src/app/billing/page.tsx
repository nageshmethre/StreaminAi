'use client';

import React, { useState } from 'react';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import { useAuth } from '@/context/AuthContext';
import { Check, Star, Zap, ShieldAlert, Loader2 } from 'lucide-react';

export default function BillingPage() {
  const { user, token, updateUserChannel } = useAuth();
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState('');

  const handleUpgradeDirect = async (tier: 'FREE' | 'PRO' | 'ENTERPRISE') => {
    if (!token) return;
    setLoadingTier(tier);
    setSuccessMsg('');

    try {
      const response = await fetch('http://localhost:5000/api/billing/upgrade-direct', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ tier }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Upgrade failed.');

      // Update auth context state
      updateUserChannel({}); // force reload context / updates
      setSuccessMsg(`Congratulations! Your tier was successfully updated to ${tier}.`);
      
      // Update local storage directly to keep state in sync
      const savedUser = localStorage.getItem('streamin_user');
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        parsed.tier = tier;
        localStorage.setItem('streamin_user', JSON.stringify(parsed));
        window.location.reload(); // refresh page to trigger new status
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingTier(null);
    }
  };

  const PLANS = [
    {
      name: 'FREE',
      price: '$0',
      description: 'Perfect for casual viewers exploring the platform.',
      features: [
        'Watch all public videos',
        'Participate in live stream chats',
        'Standard 480p/720p transcoding uploads',
        'No AI transcript generation',
      ],
      icon: Zap,
      color: 'border-white/5 bg-[#0d111e]/40',
      btnText: 'Current Plan',
    },
    {
      name: 'PRO',
      price: '$15',
      description: 'Ideal for developers and active creators.',
      features: [
        '1080p full HD video transcoding',
        'Automated AI Whisper transcripts',
        'AI video companion chat helper access',
        'Analytics Dashboard insights',
        'Ad-free viewing experience',
      ],
      icon: Star,
      color: 'border-purple-500/30 bg-purple-950/10 shadow-lg shadow-purple-500/5',
      btnText: 'Upgrade to Pro',
    },
    {
      name: 'ENTERPRISE',
      price: '$99',
      description: 'Custom features for businesses and teams.',
      features: [
        'Unlimited HD and 4K transcoding',
        'Unlimited AI transcripts & chat history',
        'Bulk metadata SEO generation tools',
        'API keys and direct integrations support',
        'Priority customer support channels',
      ],
      icon: ShieldAlert,
      color: 'border-cyan-500/30 bg-cyan-950/10 shadow-lg shadow-cyan-500/5',
      btnText: 'Go Enterprise',
    },
  ];

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <div className="flex flex-1">
        <Sidebar />

        <main className="flex-1 p-6 md:p-8 overflow-y-auto max-h-[calc(100vh-73px)] space-y-8 flex flex-col justify-center">
          <div className="text-center max-w-xl mx-auto space-y-3">
            <h1 className="text-3xl font-extrabold tracking-tight">StreaminAi Subscriptions</h1>
            <p className="text-sm text-gray-400">
              Upgrade your account tier to experience automated Whisper transcriptions and full interactive AI video companions
            </p>
          </div>

          {successMsg && (
            <div className="max-w-3xl mx-auto w-full p-4 bg-green-500/10 border border-green-500/20 text-green-200 text-sm rounded-2xl text-center">
              {successMsg}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto w-full">
            {PLANS.map((plan) => {
              const Icon = plan.icon;
              const isCurrent = user?.tier === plan.name;
              
              return (
                <div key={plan.name} className={`p-6 rounded-2xl border flex flex-col justify-between ${plan.color}`}>
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs font-bold tracking-widest uppercase text-gray-400">{plan.name}</span>
                      <Icon className="h-5 w-5 text-purple-400" />
                    </div>

                    <div className="mb-4">
                      <span className="text-3xl font-black text-white">{plan.price}</span>
                      <span className="text-xs text-gray-500"> / month</span>
                    </div>

                    <p className="text-xs text-gray-400 mb-6">{plan.description}</p>

                    <ul className="space-y-3 mb-8">
                      {plan.features.map((feat, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-xs text-gray-300">
                          <Check className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button
                    onClick={() => handleUpgradeDirect(plan.name as any)}
                    disabled={isCurrent || loadingTier !== null}
                    className={`w-full py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex justify-center items-center gap-1.5 ${
                      isCurrent
                        ? 'bg-[#141a2d] border border-white/5 text-gray-400 cursor-default'
                        : 'bg-gradient-to-tr from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white shadow-md glow-btn'
                    }`}
                  >
                    {loadingTier === plan.name ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      plan.btnText
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </main>
      </div>
    </div>
  );
}
