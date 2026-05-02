import React, { useState, useEffect } from 'react';
import { Native } from '../utils/NativeBridge';
import { motion, AnimatePresence } from 'framer-motion';
import { AppLoader } from './AppLoader';

const LANG_COLORS: Record<string, string> = {
  JavaScript: '#f1e05a', TypeScript: '#3178c6', Python: '#3572A5',
  Java: '#b07219', 'C++': '#f34b7d', C: '#555555', 'C#': '#178600',
  Go: '#00ADD8', Rust: '#dea584', Ruby: '#701516', PHP: '#4F5D95',
  Swift: '#F05138', Kotlin: '#A97BFF', Dart: '#00B4AB',
};

interface InsightsData {
  repo?: any;
  contributors: { login: string; avatar_url: string; contributions: number }[];
  languages: Record<string, number>;
  commitActivity: { total: number; week: number; days: number[] }[];
  codeFrequency: [number, number, number][];
  participation: { all: number[]; owner: number[] };
  openPRs: number;
}

interface RepoInsightsProps {
  repoSlug: string;
  isOpen: boolean;
  onClose: () => void;
}

const RepoInsights: React.FC<RepoInsightsProps> = ({ repoSlug, isOpen, onClose }) => {
  const [data, setData] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeSection, setActiveSection] = useState<'overview' | 'contributors' | 'activity' | 'languages'>('overview');

  useEffect(() => {
    if (!isOpen || !repoSlug) return;
    fetchInsights();
  }, [isOpen, repoSlug]);

  const fetchInsights = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('gh_token') || '';
      const headers: Record<string, string> = { 'Accept': 'application/vnd.github.v3+json' };
      if (token) headers['Authorization'] = `token ${token}`;

      const [repoRes, contribRes, langRes, activityRes, prRes] = await Promise.all([
        fetch(`https://api.github.com/repos/${repoSlug}`, { headers }),
        fetch(`https://api.github.com/repos/${repoSlug}/contributors?per_page=15`, { headers }),
        fetch(`https://api.github.com/repos/${repoSlug}/languages`, { headers }),
        fetch(`https://api.github.com/repos/${repoSlug}/stats/commit_activity`, { headers }),
        fetch(`https://api.github.com/repos/${repoSlug}/pulls?state=open&per_page=1`, { headers }),
      ]);

      const repoInfo = repoRes.ok ? await repoRes.json() : null;
      const contributors = contribRes.ok ? await contribRes.json() : [];
      const languages = langRes.ok ? await langRes.json() : {};
      const commitActivity = activityRes.ok ? await activityRes.json() : [];

      // Get total PRs from Link header or just guess if it's small
      const prLink = prRes.headers.get('Link');
      let openPRs = 0;
      if (prRes.ok) {
        const prData = await prRes.json();
        if (prLink) {
          const match = prLink.match(/page=(\d+)&state=open>; rel="last"/);
          openPRs = match ? parseInt(match[1]) : prData.length;
        } else {
          openPRs = prData.length;
        }
      }

      setData({
        repo: repoInfo,
        contributors: Array.isArray(contributors) ? contributors : [],
        languages,
        commitActivity: Array.isArray(commitActivity) ? commitActivity : [],
        codeFrequency: [],
        participation: { all: [], owner: [] },
        openPRs: openPRs
      });
    } catch (err) {
      console.error('Failed to fetch insights', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const totalLangBytes = data ? Object.values(data.languages).reduce((a, b) => a + b, 0) : 0;
  const langEntries = data ? Object.entries(data.languages).sort((a, b) => b[1] - a[1]) : [];
  const totalCommits = data?.commitActivity?.reduce((sum, w) => sum + w.total, 0) || 0;
  const avgPerWeek = data?.commitActivity?.length ? Math.round(totalCommits / data.commitActivity.length) : 0;
  const maxWeeklyCommits = data?.commitActivity ? Math.max(...data.commitActivity.map(w => w.total), 1) : 1;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[3000] bg-[#0f141d]/70 backdrop-blur-md"
        onClick={onClose}
      />
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 z-[3001] bg-[var(--bg-primary)] border-t border-[var(--glass-border)] rounded-t-[32px] overflow-y-auto no-scrollbar"
        style={{ maxHeight: '92vh', paddingBottom: 'calc(2rem + env(safe-area-inset-bottom, 24px))' }}
      >
        <div className="p-6">
          <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-6 shrink-0" />

          <div className="flex items-center justify-between mb-6">
            <h3 className="font-sora font-bold text-xl text-[hsl(var(--text-primary))] flex items-center gap-2">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
              </svg>
              Repository Insights
            </h3>
            <button onClick={onClose} className="p-2 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[hsl(var(--text-muted))] cursor-pointer active:scale-90 transition-all">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12" /></svg>
            </button>
          </div>

          {/* Section tabs */}
          <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar pb-1">
            {[
              { id: 'overview' as const, label: '📋 Health & Pulse' },
              { id: 'contributors' as const, label: '👥 Contributors' },
              { id: 'languages' as const, label: '🔤 Codebase' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => { setActiveSection(tab.id); Native.vibrate(); }}
                className={`flex-shrink-0 px-4 py-2 rounded-xl text-[0.75rem] font-bold transition-all active:scale-95 cursor-pointer ${activeSection === tab.id ? 'bg-[var(--accent-primary)] text-[hsl(var(--text-primary))]' : 'bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[hsl(var(--text-muted))]'
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <AppLoader className="w-8 h-8 text-[var(--accent-primary)] loader" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--accent-primary)] mt-3">Analyzing repository...</p>
            </div>
          ) : data ? (
            <div className="space-y-4">
              {/* OVERVIEW */}
              {activeSection === 'overview' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <motion.div
                      key="commits"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="glass-static p-5 rounded-3xl flex flex-col justify-between overflow-hidden relative group hover:border-[var(--glass-border)] transition-all"
                    >
                      <div className="absolute -top-4 -right-4 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5"><path d="M12 20V10M18 20V4M6 20v-4" /></svg>
                      </div>
                      <div className="text-[10px] text-[hsl(var(--text-dim))] font-black uppercase tracking-[0.2em] mb-3">Development</div>
                      <div className="text-3xl font-sora font-black text-[hsl(var(--text-primary))] tracking-tighter">{totalCommits}</div>
                      <div className="text-[11px] text-[var(--accent-primary)] font-bold mt-2 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)] animate-pulse" />
                        Commits this year
                      </div>
                    </motion.div>

                    <motion.div
                      key="contribs"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className="glass-static p-5 rounded-3xl flex flex-col justify-between group hover:border-[var(--glass-border)] transition-all"
                    >
                      <div className="text-[10px] text-[hsl(var(--text-dim))] font-black uppercase tracking-[0.2em] mb-3">Community</div>
                      <div className="text-3xl font-sora font-black text-[#d2a8ff] tracking-tighter">{data.contributors.length}</div>
                      <div className="text-[11px] text-[hsl(var(--text-muted))] font-bold mt-2">Active developers</div>
                    </motion.div>

                    <motion.div
                      key="maintenance"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="glass-static p-6 rounded-3xl col-span-2 relative overflow-hidden group hover:border-[var(--glass-border)] transition-all"
                    >
                      <div className="flex items-center justify-between mb-6">
                        <span className="text-[10px] text-[hsl(var(--text-dim))] font-black uppercase tracking-[0.2em]">Maintenance Pulse</span>
                        {data.repo && (
                          <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${new Date(data.repo.pushed_at).getTime() > Date.now() - 30 * 86400000
                              ? 'bg-[#3fb950]/10 text-[#3fb950] border border-[#3fb950]/20'
                              : 'bg-[#f78166]/10 text-[#f78166] border border-[#f78166]/20'
                            }`}>
                            {new Date(data.repo.pushed_at).getTime() > Date.now() - 30 * 86400000 ? 'Active' : 'Stale'}
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-6 relative z-10">
                        <div className="flex flex-col">
                          <div className="text-[10px] text-[hsl(var(--text-dim))] font-bold uppercase mb-1">Issues</div>
                          <div className="text-2xl font-sora font-black text-[hsl(var(--text-primary))]">{Math.max(0, data.repo?.open_issues_count - data.openPRs)}</div>
                        </div>
                        <div className="flex flex-col border-l border-[var(--glass-border)] pl-6">
                          <div className="text-[10px] text-[hsl(var(--text-dim))] font-bold uppercase mb-1">PRs</div>
                          <div className="text-2xl font-sora font-black text-[#3fb950]">{data.openPRs}</div>
                        </div>
                        <div className="flex flex-col border-l border-[var(--glass-border)] pl-6">
                          <div className="text-[10px] text-[hsl(var(--text-dim))] font-bold uppercase mb-1">Forks</div>
                          <div className="text-2xl font-sora font-black text-[#e3b341]">{data.repo?.forks_count}</div>
                        </div>
                      </div>
                    </motion.div>

                    <div className="glass-static p-5 rounded-[22px] col-span-2">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-[var(--glass-bg)] flex items-center justify-center border border-[var(--glass-border)]">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--text-muted))" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
                        </div>
                        <div>
                          <p className="text-[10px] text-[hsl(var(--text-dim))] font-bold uppercase tracking-widest">Project Timeline</p>
                          <p className="text-[0.88rem] text-[hsl(var(--text-primary))] font-bold">
                            Created {new Date(data.repo?.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short' })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-[hsl(var(--text-muted))] border-t border-[var(--glass-border)] pt-4">
                        <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)]" /> Last push {new Date(data.repo?.pushed_at).toLocaleDateString()}</span>
                        <span className="flex items-center gap-1.5">{data.repo?.license ? (
                          <span className="flex items-center gap-1.5 text-[#e3b341]"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg> {data.repo.license.spdx_id || data.repo.license.name}</span>
                        ) : 'No License'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Top language bar */}
                  <div className="glass-static p-5 rounded-[22px]">
                    <h4 className="text-xs font-bold text-[hsl(var(--text-dim))] uppercase tracking-wider mb-3">Language Distribution</h4>
                    <div className="flex h-3 rounded-full overflow-hidden mb-3">
                      {langEntries.slice(0, 6).map(([lang, bytes]) => (
                        <div key={lang} style={{ width: `${(bytes / totalLangBytes) * 100}%`, background: LANG_COLORS[lang] || 'hsl(var(--text-muted))' }} title={`${lang}: ${((bytes / totalLangBytes) * 100).toFixed(1)}%`} />
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {langEntries.slice(0, 5).map(([lang, bytes]) => (
                        <div key={lang} className="flex items-center gap-1.5 text-[11px] text-[hsl(var(--text-muted))]">
                          <span className="w-2 h-2 rounded-full" style={{ background: LANG_COLORS[lang] || 'hsl(var(--text-muted))' }} />
                          {lang} {((bytes / totalLangBytes) * 100).toFixed(1)}%
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* CONTRIBUTORS */}
              {activeSection === 'contributors' && (
                <div className="space-y-2">
                  {data.contributors.map((c, i) => (
                    <div key={c.login} className="glass-static flex items-center gap-3 p-3 rounded-[16px]">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center font-sora font-bold text-xs" style={{
                        background: i < 3 ? 'rgba(227,179,65,0.15)' : 'var(--glass-border)',
                        color: i < 3 ? '#e3b341' : 'hsl(var(--text-dim))',
                        border: i < 3 ? '1px solid rgba(227,179,65,0.3)' : '1px solid rgba(255,255,255,0.06)'
                      }}>{i + 1}</div>
                      <img src={c.avatar_url} alt="" className="w-10 h-10 rounded-xl" style={{ border: '1px solid var(--glass-border)' }} />
                      <div className="flex-1 min-w-0">
                        <div className="font-sora font-bold text-[hsl(var(--text-primary))] text-[0.88rem] truncate">{c.login}</div>
                        <div className="text-[0.72rem] text-[hsl(var(--text-dim))]">{c.contributions} commits</div>
                      </div>
                      <div className="text-right">
                        <div className="h-2 w-20 rounded-full bg-[var(--glass-bg)] overflow-hidden">
                          <div className="h-full rounded-full bg-[var(--accent-primary)]" style={{ width: `${(c.contributions / data.contributors[0].contributions) * 100}%` }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* LANGUAGES */}
              {activeSection === 'languages' && (
                <div className="space-y-3">
                  {langEntries.map(([lang, bytes], i) => {
                    const pct = ((bytes / totalLangBytes) * 100);
                    return (
                      <div key={lang} className="glass-static p-4 rounded-[16px]">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full" style={{ background: LANG_COLORS[lang] || 'hsl(var(--text-muted))' }} />
                            <span className="font-sora font-bold text-[hsl(var(--text-primary))] text-[0.85rem]">{lang}</span>
                          </div>
                          <span className="text-[0.78rem] font-mono text-[var(--accent-primary)] font-bold">{pct.toFixed(1)}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-[var(--glass-bg)] overflow-hidden">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.5, delay: i * 0.05 }}
                            className="h-full rounded-full" style={{ background: LANG_COLORS[lang] || 'hsl(var(--text-muted))' }} />
                        </div>
                        <div className="text-[10px] text-[#484f58] mt-1 font-mono">{(bytes / 1024).toFixed(0)} KB</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-20 text-[#484f58]">No data available</div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default RepoInsights;
