import React, { useState, useEffect } from 'react';
import { Native } from '../utils/NativeBridge';
import { SearchIcon, StarIcon, DownloadIcon, PackageIcon, TrashIcon, ClockIcon } from './Icons';
import { motion, AnimatePresence } from 'framer-motion';

export interface RecentViewItem {
  id: string; // full_name or username
  type: 'repo' | 'app' | 'user';
  name: string;
  owner: string;
  avatar: string;
  timestamp: number;
  stars?: number;
  description?: string;
}

interface RecentlyViewedPageProps {
  onClose: () => void;
  onRepoClick: (slug: string) => void;
  onAppClick: (slug: string) => void;
  onUserClick: (username: string) => void;
}

const RecentlyViewedPage: React.FC<RecentlyViewedPageProps> = ({ onClose, onRepoClick, onAppClick, onUserClick }) => {
  const [items, setItems] = useState<RecentViewItem[]>([]);
  const [filter, setFilter] = useState<'all' | 'repo' | 'app' | 'user'>('all');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => {
    const data = JSON.parse(localStorage.getItem('gitspace_recent_views') || '[]');
    // Sort by timestamp descending
    setItems(data.sort((a: RecentViewItem, b: RecentViewItem) => b.timestamp - a.timestamp));
  }, []);

  const clearHistory = () => {
    Native.vibrate();
    localStorage.setItem('gitspace_recent_views', '[]');
    setItems([]);
    setShowClearConfirm(false);
  };

  const removeOne = (id: string) => {
    Native.vibrate();
    const updated = items.filter(i => i.id !== id);
    localStorage.setItem('gitspace_recent_views', JSON.stringify(updated));
    setItems(updated);
  };

  const filteredItems = items.filter(i => filter === 'all' || i.type === filter);

  const handleClick = (item: RecentViewItem) => {
    Native.vibrate();
    onClose();
    if (item.type === 'repo') onRepoClick(item.id);
    else if (item.type === 'app') onAppClick(item.id);
    else if (item.type === 'user') onUserClick(item.owner || item.name);
  };

  const fmtDate = (ts: number) => {
    const now = Date.now();
    const diff = now - ts;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return new Date(ts).toLocaleDateString();
  };

  return (
    <div className="fixed inset-0 z-[600] bg-[var(--bg-primary)] flex flex-col animate-fadeIn">
      {/* Top Bar */}
      <div className="sticky top-0 z-[700] flex flex-col transition-all duration-300"
        style={{
          paddingTop: 'env(safe-area-inset-top)',
        }}
      >
        <div className="px-4 py-2">
          <div className="flex items-center justify-between w-full h-[54px] px-4 glass-static !bg-[#0f141d]/40 backdrop-blur-3xl border border-white/5 rounded-2xl shadow-2xl">
            <div className="flex items-center gap-3">
              <button
                 onClick={() => { Native.vibrate(); onClose(); }}
                 className="group flex items-center justify-center w-9 h-9 rounded-xl bg-white/5 border border-white/10 text-[hsl(var(--text-primary))] cursor-pointer active:scale-90 transition-all hover:bg-white/10">
                 <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:-translate-x-0.5 transition-transform">
                   <polyline points="15 18 9 12 15 6" />
                 </svg>
              </button>
              <div className="flex flex-col">
                <span className="text-[9px] text-[var(--accent-primary)] font-black uppercase tracking-widest opacity-60 leading-none mb-0.5">Activity</span>
                <span className="text-[14px] font-bold text-white leading-none">History Stack</span>
              </div>
            </div>

            <button
              onClick={() => { Native.vibrate(); setShowClearConfirm(true); }}
              className="text-[10px] font-bold text-[#f78166] uppercase tracking-[0.15em] px-4 py-2 rounded-xl active:scale-95 transition-all bg-[#f78166]/10 border border-[#f78166]/20"
            >
              Clear All
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex gap-2 px-5 pb-4 pt-1 overflow-x-auto no-scrollbar" style={{ touchAction: 'pan-x' }}>
          {(['all', 'repo', 'app', 'user'] as const).map((f) => (
            <button
              key={f}
              onClick={() => { Native.vibrate(); setFilter(f); }}
              className={`flex-shrink-0 px-4 py-2 rounded-xl text-[11px] font-black font-sora capitalize transition-all active:scale-95 border ${filter === f ? 'bg-[var(--accent-primary)] text-black border-[var(--accent-primary)] shadow-lg shadow-[var(--accent-primary)]/20' : 'bg-white/5 text-[hsl(var(--text-muted))] border-white/5'}`}
            >
              {f === 'all' ? 'All Activity' : f + 's'}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-6 space-y-4 no-scrollbar" style={{ touchAction: 'pan-y' }}>
        {items.length === 0 ? (
          <div className="py-20 flex flex-col items-center text-center">
            <div className="w-20 h-20 bg-[var(--glass-bg)] rounded-3xl flex items-center justify-center mb-6">
              <ClockIcon size={40} color="#484f58" />
            </div>
            <p className="font-sora font-bold text-[hsl(var(--text-primary))] text-lg">Your stack is empty</p>
            <p className="text-xs text-[hsl(var(--text-dim))] mt-2 max-w-[220px] mx-auto leading-relaxed italic">
              Items you view in Explorer, Home, or Apps will appear here for quick access.
            </p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-20 text-center text-[hsl(var(--text-dim))] text-sm italic">
            No recently viewed {filter}s found.
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {filteredItems.map((item, i) => (
                <motion.div
                  key={item.id + item.type}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.03 }}
                  className="glass-static p-4 rounded-2xl border border-[var(--glass-border)] bg-[#121821]/30 relative overflow-hidden group active:bg-white/[0.03]"
                  onClick={() => handleClick(item)}
                >
                  <div className="flex items-center gap-4 relative z-10">
                    <div className="relative flex-shrink-0">
                      <img src={item.avatar} className={`w-12 h-12 ${item.type === 'user' ? 'rounded-full' : 'rounded-xl'} border border-[var(--glass-border)]`} alt="" />
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-[var(--bg-primary)] flex items-center justify-center"
                        style={{
                          background: item.type === 'repo' ? 'var(--accent-primary)' : item.type === 'app' ? '#3fb950' : '#d2a8ff'
                        }}
                      >
                        {item.type === 'repo' ? <StarIcon size={10} color="#fff" /> : item.type === 'app' ? <PackageIcon size={10} color="#fff" /> : <ClockIcon size={10} color="#fff" />}
                      </div>
                    </div>

                    <div className="flex-1 min-w-0 pr-8">
                      <div className="flex items-center gap-2">
                        <h3 className="font-sora font-bold text-[hsl(var(--text-primary))] text-sm truncate">{item.name}</h3>
                        {item.type === 'app' && <span className="text-[9px] px-1.5 py-0.5 bg-[#3fb950]/10 text-[#3fb950] font-bold rounded uppercase">App</span>}
                      </div>
                      <p className="text-[11px] text-[hsl(var(--text-muted))] font-mono truncate">@{item.owner}</p>
                      <p className="text-[10px] text-[hsl(var(--text-dim))] mt-1 flex items-center gap-1">
                        <ClockIcon size={10} color="currentColor" /> {fmtDate(item.timestamp)}
                      </p>
                    </div>
                  </div>

                  {/* Delete Button */}
                  <button
                    onClick={(e) => { e.stopPropagation(); removeOne(item.id); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl flex items-center justify-center text-[hsl(var(--text-dim))] hover:text-[#f78166] transition-colors"
                  >
                    <TrashIcon size={18} color="currentColor" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Bottom Padding for safety */}
      <div style={{ height: 'env(safe-area-inset-bottom)' }} />

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showClearConfirm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[2000] bg-[#0f141d]/60 backdrop-blur-sm"
              onClick={() => setShowClearConfirm(false)}
            />
            <div className="fixed inset-0 z-[2001] flex items-center justify-center p-6 pointer-events-none">
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="w-full max-w-[320px] glass-static p-8 rounded-[32px] border border-[var(--glass-border)] shadow-2xl pointer-events-auto text-center"
              >
                <div className="w-16 h-16 bg-[#f78166]/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
                  <TrashIcon size={32} color="#f78166" />
                </div>

                <h3 className="font-sora font-bold text-xl text-[hsl(var(--text-primary))] mb-2">Clear History?</h3>
                <p className="text-xs text-[hsl(var(--text-muted))] leading-relaxed mb-8 px-2">
                  This will permanently delete your recently viewed items from this device.
                </p>

                <div className="space-y-3">
                  <button
                    onClick={clearHistory}
                    className="w-full py-4 rounded-2xl bg-[#f78166] text-[hsl(var(--text-primary))] font-sora font-bold text-sm active:scale-95 transition-all cursor-pointer shadow-lg shadow-[#f78166]/20"
                  >
                    Clear History
                  </button>
                  <button
                    onClick={() => setShowClearConfirm(false)}
                    className="w-full py-4 rounded-2xl bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[hsl(var(--text-muted))] font-sora font-bold text-sm active:scale-95 transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RecentlyViewedPage;
