import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { chatEngine } from '../utils/chatEngine';
import { AppLoader } from './AppLoader';
import { toast } from 'sonner';

interface Message {
  id: number;
  body: string;
  created_at: string;
  user: { login: string; avatar_url: string };
}

interface Conversation {
  id: number;
  number: number;
  title: string;
  updated_at: string;
  user: { login: string; avatar_url: string };
  comments: number;
}

interface ChatThreadScreenProps {
  thread: Conversation;
  myLogin: string;
  onBack: () => void;
}

/* ── helpers ── */

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const getDateLabel = (iso: string) => {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

const getPeerInfo = (title: string, myLogin: string, threadUser: Conversation['user']) => {
  const cleaned = title.replace('[Chat] ', '').replace('[GitSpace Chat] ', '');
  const names = cleaned.split(' & ').map(s => s.trim());
  const peerName = names.find(n => n !== myLogin) || names[0] || 'User';
  return { name: peerName, avatar: threadUser.avatar_url };
};

/* ── dot-grid SVG background ── */
const DOT_PATTERN = `url("data:image/svg+xml,%3Csvg width='20' height='20' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='1' cy='1' r='0.6' fill='rgba(255,255,255,0.04)'/%3E%3C/svg%3E")`;

/* ── bubble animation variants ── */
const bubbleVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 400, damping: 28 } },
};

const ChatThreadScreen: React.FC<ChatThreadScreenProps> = ({ thread, myLogin, onBack }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const peer = getPeerInfo(thread.title, myLogin, thread.user);

  useEffect(() => {
    loadMessages();
  }, [thread.number]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const loadMessages = async () => {
    setLoading(true);
    try {
      const list = await chatEngine.fetchMessages(thread.number);
      setMessages(list as any);
    } catch {
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    const text = newMessage.trim();
    if (!text) return;
    setSending(true);
    try {
      await chatEngine.sendMessage('', text, thread.number);
      setNewMessage('');
      await loadMessages();
    } catch {
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  /* ─── group messages by date ─── */
  const grouped: { label: string; msgs: Message[] }[] = [];
  messages.forEach(m => {
    const label = getDateLabel(m.created_at);
    const last = grouped[grouped.length - 1];
    if (last && last.label === label) {
      last.msgs.push(m);
    } else {
      grouped.push({ label, msgs: [m] });
    }
  });

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col"
      style={{ backgroundColor: '#0d0d0d', backgroundImage: DOT_PATTERN }}
    >
      {/* ═══════════ HEADER ═══════════ */}
      <div
        className="flex items-center gap-3 px-3 py-2.5 z-10"
        style={{
          background: 'linear-gradient(180deg, rgba(18,18,18,0.98) 0%, rgba(13,13,13,0.96) 100%)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          boxShadow: '0 2px 20px rgba(0,0,0,0.4)',
        }}
      >
        {/* Back */}
        <button
          onClick={onBack}
          className="w-10 h-10 flex items-center justify-center rounded-full active:bg-[var(--glass-bg)] transition-colors -ml-1"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--text-primary))" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        {/* Avatar + Name */}
        <div className="relative">
          <img
            src={peer.avatar}
            alt=""
            className="w-10 h-10 rounded-full border-2 border-[var(--glass-border)]"
          />
          <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-[#3fb950] border-2 border-[#0d0d0d]" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-sora font-bold text-[hsl(var(--text-primary))] text-[0.95rem] truncate leading-tight">{peer.name}</h3>
          <p className="text-[11px] text-[#3fb950] font-medium">GitHub User</p>
        </div>

        {/* Three-dot menu */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="w-10 h-10 flex items-center justify-center rounded-full active:bg-[var(--glass-bg)]"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="hsl(var(--text-muted))">
              <circle cx="12" cy="5" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="19" r="2" />
            </svg>
          </button>
          <AnimatePresence>
            {showMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -4 }}
                className="absolute right-0 top-12 w-44 rounded-2xl border border-[var(--glass-border)] overflow-hidden z-50"
                style={{ background: '#1a1a1a', boxShadow: '0 12px 40px rgba(0,0,0,0.6)' }}
              >
                {['View Profile', 'Mute', 'Clear Chat'].map(item => (
                  <button
                    key={item}
                    onClick={() => setShowMenu(false)}
                    className="w-full text-left px-4 py-3 text-sm text-[hsl(var(--text-primary))] hover:bg-[var(--glass-bg)] active:bg-[var(--glass-hover-bg)] transition-colors font-sora"
                  >
                    {item}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ═══════════ MESSAGES ═══════════ */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto no-scrollbar"
        style={{ paddingLeft: 12, paddingRight: 12, paddingTop: 16, paddingBottom: 88 }}
        onClick={() => showMenu && setShowMenu(false)}
      >
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 opacity-50">
            <AppLoader className="w-8 h-8 text-[var(--accent-primary)]" />
            <p className="mt-3 text-[10px] font-black text-[var(--accent-primary)] uppercase tracking-[0.15em]">Loading messages…</p>
          </div>
        ) : (
          grouped.map((group, gi) => (
            <div key={gi}>
              {/* ── Date separator ── */}
              <div className="flex justify-center my-5">
                <span
                  className="px-4 py-1.5 rounded-full text-[10px] font-bold text-[hsl(var(--text-muted))] uppercase tracking-widest"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  {group.label}
                </span>
              </div>

              {group.msgs.map((m, mi) => {
                const isMine = m.user.login === myLogin;
                const showAvatar = !isMine && (mi === 0 || group.msgs[mi - 1]?.user.login === myLogin);

                return (
                  <motion.div
                    key={m.id}
                    variants={bubbleVariants}
                    initial="hidden"
                    animate="visible"
                    className={`flex mb-2 ${isMine ? 'justify-end' : 'justify-start'}`}
                  >
                    {/* Received avatar */}
                    {!isMine && (
                      <div className="w-7 mr-2 flex-shrink-0 self-end">
                        {showAvatar ? (
                          <img src={m.user.avatar_url} alt="" className="w-7 h-7 rounded-full border border-[var(--glass-border)]" />
                        ) : (
                          <div className="w-7" />
                        )}
                      </div>
                    )}

                    {/* Bubble */}
                    <div
                      className="max-w-[78%] relative"
                      style={{
                        backgroundColor: isMine ? '#1a56db' : '#1e1e1e',
                        borderRadius: 18,
                        ...(isMine
                          ? { borderBottomRightRadius: 4 }
                          : { borderBottomLeftRadius: 4 }),
                        padding: '10px 14px',
                        boxShadow: isMine
                          ? '0 2px 12px rgba(26,86,219,0.25)'
                          : '0 2px 8px rgba(0,0,0,0.3)',
                      }}
                    >
                      {/* Sender name for received */}
                      {!isMine && showAvatar && (
                        <p className="text-[11px] font-bold text-[var(--accent-primary)] mb-1">{m.user.login}</p>
                      )}
                      <p className="text-[15px] leading-[1.45] text-[hsl(var(--text-primary))] whitespace-pre-wrap break-words">{m.body}</p>
                      <div className="flex items-center justify-end gap-1.5 mt-1 -mb-0.5">
                        <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                          {formatTime(m.created_at)}
                        </span>
                        {isMine && (
                          <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.5)' }}>✓✓</span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ))
        )}
      </div>

      {/* ═══════════ INPUT BAR ═══════════ */}
      <div className="px-3 pb-4 pt-1" style={{ paddingBottom: 'calc(85px + env(safe-area-inset-bottom, 0px))' }}>
        <div
          className="flex items-center gap-2"
          style={{
            height: 52,
            backgroundColor: '#1a1a1a',
            borderRadius: 30,
            padding: '0 6px 0 16px',
            border: '1px solid rgba(255,255,255,0.06)',
            boxShadow: '0 -2px 20px rgba(0,0,0,0.3)',
          }}
        >
          {/* Attachment */}
          <button className="w-9 h-9 flex items-center justify-center rounded-full active:bg-[var(--glass-bg)] transition-colors flex-shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--text-dim))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
            </svg>
          </button>

          {/* Input */}
          <input
            ref={inputRef}
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Message…"
            className="flex-1 bg-transparent border-none outline-none text-[15px] text-[hsl(var(--text-primary))] font-sora placeholder:text-[#484f58]"
          />

          {/* Send */}
          <button
            onClick={handleSend}
            disabled={sending || !newMessage.trim()}
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all active:scale-90 disabled:opacity-40"
            style={{
              background: newMessage.trim() ? '#1a56db' : 'rgba(255,255,255,0.06)',
              boxShadow: newMessage.trim() ? '0 2px 12px rgba(26,86,219,0.4)' : 'none',
            }}
          >
            {sending ? (
              <AppLoader className="w-4 h-4 text-[hsl(var(--text-primary))]" />
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatThreadScreen;
