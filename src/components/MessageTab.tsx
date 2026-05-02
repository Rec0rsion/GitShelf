import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { chatEngine } from '../utils/chatEngine';
import { AppLoader } from './AppLoader';
import { toast } from 'sonner';
import { PlusIcon, MessageCircleIcon, DatabaseIcon, GlobeIcon, UserIcon, SearchIcon, UsersIcon, CheckCircleIcon } from 'lucide-react';
import ChatThreadScreen from './ChatThreadScreen';

interface Conversation {
  id: number;
  number: number;
  title: string;
  updated_at: string;
  user: { login: string; avatar_url: string };
  comments: number;
}

interface DiscoverUser {
  login: string;
  avatar_url: string;
}

const MessageTab: React.FC<{ onRepoClick: (slug: string) => void }> = ({ onRepoClick }) => {
  const [activeSubTab, setActiveSubTab] = useState<'active' | 'discover'>('active');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [discoverUsers, setDiscoverUsers] = useState<DiscoverUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeThread, setActiveThread] = useState<Conversation | null>(null);
  const [myLogin, setMyLogin] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const [selectedUser, setSelectedUser] = useState<DiscoverUser | null>(null);
  const [showBackendChoice, setShowBackendChoice] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [initialMsg, setInitialMsg] = useState('');

  useEffect(() => {
    loadData();
    chatEngine.getCurrentUser().then(u => setMyLogin(u.login)).catch(() => { });
  }, [activeSubTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeSubTab === 'active') {
        const user = await chatEngine.getCurrentUser();
        // We might want to fetch from both or current preference. 
        // For "Active", let's fetch from the currently active mode in chatEngine
        const list = await chatEngine.fetchConversations(user.login);
        setConversations(list as any);
      } else {
        // Fetch users who have interacted with the central hub
        const res = await fetch('https://api.github.com/repos/Algo4ithm/gitspace-inbox/issues?state=all&per_page=30');
        const issues = await res.json();
        const usersMap = new Map();
        issues.forEach((i: any) => {
          if (i.user.login !== myLogin) usersMap.set(i.user.login, i.user);
        });
        setDiscoverUsers(Array.from(usersMap.values()));
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to sync data");
    } finally {
      setLoading(false);
    }
  };

  const handleStartChat = async (mode: 'personal' | 'central') => {
    if (!selectedUser) return;
    setIsInitializing(true);
    try {
      chatEngine.setInboxMode(mode);
      if (mode === 'personal') {
        try {
          await chatEngine.initInbox();
        } catch (e: any) {
          if (e.message.includes('not found')) {
            toast.info("Generating personal inbox...");
            await chatEngine.createPersonalInbox();
          }
        }
      }

      const res = await chatEngine.sendMessage(selectedUser.login, initialMsg || "Hello!");
      toast.success("Conversation started!");
      setShowBackendChoice(false);
      setShowPicker(false);
      setSelectedUser(null);
      setInitialMsg('');
      setActiveSubTab('active');
      loadData();
    } catch (err) {
      toast.error("Failed to start conversation");
    } finally {
      setIsInitializing(false);
    }
  };

  if (activeThread) {
    return (
      <ChatThreadScreen
        thread={activeThread}
        myLogin={myLogin}
        onBack={() => { setActiveThread(null); loadData(); }}
      />
    );
  }

  return (
    <div className="animate-fadeIn pb-20 max-w-[480px] mx-auto">
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-8 px-1">
        <div>
          <h2 className="text-3xl font-sora font-black text-[hsl(var(--text-primary))]">Messages</h2>
          <p className="text-[10px] text-[hsl(var(--text-muted))] font-black uppercase tracking-[0.2em] mt-1">GitShelf Direct</p>
        </div>
        <button
          onClick={() => setShowPicker(true)}
          className="w-12 h-12 bg-[var(--accent-primary)] text-[hsl(var(--text-primary))] rounded-2xl shadow-xl shadow-[var(--accent-primary)]/20 flex items-center justify-center active:scale-90 transition-all"
        >
          <PlusIcon size={24} strokeWidth={2.5} />
        </button>
      </div>

      {/* ── Tab Switcher ── */}
      <div className="flex gap-4 mb-8 px-1">
        <button
          onClick={() => setActiveSubTab('active')}
          className={`relative py-2 text-xs font-black uppercase tracking-widest transition-all ${activeSubTab === 'active' ? 'text-[hsl(var(--text-primary))]' : 'text-[hsl(var(--text-muted))]'
            }`}
        >
          Active Chats
          {activeSubTab === 'active' && (
            <motion.div layoutId="subtab" className="absolute -bottom-1 left-0 right-0 h-1 bg-[var(--accent-primary)] rounded-full" />
          )}
        </button>
        <button
          onClick={() => setActiveSubTab('discover')}
          className={`relative py-2 text-xs font-black uppercase tracking-widest transition-all ${activeSubTab === 'discover' ? 'text-[hsl(var(--text-primary))]' : 'text-[hsl(var(--text-muted))]'
            }`}
        >
          Discover
          {activeSubTab === 'discover' && (
            <motion.div layoutId="subtab" className="absolute -bottom-1 left-0 right-0 h-1 bg-[var(--accent-primary)] rounded-full" />
          )}
        </button>
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center opacity-40">
          <AppLoader className="w-8 h-8 text-[var(--accent-primary)]" />
          <p className="mt-4 text-[10px] font-black uppercase tracking-widest">Syncing Inbox...</p>
        </div>
      ) : activeSubTab === 'active' ? (
        <div className="space-y-4">
          {conversations.length === 0 ? (
            <div className="text-center py-20 px-8 glass-static rounded-[40px] border border-[var(--glass-border)]">
              <div className="w-16 h-16 bg-[var(--glass-bg)] rounded-3xl flex items-center justify-center mx-auto mb-4 border border-[var(--glass-border)] text-[hsl(var(--text-muted))]">
                <MessageCircleIcon size={32} />
              </div>
              <h4 className="text-[hsl(var(--text-primary))] font-sora font-bold">Inbox Empty</h4>
              <p className="text-xs text-[hsl(var(--text-muted))] mt-2">Start a new conversation to see it here.</p>
            </div>
          ) : (
            conversations.map((c) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setActiveThread(c)}
                className="glass-static p-4 rounded-3xl border border-[var(--glass-border)] flex items-center gap-4 active:bg-white/[0.04] transition-all cursor-pointer group"
              >
                <div className="relative">
                  <img src={c.user.avatar_url} className="w-14 h-14 rounded-full border-2 border-[var(--glass-border)] group-hover:border-[var(--accent-primary)]/30 transition-colors" alt="" />
                  <div className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-[#3fb950] border-2 border-[#0d0d0d]" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-sora font-bold text-[hsl(var(--text-primary))] text-base truncate leading-tight">
                    {c.title.replace('[Chat] ', '').split(' & ').find(n => n !== myLogin) || 'User'}
                  </h4>
                  <p className="text-xs text-[hsl(var(--text-muted))] mt-1.5 line-clamp-1 italic opacity-60">Last updated {new Date(c.updated_at).toLocaleDateString()}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="px-2 py-1 bg-[var(--accent-primary)]/10 rounded-lg border border-[var(--accent-primary)]/20">
                    <span className="text-[10px] font-black text-[var(--accent-primary)]">{c.comments}</span>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#30363d" strokeWidth="3"><polyline points="9 18 15 12 9 6" /></svg>
                </div>
              </motion.div>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {discoverUsers.map((u) => (
            <motion.div
              key={u.login}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => { setSelectedUser(u); setShowPicker(false); setShowBackendChoice(true); }}
              className="glass-static p-4 rounded-3xl border border-[var(--glass-border)] flex items-center gap-4 active:bg-white/[0.08] cursor-pointer"
            >
              <img src={u.avatar_url} className="w-12 h-12 rounded-full border border-[var(--glass-border)]" alt="" />
              <div className="flex-1">
                <h4 className="font-sora font-bold text-[hsl(var(--text-primary))]">{u.login}</h4>
                <p className="text-[10px] text-[#3fb950] font-black uppercase tracking-widest mt-0.5">Active on GitShelf</p>
              </div>
              <button className="p-2 bg-[var(--glass-bg)] rounded-xl border border-[var(--glass-border)] text-[var(--accent-primary)]">
                <PlusIcon size={18} />
              </button>
            </motion.div>
          ))}
        </div>
      )}

      {/* ── User Picker Modal ── */}
      <AnimatePresence>
        {showPicker && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[1000] bg-[#0f141d]/60 backdrop-blur-md" onClick={() => setShowPicker(false)} />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} className="fixed bottom-0 left-0 right-0 z-[1001] glass-static p-8 rounded-t-[40px] border-t border-[var(--glass-border)] max-h-[80vh] flex flex-col">
              <div className="w-12 h-1.5 bg-[var(--glass-hover-bg)] rounded-full mx-auto mb-8" />
              <div className="mb-6">
                <h3 className="text-xl font-sora font-black text-[hsl(var(--text-primary))]">New Message</h3>
                <p className="text-xs text-[hsl(var(--text-muted))] mt-1">Select a user to start chatting</p>
              </div>

              <div className="overflow-y-auto space-y-3 no-scrollbar pb-10">
                {discoverUsers.map((u) => (
                  <div key={u.login} onClick={() => { setSelectedUser(u); setShowPicker(false); setShowBackendChoice(true); }} className="p-4 bg-[var(--glass-bg)] rounded-2xl border border-[var(--glass-border)] flex items-center gap-4 active:bg-[var(--accent-primary)]/10 transition-colors">
                    <img src={u.avatar_url} className="w-10 h-10 rounded-full" alt="" />
                    <span className="font-bold text-[hsl(var(--text-primary))]">{u.login}</span>
                  </div>
                ))}
                <div className="p-4 bg-[var(--accent-primary)]/5 border border-dashed border-[var(--accent-primary)]/20 rounded-2xl text-center">
                  <p className="text-[10px] text-[var(--accent-primary)] font-bold">More users appear as they join GitShelf</p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Backend Choice Modal ── */}
      <AnimatePresence>
        {showBackendChoice && selectedUser && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[1100] bg-[#0f141d]/80 backdrop-blur-xl" onClick={() => setShowBackendChoice(false)} />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[1101] w-[90%] max-w-sm glass-static p-8 rounded-[48px] border border-[var(--glass-border)] shadow-[0_0_80px_rgba(0,0,0,0.8)]">
              <div className="text-center mb-8">
                <img src={selectedUser.avatar_url} className="w-20 h-20 rounded-full border-4 border-[var(--accent-primary)]/30 mx-auto mb-4" alt="" />
                <h3 className="text-xl font-sora font-black text-[hsl(var(--text-primary))]">Chat with {selectedUser.login}</h3>
                <p className="text-xs text-[hsl(var(--text-muted))] mt-2 leading-relaxed">Choose how you want to host this conversation.</p>
              </div>

              <div className="mb-8">
                <textarea
                  placeholder="Type your first message..."
                  value={initialMsg}
                  onChange={(e) => setInitialMsg(e.target.value)}
                  className="w-full bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-2xl p-4 text-sm text-[hsl(var(--text-primary))] focus:outline-none focus:border-[var(--accent-primary)]/50 min-h-[100px]"
                />
              </div>

              <div className="grid grid-cols-1 gap-3">
                <button
                  onClick={() => handleStartChat('personal')}
                  disabled={isInitializing}
                  className="flex items-center justify-between p-5 bg-[var(--glass-bg)] rounded-3xl border border-[var(--glass-border)] hover:border-[#d2a8ff]/40 active:bg-[var(--glass-hover-bg)] transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-[#d2a8ff]/10 rounded-2xl text-[#d2a8ff] group-hover:scale-110 transition-transform">
                      <DatabaseIcon size={24} />
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-black text-[hsl(var(--text-primary))] uppercase tracking-widest">Use Own Repo</div>
                      <div className="text-[9px] text-[hsl(var(--text-muted))] font-bold mt-1">Private, decentralized storage</div>
                    </div>
                  </div>
                  <CheckCircleIcon size={20} className="text-[#3fb950] opacity-0 group-hover:opacity-100" />
                </button>

                <button
                  onClick={() => handleStartChat('central')}
                  disabled={isInitializing}
                  className="flex items-center justify-between p-5 bg-[var(--glass-bg)] rounded-3xl border border-[var(--glass-border)] hover:border-[var(--accent-primary)]/40 active:bg-[var(--glass-hover-bg)] transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-[var(--accent-primary)]/10 rounded-2xl text-[var(--accent-primary)] group-hover:scale-110 transition-transform">
                      <GlobeIcon size={24} />
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-black text-[hsl(var(--text-primary))] uppercase tracking-widest">Use GitShelf</div>
                      <div className="text-[9px] text-[hsl(var(--text-muted))] font-bold mt-1">Instant, centralized hub</div>
                    </div>
                  </div>
                </button>
              </div>

              {isInitializing && (
                <div className="absolute inset-0 bg-[#0f141d]/40 backdrop-blur-sm rounded-[48px] flex flex-col items-center justify-center z-10">
                  <AppLoader className="w-12 h-12 text-[var(--accent-primary)]" />
                  <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-[hsl(var(--text-primary))]">Initializing Chat Repository...</p>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MessageTab;