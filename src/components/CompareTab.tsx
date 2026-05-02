import React, { useState, useEffect } from 'react';
import { Native } from '../utils/NativeBridge';
import { SearchIcon, StarIcon, ForkIcon, PackageIcon } from './Icons';
import { motion, AnimatePresence } from 'framer-motion';

interface RepoData {
  full_name: string;
  name: string;
  description: string;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  watchers_count: number;
  subscribers_count: number;
  language: string;
  size: number;
  created_at: string;
  updated_at: string;
  pushed_at: string;
  topics: string[];
  license?: { name: string };
  owner: { login: string; avatar_url: string };
  default_branch: string;
}

interface CommitActivity {
  total: number;
  week: number;
  days: number[];
}

interface CompareTabProps {
  onRepoClick: (slug: string) => void;
}

const LANG_COLORS: Record<string, string> = {
  JavaScript: '#f1e05a', TypeScript: '#3178c6', Python: '#3572A5',
  Java: '#b07219', 'C++': '#f34b7d', C: '#555555', 'C#': '#178600',
  Go: '#00ADD8', Rust: '#dea584', Ruby: '#701516', PHP: '#4F5D95',
  Swift: '#F05138', Kotlin: '#A97BFF', Dart: '#00B4AB',
};

const fmtNum = (n: number) => {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'k';
  return String(n);
};

const CompareTab: React.FC<CompareTabProps> = ({ onRepoClick }) => {
  const [repos, setRepos] = useState<(RepoData | null)[]>([null, null]);
  const [slugInputs, setSlugInputs] = useState<string[]>(['', '']);
  const [loading, setLoading] = useState<boolean[]>([false, false]);
  const [error, setError] = useState<string[]>(['', '']);
  const [commitActivity, setCommitActivity] = useState<(CommitActivity[] | null)[]>([null, null]);
  const [savedComparisons, setSavedComparisons] = useState<string[][]>([]);
  const [showSaved, setShowSaved] = useState(false);

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('gitspace_saved_comparisons') || '[]');
    setSavedComparisons(saved);
  }, []);

  const fetchRepo = async (slug: string, index: number) => {
    if (!slug.includes('/')) return;
    const newLoading = [...loading];
    newLoading[index] = true;
    setLoading(newLoading);

    const newError = [...error];
    newError[index] = '';
    setError(newError);

    try {
      const token = localStorage.getItem('gh_token') || '';
      const headers: Record<string, string> = { 'Accept': 'application/vnd.github.v3+json' };
      if (token) headers['Authorization'] = `token ${token}`;

      const [repoRes, activityRes] = await Promise.all([
        fetch(`https://api.github.com/repos/${slug}`, { headers }),
        fetch(`https://api.github.com/repos/${slug}/stats/commit_activity`, { headers }),
      ]);

      if (!repoRes.ok) throw new Error('Repo not found');
      const repoData = await repoRes.json();
      
      const newRepos = [...repos];
      newRepos[index] = repoData;
      setRepos(newRepos);

      if (activityRes.ok) {
        const activity = await activityRes.json();
        const newActivity = [...commitActivity];
        newActivity[index] = Array.isArray(activity) ? activity : null;
        setCommitActivity(newActivity);
      }
    } catch (err: any) {
      const newErr = [...error];
      newErr[index] = err.message;
      setError(newErr);
    } finally {
      const newLoad = [...loading];
      newLoad[index] = false;
      setLoading(newLoad);
    }
  };

  const saveComparison = () => {
    if (!repos[0] || !repos[1]) return;
    const pair = [repos[0].full_name, repos[1].full_name];
    const saved = [...savedComparisons, pair];
    setSavedComparisons(saved);
    localStorage.setItem('gitspace_saved_comparisons', JSON.stringify(saved));
    Native.vibrate();
  };

  const loadComparison = (pair: string[]) => {
    setSlugInputs(pair);
    setShowSaved(false);
    pair.forEach((slug, i) => fetchRepo(slug, i));
  };

  const getWinner = (a: number, b: number) => {
    if (a > b) return 0;
    if (b > a) return 1;
    return -1;
  };

  const trackedRepos = (() => {
    const data = JSON.parse(localStorage.getItem('gitspace_notifications') || '{}');
    return Object.entries(data)
      .filter(([_, v]: any) => v.isCollected !== false)
      .map(([slug, v]: any) => ({ slug, name: v.name, avatar: v.avatar }));
  })();

  const bothLoaded = repos[0] !== null && repos[1] !== null;

  const metrics = bothLoaded ? [
    { label: 'Stars', values: [repos[0]!.stargazers_count, repos[1]!.stargazers_count], icon: '⭐', color: '#e3b341' },
    { label: 'Forks', values: [repos[0]!.forks_count, repos[1]!.forks_count], icon: '🔀', color: 'var(--accent-primary)' },
    { label: 'Open Issues', values: [repos[0]!.open_issues_count, repos[1]!.open_issues_count], icon: '🔴', color: '#f78166' },
    { label: 'Watchers', values: [repos[0]!.watchers_count, repos[1]!.watchers_count], icon: '👁', color: '#d2a8ff' },
    { label: 'Size (KB)', values: [repos[0]!.size, repos[1]!.size], icon: '📦', color: '#3fb950' },
  ] : [];

  const totalCommits = commitActivity.map(ca => {
    if (!ca || !Array.isArray(ca)) return 0;
    return ca.reduce((sum, w) => sum + w.total, 0);
  });

  return (
    <div className="animate-fadeIn w-full space-y-4 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-sora font-bold text-2xl flex items-center gap-2 text-[hsl(var(--text-primary))]">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#d2a8ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
          </svg>
          Compare
        </h2>
        <div className="flex gap-2">
          {bothLoaded && (
            <button onClick={saveComparison} className="text-[10px] font-bold px-3 py-1.5 rounded-lg bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/30 text-[var(--accent-primary)] active:scale-95 transition-all cursor-pointer">
              💾 Save
            </button>
          )}
          {savedComparisons.length > 0 && (
            <button onClick={() => setShowSaved(!showSaved)} className="text-[10px] font-bold px-3 py-1.5 rounded-lg bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[hsl(var(--text-muted))] active:scale-95 transition-all cursor-pointer">
              📋 Saved ({savedComparisons.length})
            </button>
          )}
        </div>
      </div>

      {/* Saved comparisons */}
      <AnimatePresence>
        {showSaved && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="space-y-2 mb-4">
              {savedComparisons.map((pair, i) => (
                <button
                  key={i}
                  onClick={() => loadComparison(pair)}
                  className="w-full glass-static flex items-center justify-between p-3 rounded-xl active:scale-[0.98] transition-all cursor-pointer"
                  style={{ border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <span className="text-[0.8rem] font-sora text-[hsl(var(--text-primary))] truncate">{pair[0]} vs {pair[1]}</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--text-dim))" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ Repo Input Cards ═══ */}
      <div className="grid grid-cols-1 gap-3">
        {[0, 1].map(index => (
          <div key={index} className="glass-static p-4 rounded-[20px]" style={{ border: repos[index] ? `1px solid ${index === 0 ? 'rgba(88,166,255,0.3)' : 'rgba(210,168,255,0.3)'}` : '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                style={{ background: index === 0 ? 'rgba(88,166,255,0.2)' : 'rgba(210,168,255,0.2)', color: index === 0 ? 'var(--accent-primary)' : '#d2a8ff' }}>
                {index === 0 ? 'A' : 'B'}
              </div>
              <span className="text-[10px] font-bold text-[hsl(var(--text-dim))] uppercase tracking-wider">Repository {index + 1}</span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={slugInputs[index]}
                onChange={e => { const ns = [...slugInputs]; ns[index] = e.target.value; setSlugInputs(ns); }}
                onKeyDown={e => e.key === 'Enter' && fetchRepo(slugInputs[index], index)}
                placeholder="owner/repo"
                className="flex-1 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl px-3 py-2.5 text-[hsl(var(--text-primary))] font-mono text-[0.85rem] outline-none focus:border-[var(--accent-primary)]/50 transition-all"
              />
              <button
                onClick={() => fetchRepo(slugInputs[index], index)}
                disabled={loading[index]}
                className="px-4 py-2.5 rounded-xl font-sora font-bold text-sm active:scale-95 transition-all cursor-pointer"
                style={{ background: index === 0 ? 'rgba(88,166,255,0.15)' : 'rgba(210,168,255,0.15)', border: `1px solid ${index === 0 ? 'rgba(88,166,255,0.35)' : 'rgba(210,168,255,0.35)'}`, color: index === 0 ? 'var(--accent-primary)' : '#d2a8ff' }}
              >
                {loading[index] ? '...' : 'Go'}
              </button>
            </div>

            {/* Quick pick from tracked repos */}
            {!repos[index] && trackedRepos.length > 0 && (
              <div className="flex gap-2 mt-3 overflow-x-auto no-scrollbar">
                {trackedRepos.slice(0, 6).map(r => (
                  <button key={r.slug} onClick={() => { const ns = [...slugInputs]; ns[index] = r.slug; setSlugInputs(ns); fetchRepo(r.slug, index); }}
                    className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--glass-bg)] border border-[var(--glass-border)] active:scale-95 transition-all cursor-pointer">
                    {r.avatar && <img src={r.avatar} alt="" className="w-5 h-5 rounded-md" />}
                    <span className="text-[10px] font-bold text-[hsl(var(--text-muted))] truncate max-w-[80px]">{r.name}</span>
                  </button>
                ))}
              </div>
            )}

            {error[index] && <p className="text-[11px] text-[#f78166] mt-2">{error[index]}</p>}

            {/* Loaded repo summary */}
            {repos[index] && (
              <div className="flex items-center gap-3 mt-3 p-3 rounded-xl bg-white/[0.03] border border-[var(--glass-border)]">
                <img src={repos[index]!.owner.avatar_url} alt="" className="w-10 h-10 rounded-xl" style={{ border: '1px solid var(--glass-border)' }} />
                <div className="flex-1 min-w-0">
                  <div className="font-sora font-bold text-[hsl(var(--text-primary))] truncate text-[0.9rem]">{repos[index]!.name}</div>
                  <div className="text-[0.7rem] text-[hsl(var(--text-dim))] truncate">{repos[index]!.description || 'No description'}</div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ═══ Comparison Results ═══ */}
      {bothLoaded && (
        <div className="space-y-4 animate-fadeInUp mt-6">
          {/* Radar-style visual comparison */}
          <div className="glass-static p-5 rounded-[24px]">
            <h3 className="font-sora font-bold text-sm text-[hsl(var(--text-primary))] mb-4 flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>
              Head-to-Head
            </h3>

            {metrics.map((m, i) => {
              const total = m.values[0] + m.values[1];
              const pctA = total > 0 ? (m.values[0] / total) * 100 : 50;
              const w = getWinner(m.values[0], m.values[1]);
              return (
                <div key={i} className="mb-4 last:mb-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-[0.78rem] font-bold ${w === 0 ? 'text-[var(--accent-primary)]' : 'text-[hsl(var(--text-muted))]'}`}>
                      {fmtNum(m.values[0])}
                    </span>
                    <span className="text-[10px] font-bold text-[hsl(var(--text-dim))] uppercase tracking-wider flex items-center gap-1">
                      {m.icon} {m.label}
                    </span>
                    <span className={`text-[0.78rem] font-bold ${w === 1 ? 'text-[#d2a8ff]' : 'text-[hsl(var(--text-muted))]'}`}>
                      {fmtNum(m.values[1])}
                    </span>
                  </div>
                  <div className="flex h-2 rounded-full overflow-hidden" style={{ background: 'var(--glass-border)' }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pctA}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                      className="h-full rounded-l-full"
                      style={{ background: 'linear-gradient(90deg, var(--accent-primary), var(--accent-primary)80)' }}
                    />
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${100 - pctA}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                      className="h-full rounded-r-full"
                      style={{ background: 'linear-gradient(90deg, #d2a8ff80, #d2a8ff)' }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Commit Activity */}
          {(commitActivity[0] || commitActivity[1]) && (
            <div className="glass-static p-5 rounded-[24px]">
              <h3 className="font-sora font-bold text-sm text-[hsl(var(--text-primary))] mb-4">📊 Yearly Commit Activity</h3>
              <div className="flex items-end gap-1 h-20 mb-3">
                {(commitActivity[0] || commitActivity[1] || []).slice(-16).map((_, i) => {
                  const a = commitActivity[0]?.[commitActivity[0].length - 16 + i]?.total || 0;
                  const b = commitActivity[1]?.[commitActivity[1].length - 16 + i]?.total || 0;
                  const max = Math.max(a, b, 1);
                  return (
                    <div key={i} className="flex-1 flex gap-0.5 items-end h-full">
                      <div className="flex-1 rounded-t-sm" style={{ height: `${(a / max) * 100}%`, background: 'rgba(88,166,255,0.6)', minHeight: 2 }} />
                      <div className="flex-1 rounded-t-sm" style={{ height: `${(b / max) * 100}%`, background: 'rgba(210,168,255,0.6)', minHeight: 2 }} />
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center justify-between text-[10px] text-[hsl(var(--text-dim))]">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-sm bg-[var(--accent-primary)]" />
                  <span>{repos[0]!.name}: {totalCommits[0]} commits</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-sm bg-[#d2a8ff]" />
                  <span>{repos[1]!.name}: {totalCommits[1]} commits</span>
                </div>
              </div>
            </div>
          )}

          {/* Detail comparison table */}
          <div className="glass-static p-5 rounded-[24px]">
            <h3 className="font-sora font-bold text-sm text-[hsl(var(--text-primary))] mb-4">📋 Details</h3>
            <div className="space-y-3">
              {[
                { label: 'Language', values: [repos[0]!.language || 'N/A', repos[1]!.language || 'N/A'] },
                { label: 'License', values: [repos[0]!.license?.name || 'None', repos[1]!.license?.name || 'None'] },
                { label: 'Created', values: [new Date(repos[0]!.created_at).toLocaleDateString(), new Date(repos[1]!.created_at).toLocaleDateString()] },
                { label: 'Last Push', values: [new Date(repos[0]!.pushed_at).toLocaleDateString(), new Date(repos[1]!.pushed_at).toLocaleDateString()] },
                { label: 'Topics', values: [repos[0]!.topics?.length || 0, repos[1]!.topics?.length || 0] },
                { label: 'Default Branch', values: [repos[0]!.default_branch, repos[1]!.default_branch] },
              ].map((row, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-[var(--glass-border)] last:border-0">
                  <span className="text-[0.78rem] font-mono text-[var(--accent-primary)] flex-1 text-left truncate">{String(row.values[0])}</span>
                  <span className="text-[10px] font-bold text-[hsl(var(--text-dim))] uppercase tracking-wider mx-3 flex-shrink-0">{row.label}</span>
                  <span className="text-[0.78rem] font-mono text-[#d2a8ff] flex-1 text-right truncate">{String(row.values[1])}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Score summary */}
          <div className="glass-static p-5 rounded-[24px]" style={{ border: '1px solid rgba(227,179,65,0.2)', background: 'rgba(227,179,65,0.03)' }}>
            <h3 className="font-sora font-bold text-sm text-[#e3b341] mb-3 flex items-center gap-2">🏆 Verdict</h3>
            {(() => {
              let scoreA = 0, scoreB = 0;
              metrics.forEach(m => {
                if (m.values[0] > m.values[1]) scoreA++;
                else if (m.values[1] > m.values[0]) scoreB++;
              });
              if (totalCommits[0] > totalCommits[1]) scoreA++;
              else if (totalCommits[1] > totalCommits[0]) scoreB++;
              
              const winner = scoreA > scoreB ? repos[0]! : scoreB > scoreA ? repos[1]! : null;
              return (
                <div className="flex items-center gap-4">
                  {winner ? (
                    <>
                      <img src={winner.owner.avatar_url} alt="" className="w-12 h-12 rounded-2xl" style={{ border: '2px solid #e3b341' }} />
                      <div>
                        <div className="font-sora font-bold text-[hsl(var(--text-primary))] text-[1.1rem]">{winner.name}</div>
                        <div className="text-[11px] text-[#e3b341] font-bold">Wins {Math.max(scoreA, scoreB)}/{metrics.length + 1} categories</div>
                      </div>
                    </>
                  ) : (
                    <div className="font-sora font-bold text-[hsl(var(--text-primary))] text-center w-full">🤝 It's a tie!</div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

export default CompareTab;
