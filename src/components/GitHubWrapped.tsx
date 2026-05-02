import React, { useState, useMemo } from 'react';
import { Native } from '../utils/NativeBridge';
import { motion, AnimatePresence } from 'framer-motion';

const LANG_COLORS: Record<string, string> = {
  JavaScript: '#f1e05a', TypeScript: '#3178c6', Python: '#3572A5',
  Java: '#b07219', 'C++': '#f34b7d', C: '#555555', 'C#': '#178600',
  Go: '#00ADD8', Rust: '#dea584', Ruby: '#701516', PHP: '#4F5D95',
  Swift: '#F05138', Kotlin: '#A97BFF', Dart: '#00B4AB',
};

interface WrappedStats {
  totalTracked: number;
  totalWatched: number;
  topLanguages: { name: string; count: number }[];
  topOwners: { name: string; avatar: string; count: number }[];
  totalApps: number;
  firstTrackedDate: string;
  hasUpdates: number;
  recentViews: number;
}

const GitHubWrapped: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const stats = useMemo<WrappedStats>(() => {
    const notifications = JSON.parse(localStorage.getItem('gitspace_notifications') || '{}');
    const recentViews = JSON.parse(localStorage.getItem('gitspace_recent_views') || '[]');

    const entries = Object.entries(notifications);
    const watched = entries.filter(([_, v]: any) => v.isWatching);
    const collected = entries.filter(([_, v]: any) => v.isCollected !== false);
    const apps = entries.filter(([_, v]: any) => v.isApp);
    const withUpdates = entries.filter(([_, v]: any) => v.hasUpdate);



    // Language stats from cache
    const langMap: Record<string, number> = {};
    const ownerMap: Record<string, { count: number; avatar: string }> = {};
    const cache = JSON.parse(localStorage.getItem('gitspace_repo_cache') || '{}');

    Object.values(cache).forEach((c: any) => {
      if (c.repo?.language) {
        langMap[c.repo.language] = (langMap[c.repo.language] || 0) + 1;
      }
      if (c.repo?.owner?.login) {
        if (!ownerMap[c.repo.owner.login]) {
          ownerMap[c.repo.owner.login] = { count: 0, avatar: c.repo.owner.avatar_url || '' };
        }
        ownerMap[c.repo.owner.login].count++;
      }
    });

    // Also count from notifications data
    entries.forEach(([slug, v]: any) => {
      const owner = v.owner || slug.split('/')[0];
      if (!ownerMap[owner]) {
        ownerMap[owner] = { count: 0, avatar: v.avatar || '' };
      }
      ownerMap[owner].count++;
    });

    const topLanguages = Object.entries(langMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    const topOwners = Object.entries(ownerMap)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5)
      .map(([name, data]) => ({ name, avatar: data.avatar, count: data.count }));



    // First tracked date
    const dates = entries.map(([_, v]: any) => v.updatedAt || '').filter(Boolean).sort();

    return {
      totalTracked: entries.length,
      totalWatched: watched.length,
      topLanguages,
      topOwners,
      totalApps: apps.length,
      firstTrackedDate: dates[0] || '',
      hasUpdates: withUpdates.length,
      recentViews: recentViews.length,
    };
  }, [isOpen]);

  const slides = [
    // Slide 0: Intro
    {
      bg: 'linear-gradient(135deg, var(--bg-primary) 0%, #161b22 50%, #1f2937 100%)',
      content: (
        <div className="text-center">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.2 }} className="text-7xl mb-6">🚀</motion.div>
          <motion.h2 initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }}
            className="font-sora font-extrabold text-3xl text-[hsl(var(--text-primary))] mb-3">
            Your <span className="text-[var(--accent-primary)]">GitShelf</span> Wrapped
          </motion.h2>
          <motion.p initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.6 }}
            className="text-[hsl(var(--text-muted))] text-sm">
            Let's see what you've been tracking...
          </motion.p>
        </div>
      )
    },
    // Slide 1: Total repos
    {
      bg: 'linear-gradient(135deg, var(--bg-primary) 0%, #0a1929 50%, var(--bg-primary) 100%)',
      content: (
        <div className="text-center">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.2 }}
            className="w-24 h-24 rounded-3xl bg-[var(--accent-primary)]/15 flex items-center justify-center mx-auto mb-6 border border-[var(--accent-primary)]/25">
            <span className="text-5xl">📦</span>
          </motion.div>
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}
            className="font-sora font-extrabold text-5xl text-[var(--accent-primary)] mb-2">{stats.totalTracked}</motion.div>
          <motion.p initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }}
            className="text-[hsl(var(--text-muted))] text-lg font-sora">repositories tracked</motion.p>
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.7 }}
            className="mt-6 flex items-center justify-center gap-6 text-sm">
            <div className="text-center"><div className="font-bold text-[#3fb950] text-xl">{stats.totalWatched}</div><div className="text-[hsl(var(--text-dim))] text-xs">Watched</div></div>

            <div className="w-px h-8 bg-[var(--glass-hover-bg)]" />
            <div className="text-center"><div className="font-bold text-[#e3b341] text-xl">{stats.totalApps}</div><div className="text-[hsl(var(--text-dim))] text-xs">Apps</div></div>
          </motion.div>
        </div>
      )
    },
    // Slide 2: Top Languages
    {
      bg: 'linear-gradient(135deg, var(--bg-primary) 0%, #1a0a2e 50%, var(--bg-primary) 100%)',
      content: (
        <div>
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-center mb-8">
            <span className="text-4xl mb-3 block">💜</span>
            <h3 className="font-sora font-bold text-xl text-[hsl(var(--text-primary))]">Your Top Languages</h3>
          </motion.div>
          <div className="space-y-3">
            {stats.topLanguages.length > 0 ? stats.topLanguages.map((lang, i) => (
              <motion.div key={lang.name} initial={{ x: -50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.2 + i * 0.15 }}
                className="glass-static flex items-center gap-3 p-4 rounded-2xl">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm"
                  style={{ background: `${LANG_COLORS[lang.name] || 'hsl(var(--text-muted))'}20`, color: LANG_COLORS[lang.name] || 'hsl(var(--text-muted))' }}>
                  {i + 1}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: LANG_COLORS[lang.name] || 'hsl(var(--text-muted))' }} />
                    <span className="font-sora font-bold text-[hsl(var(--text-primary))]">{lang.name}</span>
                  </div>
                </div>
                <span className="text-[hsl(var(--text-dim))] text-sm font-mono">{lang.count} repos</span>
              </motion.div>
            )) : (
              <div className="text-center text-[hsl(var(--text-dim))] text-sm py-8">Not enough data yet — browse more repos!</div>
            )}
          </div>
        </div>
      )
    },
    // Slide 3: Top Developers
    {
      bg: 'linear-gradient(135deg, var(--bg-primary) 0%, #0a2914 50%, var(--bg-primary) 100%)',
      content: (
        <div>
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-center mb-8">
            <span className="text-4xl mb-3 block">⭐</span>
            <h3 className="font-sora font-bold text-xl text-[hsl(var(--text-primary))]">Your Favorite Developers</h3>
          </motion.div>
          <div className="space-y-3">
            {stats.topOwners.length > 0 ? stats.topOwners.map((owner, i) => (
              <motion.div key={owner.name} initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.2 + i * 0.15 }}
                className="glass-static flex items-center gap-3 p-4 rounded-2xl">
                {owner.avatar ? (
                  <img src={owner.avatar} alt="" className="w-10 h-10 rounded-xl" style={{ border: '1px solid var(--glass-border)' }} />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-[var(--glass-hover-bg)] flex items-center justify-center text-sm font-bold text-[hsl(var(--text-dim))]">{owner.name[0]}</div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-sora font-bold text-[hsl(var(--text-primary))] truncate">@{owner.name}</div>
                  <div className="text-[0.72rem] text-[hsl(var(--text-dim))]">{owner.count} repos tracked</div>
                </div>
                <div className="text-xl">{i === 0 ? '👑' : i === 1 ? '🥈' : i === 2 ? '🥉' : '⭐'}</div>
              </motion.div>
            )) : (
              <div className="text-center text-[hsl(var(--text-dim))] text-sm py-8">Start tracking repos to see your favorites!</div>
            )}
          </div>
        </div>
      )
    },
    // Slide 4: Summary
    {
      bg: 'linear-gradient(135deg, var(--bg-primary) 0%, #1a1a0a 50%, var(--bg-primary) 100%)',
      content: (
        <div className="text-center">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.2 }} className="text-6xl mb-6">🎉</motion.div>
          <motion.h3 initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }}
            className="font-sora font-extrabold text-2xl text-[hsl(var(--text-primary))] mb-2">That's a Wrap!</motion.h3>
          <motion.p initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.6 }}
            className="text-[hsl(var(--text-muted))] text-sm mb-8 leading-relaxed">
            You're an amazing developer who stays on top of {stats.totalTracked} repositories.
            {stats.totalApps > 0 ? ` You've also discovered ${stats.totalApps} open-source apps!` : ''}
          </motion.p>
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.8 }}
            className="glass-static p-5 rounded-2xl text-left space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-[hsl(var(--text-dim))]">🔔 Active Updates</span><span className="font-bold text-[#3fb950]">{stats.hasUpdates}</span></div>

            <div className="flex justify-between"><span className="text-[hsl(var(--text-dim))]">👁 Recently Viewed</span><span className="font-bold text-[var(--accent-primary)]">{stats.recentViews}</span></div>
            <div className="flex justify-between"><span className="text-[hsl(var(--text-dim))]">📱 Apps Found</span><span className="font-bold text-[#e3b341]">{stats.totalApps}</span></div>
          </motion.div>
        </div>
      )
    },
  ];

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[5000]" style={{ background: slides[currentSlide].bg }}>

        {/* Close button */}
        <button onClick={onClose} className="absolute top-12 right-4 z-10 p-2 rounded-xl bg-[var(--glass-hover-bg)] border border-white/15 text-[hsl(var(--text-primary))] cursor-pointer active:scale-90 transition-all">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12" /></svg>
        </button>

        {/* Slide content */}
        <div className="flex flex-col items-center justify-center h-full px-8">
          <AnimatePresence mode="wait">
            <motion.div key={currentSlide} initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}
              className="w-full max-w-sm">
              {slides[currentSlide].content}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Progress dots and navigation */}
        <div className="absolute left-0 right-0 flex flex-col items-center gap-6"
          style={{ bottom: 'calc(env(safe-area-inset-bottom, 24px) + 24px)' }}>
          <div className="flex gap-2">
            {slides.map((_, i) => (
              <button key={i} onClick={() => setCurrentSlide(i)} className="cursor-pointer bg-transparent border-none p-0">
                <div className={`h-1.5 rounded-full transition-all ${i === currentSlide ? 'w-8 bg-[var(--accent-primary)]' : 'w-2 bg-white/20'}`} />
              </button>
            ))}
          </div>

          <div className="flex gap-4">
            {currentSlide > 0 && (
              <button onClick={() => { setCurrentSlide(currentSlide - 1); Native.vibrate(); }}
                className="px-6 py-3 rounded-2xl bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[hsl(var(--text-muted))] font-sora font-bold text-sm cursor-pointer active:scale-95 transition-all">
                ← Back
              </button>
            )}
            {currentSlide < slides.length - 1 ? (
              <button onClick={() => { setCurrentSlide(currentSlide + 1); Native.vibrate(); }}
                className="px-6 py-3 rounded-2xl bg-[var(--accent-primary)] text-[hsl(var(--text-primary))] font-sora font-bold text-sm cursor-pointer active:scale-95 transition-all shadow-lg shadow-[var(--accent-primary)]/30">
                Next →
              </button>
            ) : (
              <button onClick={() => { onClose(); Native.vibrate(); }}
                className="px-6 py-3 rounded-2xl bg-[#3fb950] text-[hsl(var(--text-primary))] font-sora font-bold text-sm cursor-pointer active:scale-95 transition-all shadow-lg shadow-[#3fb950]/30">
                Done ✨
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default GitHubWrapped;
