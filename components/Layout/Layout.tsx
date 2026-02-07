
import React, { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { LogOut, Building2, ShieldCheck, Download, PlusCircle, History, UserCircle } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { toast } from 'react-hot-toast';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

interface LayoutProps {
  user: User;
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ user, children }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowInstallBtn(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    window.addEventListener('appinstalled', () => {
      setShowInstallBtn(false);
      setDeferredPrompt(null);
      toast.success('Ginza Portal installed on your device!');
    });

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowInstallBtn(false);
    }
    setDeferredPrompt(null);
  };

  const handleLogout = async () => {
    if (confirm('Are you sure you want to logout?')) {
      const { error } = await supabase.auth.signOut();
      if (error) toast.error('Logout failed');
    }
  };

  const metadata = user.user_metadata || {};
  const firstName = metadata.first_name || '';
  const lastName = metadata.last_name || '';
  const fullName = `${firstName} ${lastName}`.trim() || user.email?.split('@')[0];
  const branch = metadata.branch && metadata.branch !== 'N/A' ? metadata.branch : 'Corporate';

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans">
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <div className="bg-white p-1 rounded-xl shadow-sm border border-slate-100">
            <img 
              src="https://www.ginzalimited.com/cdn/shop/files/Ginza_logo.jpg?v=1668509673&width=500" 
              alt="Ginza" 
              className="h-6 w-auto object-contain"
            />
          </div>
          <div className="flex flex-col">
            <h1 className="text-[11px] font-black uppercase tracking-tighter text-slate-900 leading-none">Order Portal</h1>
            <span className="text-[8px] font-bold text-indigo-600 uppercase flex items-center gap-0.5 mt-0.5">
              <Building2 className="h-2 w-2" /> {branch}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {showInstallBtn && (
            <button 
              onClick={handleInstallClick}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-full text-[9px] font-black uppercase tracking-wider hover:bg-indigo-700 shadow-md active:scale-95 transition-all"
            >
              <Download className="h-3 w-3" />
              <span className="hidden sm:inline">Install App</span>
            </button>
          )}
          
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">
            <UserCircle className="h-4 w-4 text-slate-400" />
            <span className="text-[9px] font-black text-slate-700 uppercase hidden md:inline">{fullName}</span>
            <button 
              onClick={handleLogout}
              className="ml-1 text-slate-400 hover:text-red-600 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-6 mb-20 md:mb-0">
        {children}
      </main>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50 safe-area-bottom shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <div className="flex items-center justify-around h-16">
          <button 
            className="flex flex-col items-center gap-1 group"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <div className="p-1 rounded-lg group-active:bg-indigo-50 transition-colors">
              <PlusCircle className="h-5 w-5 text-indigo-600" />
            </div>
            <span className="text-[8px] font-black uppercase tracking-widest text-indigo-600">Order</span>
          </button>
          
          <button 
            className="flex flex-col items-center gap-1 group"
            onClick={() => {
              const histBtn = document.getElementById('history-tab-trigger');
              if (histBtn) histBtn.click();
            }}
          >
            <div className="p-1 rounded-lg group-active:bg-slate-50 transition-colors">
              <History className="h-5 w-5 text-slate-400" />
            </div>
            <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">History</span>
          </button>
          
          <div className="flex flex-col items-center gap-1">
            <div className="p-1">
              <ShieldCheck className="h-5 w-5 text-emerald-500" />
            </div>
            <span className="text-[8px] font-black uppercase tracking-widest text-emerald-500">Secure</span>
          </div>
        </div>
      </nav>

      <footer className="hidden md:block bg-white border-t border-slate-100 py-4 mt-auto">
        <div className="max-w-5xl mx-auto px-4 flex justify-between items-center text-[8px] text-slate-400 font-bold uppercase tracking-[0.2em]">
          <span>© 2025 Ginza Industries Limited</span>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 text-emerald-600"><ShieldCheck className="h-2 w-2" /> Encrypted System</span>
            <span>Version 2.5.0-PWA</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
