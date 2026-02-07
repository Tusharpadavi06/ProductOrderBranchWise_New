
import React, { useState } from 'react';
import { PlusCircle, History } from 'lucide-react';
import { OrderForm } from '../OrderForm/OrderForm';
import { OrderHistory } from '../History/OrderHistory';
import { User } from '@supabase/supabase-js';

interface DashboardProps {
  user: User;
}

export const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<'new-order' | 'history'>('new-order');

  return (
    <div className="space-y-6">
      {/* Native Segmented Control */}
      <div className="flex justify-center px-4">
        <div className="flex bg-slate-200/50 backdrop-blur-sm p-1 rounded-2xl w-full max-w-sm shadow-inner relative border border-slate-200/50">
          <button
            id="order-tab-trigger"
            onClick={() => setActiveTab('new-order')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-all duration-300 z-10 ${
              activeTab === 'new-order' 
                ? 'bg-white text-indigo-600 shadow-[0_4px_12px_rgba(0,0,0,0.05)] translate-y-0' 
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <PlusCircle className={`h-3.5 w-3.5 transition-transform ${activeTab === 'new-order' ? 'scale-110' : ''}`} />
            New Order
          </button>
          <button
            id="history-tab-trigger"
            onClick={() => setActiveTab('history')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-all duration-300 z-10 ${
              activeTab === 'history' 
                ? 'bg-white text-indigo-600 shadow-[0_4px_12px_rgba(0,0,0,0.05)] translate-y-0' 
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <History className={`h-3.5 w-3.5 transition-transform ${activeTab === 'history' ? 'scale-110' : ''}`} />
            History
          </button>
        </div>
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
        {activeTab === 'new-order' ? <OrderForm /> : <OrderHistory />}
      </div>
    </div>
  );
};
