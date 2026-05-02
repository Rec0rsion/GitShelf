import React, { useState, useEffect, useRef } from 'react';
import { Native } from '../utils/NativeBridge';
import { FlameIcon, StarIcon, SearchIcon } from './Icons';
import { motion, AnimatePresence } from 'framer-motion';
import { AppLoader } from './AppLoader';

interface TrendingRepo {
  full_name: string;
  name: string;
  description: string;
  stargazers_count: number;
  forks_count: number;
  language: string;
  owner: { login: string; avatar_url: string };
  topics?: string[];
}

type TimeRange = 'daily' | 'weekly' | 'monthly';

const LANG_COLORS: Record<string, string> = {
  JavaScript: '#f1e05a', TypeScript: '#3178c6', Python: '#3572A5',
  Java: '#b07219', 'C++': '#f34b7d', C: '#555555', 'C#': '#178600',
  Go: '#00ADD8', Rust: '#dea584', Ruby: '#701516', PHP: '#4F5D95',
  Swift: '#F05138', Kotlin: '#A97BFF', Dart: '#00B4AB',
  HTML: '#e34c26', CSS: '#563d7c', Shell: '#89e051',
};

const fmtNum = (n: number) => {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'k';
  return String(n);
};

const TrendingTab: React.FC<{ onRepoClick: (slug: string) => void; onBack: () => void }> = ({ onRepoClick, onBack }) => {
  const [repos, setRepos] = useState<TrendingRepo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [timeRange, setTimeRange] = useState<TimeRange>('daily');
  const [language, setLanguage] = useState('');
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [forceRender, setForceRender] = useState(0);

  const getDateQuery = (range: TimeRange) => {
    const now = new Date();
    const d = new Date(now);
    if (range === 'daily') d.setDate(d.getDate() - 1);
    else if (range === 'weekly') d.setDate(d.getDate() - 7);
    else d.setMonth(d.getMonth() - 1);
    return d.toISOString().split('T')[0];
  };

  const fetchTrending = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('gh_token') || '';
      const headers: Record<string, string> = { 'Accept': 'application/vnd.github.v3+json' };
      if (token) headers['Authorization'] = `token ${token}`;

      const dateStr = getDateQuery(timeRange);
      let query = `created:>${dateStr} stars:>5`;
      if (language) query += ` language:${language}`;

      const res = await fetch(`https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=25`, { headers });
      if (!res.ok) throw new Error('Failed to fetch trending');
      const data = await res.json();
      setRepos(data.items || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTrending(); }, [timeRange, language]);

  useEffect(() => {
    const handleUpdate = () => setForceRender(p => p + 1);
    window.addEventListener('gitspace_notifications_updated', handleUpdate);
    return () => window.removeEventListener('gitspace_notifications_updated', handleUpdate);
  }, []);

  const isCollected = (slug: string) => {
    const data = JSON.parse(localStorage.getItem('gitspace_notifications') || '{}');
    return !!data[slug] && data[slug].isCollected !== false;
  };

  const toggleCollect = (repo: TrendingRepo, e: React.MouseEvent) => {
    e.stopPropagation();
    Native.vibrate();
    const data = JSON.parse(localStorage.getItem('gitspace_notifications') || '{}');
    if (data[repo.full_name] && data[repo.full_name].isCollected !== false) {
      data[repo.full_name].isCollected = false;
      if (!data[repo.full_name].isWatching) delete data[repo.full_name];
    } else {
      if (!data[repo.full_name]) {
        data[repo.full_name] = { name: repo.name, owner: repo.owner.login, avatar: repo.owner.avatar_url, isWatching: false, isCollected: true, hasUpdate: false, lastSeenId: 0, lastPublishedAt: '' };
      } else {
        data[repo.full_name].isCollected = true;
      }
    }
    localStorage.setItem('gitspace_notifications', JSON.stringify(data));
    setForceRender(prev => prev + 1);
    window.dispatchEvent(new Event('gitspace_notifications_updated'));
  };

  const LANGUAGES = ['', 'JavaScript', 'TypeScript', 'Python', 'Java', 'Go', 'Rust', 'Kotlin', 'Swift', 'C++', 'C', 'C#', 'Dart', 'Ruby', 'PHP', 'Shell'];

  return (
    <div className="animate-fadeIn w-full pb-24">
      {/* Back Button Bar - Fixed on Top */}
      <div className="fixed top-0 left-0 right-0 z-[150] page-px flex items-center transition-all duration-300" style={{
        background: 'rgba(13, 17, 23, 0.98)',
        backdropFilter: 'blur(32px)',
        WebkitBackdropFilter: 'blur(32px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.15)',
        height: 'calc(env(safe-area-inset-top) + 60px)',
        paddingTop: 'env(safe-area-inset-top)',
      }}>
        <div className="flex items-center justify-between w-full max-w-7xl mx-auto">
          <button onClick={() => { Native.vibrate(); onBack(); }}
            className="flex items-center gap-2 text-[hsl(var(--text-primary))] text-[0.95rem] font-bold bg-transparent border-none p-0 cursor-pointer active:scale-95 transition-transform">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            <div className="w-[1.5px] h-4 bg-white/20 mx-1" />
            Back
          </button>
          <div className="flex items-center gap-2">
            <FlameIcon size={20} color="var(--accent-primary)" />
            <span className="font-sora font-bold text-[hsl(var(--text-primary))] text-[0.95rem]">Trending</span>
          </div>
        </div>
      </div>

      {/* Content Spacer */}
      <div style={{ height: 'calc(env(safe-area-inset-top) + 72px)' }} />

      <div className="space-y-4">
        <button
          onClick={() => setShowLangPicker(!showLangPicker)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[hsl(var(--text-primary))] text-[0.8rem] font-medium active:scale-95 transition-all cursor-pointer"
        >
          {language || 'All Languages'}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9" /></svg>
        </button>

        {/* Time Range */}
        <div className="glass-static flex items-center justify-between rounded-[16px] border border-[var(--glass-border)] px-1 py-1 overflow-hidden select-none bg-white/[0.02]">
          {[
            { id: 'daily' as TimeRange, label: <div className="flex items-center justify-center gap-1.5"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z" /></svg>Today</div> },
            { id: 'weekly' as TimeRange, label: <div className="flex items-center justify-center gap-1.5"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" /></svg>This Week</div> },
            { id: 'monthly' as TimeRange, label: <div className="flex items-center justify-center gap-1.5"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>This Month</div> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => { Native.vibrate(); setTimeRange(tab.id); }}
              className={`flex-1 py-2.5 rounded-xl text-[0.72rem] font-bold transition-all active:scale-95 cursor-pointer
              ${timeRange === tab.id ? 'bg-[var(--accent-primary)] text-[hsl(var(--text-primary))] shadow-lg' : 'text-[hsl(var(--text-muted))]'}
            `}
              style={{ border: 'none' }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Language Picker */}
        <AnimatePresence>
          {showLangPicker && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="grid grid-cols-3 gap-2 mb-4">
                {LANGUAGES.map(l => (
                  <button
                    key={l || '_all'}
                    onClick={() => { setLanguage(l); setShowLangPicker(false); Native.vibrate(); }}
                    className="py-2.5 rounded-xl text-[0.75rem] font-bold transition-all active:scale-95 cursor-pointer"
                    style={{
                      background: language === l ? 'rgba(88,166,255,0.15)' : 'var(--glass-bg)',
                      border: `1px solid ${language === l ? 'rgba(88,166,255,0.35)' : 'rgba(255,255,255,0.06)'}`,
                      color: language === l ? 'var(--accent-primary)' : 'hsl(var(--text-muted))',
                    }}
                  >
                    {l || 'All'}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 opacity-40">
            <AppLoader className="w-8 h-8 text-[var(--accent-primary)] loader" />

          </div>
        ) : error ? (
          <div className="glass-static text-center py-10" style={{ borderRadius: 16 }}>
            <p className="text-[var(--accent-primary)] text-sm mb-4">❌ {error}</p>
            <button onClick={fetchTrending} className="px-4 py-2 rounded-lg bg-[var(--glass-bg)] border border-[var(--glass-border)] text-xs font-sora text-[hsl(var(--text-muted))] cursor-pointer">Retry ↻</button>
          </div>
        ) : (
          <div className="space-y-3">
            {repos.map((repo, i) => {
              const langColor = LANG_COLORS[repo.language] || 'hsl(var(--text-muted))';
              const collected = isCollected(repo.full_name);
              return (
                <motion.div
                  key={repo.full_name}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => onRepoClick(repo.full_name)}
                  className="glass active:scale-[0.99] transition-all cursor-pointer group"
                  style={{ borderRadius: 18, padding: '1rem', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <div className="flex items-start gap-3">
                    {/* Rank */}
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center font-sora font-bold text-[0.85rem]"
                      style={{ background: i < 3 ? 'rgba(227,179,65,0.15)' : 'var(--glass-border)', color: i < 3 ? '#e3b341' : 'hsl(var(--text-dim))', border: i < 3 ? '1px solid rgba(227,179,65,0.3)' : '1px solid rgba(255,255,255,0.06)' }}>
                      {i + 1}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <img src={repo.owner.avatar_url} alt="" className="w-5 h-5 rounded-md" style={{ border: '1px solid var(--glass-border)' }} />
                        <span className="text-[0.72rem] text-[hsl(var(--text-muted))]">@{repo.owner.login}</span>
                      </div>
                      <h3 className="font-sora font-bold text-[hsl(var(--text-primary))] text-[0.95rem] mb-1 truncate group-hover:text-[var(--accent-primary)] transition-colors">{repo.name}</h3>
                      <p className="text-[0.78rem] text-[hsl(var(--text-muted))] line-clamp-2 mb-2 leading-relaxed">{repo.description || 'No description'}</p>

                      <div className="flex items-center gap-3 text-[0.72rem] text-[hsl(var(--text-dim))]">
                        {repo.language && (
                          <span className="flex items-center gap-1">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ background: langColor }} />
                            {repo.language}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <StarIcon size={12} color="#e3b341" /> {fmtNum(repo.stargazers_count)}
                        </span>
                        <span className="flex items-center gap-1">⑂ {fmtNum(repo.forks_count)}</span>
                      </div>
                    </div>

                    {/* Collect */}
                    <button
                      onClick={e => toggleCollect(repo, e)}
                      className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center active:scale-90 transition-all"
                      style={{
                        background: collected ? 'rgba(88,166,255,0.15)' : 'var(--glass-border)',
                        border: `1px solid ${collected ? 'rgba(88,166,255,0.3)' : 'var(--glass-hover-bg)'}`,
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill={collected ? 'var(--accent-primary)' : 'none'} stroke={collected ? 'var(--accent-primary)' : 'hsl(var(--text-dim))'} strokeWidth="2">
                        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                      </svg>
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default TrendingTab;
