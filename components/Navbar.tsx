import React from 'react';
import { AccountUser } from '../types';

interface NavbarProps {
  theme: string;
  currentUser: AccountUser;
  activeTab: string;
  accessibleTabs: Array<'edit' | 'preview' | 'history' | 'dashboard'>;
  onTabChange: (tab: 'edit' | 'preview' | 'history' | 'dashboard') => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ theme, currentUser, activeTab, accessibleTabs, onTabChange, onLogout }) => (
  <nav className={`h-20 sticky top-0 backdrop-blur-md border-b flex items-center justify-between px-6 md:px-12 z-50 transition-colors duration-300 ${theme === 'dark' ? 'bg-[#0F0F0F]/95 border-primary/10' : 'bg-white/95 border-gray-200 shadow-sm'}`}>
    <div className="flex items-center gap-3">
      <img src="https://pub-f0ef2ac3b67c4d4da2fe20c73ab57f83.r2.dev/logo_td.png" alt="Logo" className="w-10 h-10 object-contain" />
      <div className="flex flex-col">
        <span className={`text-lg font-bold uppercase tracking-widest leading-none ${theme === 'dark' ? 'text-white' : 'text-black'}`}>TD Games Billing</span>
      </div>
    </div>

    <div className="flex items-center gap-3">
      <div className={`flex gap-1 p-1 rounded-full border ${theme === 'dark' ? 'bg-surface border-white/5' : 'bg-gray-100 border-gray-200'}`}>
        {accessibleTabs.map((tab) => (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            className={`px-4 md:px-6 py-2 rounded-full text-[10px] md:text-xs font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-primary text-black shadow-btn-glow' : theme === 'dark' ? 'text-neutral-medium hover:text-white' : 'text-gray-500 hover:text-black'}`}
          >
            {tab === 'dashboard' ? '📊' : ''}{tab}
          </button>
        ))}
      </div>

      {/* User info + Logout */}
      <div className="flex items-center gap-2 ml-2">
        <div className={`hidden md:flex flex-col items-end leading-none`}>
          <span className={`text-[11px] font-black uppercase tracking-widest ${theme === 'dark' ? 'text-white' : 'text-black'}`}>{currentUser.username}</span>
          <span className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-md mt-0.5 ${currentUser.role === 'admin'
            ? 'bg-primary/20 text-primary'
            : 'bg-blue-500/20 text-blue-400'
            }`}>{currentUser.role}</span>
        </div>
        <button
          onClick={onLogout}
          title="Đăng xuất"
          className={`p-2 rounded-xl transition-all hover:scale-110 ${theme === 'dark'
            ? 'text-neutral-medium hover:text-status-error hover:bg-status-error/10'
            : 'text-gray-400 hover:text-red-500 hover:bg-red-50'
            }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>
    </div>
  </nav>
);
