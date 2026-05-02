import React, { useState, useEffect, useRef } from 'react';
import { Native } from '../utils/NativeBridge';
import { SearchIcon, PackageIcon, FlameIcon, SparklesIcon } from './Icons';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { AppLoader } from './AppLoader';
import PRReviewScreen from './PRReviewScreen';

interface Issue {
  id: number;
  number: number;
  title: string;
  state: string;
  created_at: string;
  updated_at: string;
  comments: number;
  user: { login: string; avatar_url: string };
  labels: { name: string; color: string }[];
  pull_request?: any;
  html_url: string;
  body?: string;
}

interface IssuesPRTabProps {
  onRepoClick: (slug: string) => void;
  onBack: () => void;
}

type IssueFilter = 'all' | 'issues' | 'prs';
type IssueState = 'open' | 'closed' | 'all';

const IssuesPRTab: React.FC<IssuesPRTabProps> = ({ onRepoClick, onBack }) => {
  const [selectedRepo, setSelectedRepo] = useState<string>('');
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<IssueFilter>('all');
  const [stateFilter, setStateFilter] = useState<IssueState>('open');
  const [searchQuery, setSearchQuery] = useState('');
  const [labelFilter, setLabelFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [subscribedIssues, setSubscribedIssues] = useState<number[]>([]);
  const [expandedIssue, setExpandedIssue] = useState<number | null>(null);
  const [repoSearch, setRepoSearch] = useState('');
  const [reviewingPR, setReviewingPR] = useState<{ slug: string; number: number } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load tracked repos for the dropdown
  const trackedRepos = (() => {
    const data = JSON.parse(localStorage.getItem('gitspace_notifications') || '{}');
    return Object.entries(data)
      .filter(([_, v]: any) => v.isCollected !== false)
      .map(([slug, v]: any) => ({ slug, name: v.name, owner: v.owner, avatar: v.avatar }));
  })();

  useEffect(() => {
    const subs = JSON.parse(localStorage.getItem('gitspace_subscribed_issues') || '[]');
    setSubscribedIssues(subs);
  }, []);

  const fetchIssues = async (repoSlug: string, isLoadMore = false) => {
    if (!repoSlug) return;
    if (isLoadMore) setLoadingMore(true);
    else { setLoading(true); setIssues([]); }
    setError('');

    try {
      const token = localStorage.getItem('gh_token') || '';
      const headers: Record<string, string> = { 'Accept': 'application/vnd.github.v3+json' };
      if (token) headers['Authorization'] = `token ${token}`;

      const currentPage = isLoadMore ? page + 1 : 1;
      const state = stateFilter === 'all' ? 'all' : stateFilter;
      let url = `https://api.github.com/repos/${repoSlug}/issues?state=${state}&per_page=20&page=${currentPage}&sort=updated&direction=desc`;

      if (labelFilter) url += `&labels=${encodeURIComponent(labelFilter)}`;

      const res = await fetch(url, { headers });
      if (!res.ok) throw new Error('Failed to fetch issues');

      const data: Issue[] = await res.json();

      if (isLoadMore) {
        setIssues(prev => [...prev, ...data]);
        setPage(currentPage);
      } else {
        setIssues(data);
        setPage(1);
      }
      setHasMore(data.length === 20);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (selectedRepo) fetchIssues(selectedRepo);
  }, [selectedRepo, stateFilter, labelFilter]);

  const toggleSubscribe = (issueId: number) => {
    let subs = [...subscribedIssues];
    if (subs.includes(issueId)) {
      subs = subs.filter(id => id !== issueId);
      toast.info('Unsubscribed from issue');
    } else {
      subs.push(issueId);
      toast.success('Subscribed to issue updates');
    }
    setSubscribedIssues(subs);
    localStorage.setItem('gitspace_subscribed_issues', JSON.stringify(subs));
    Native.vibrate();
  };

  const timeAgo = (d: string) => {
    const diff = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const filteredIssues = issues.filter(issue => {
    if (filter === 'issues' && issue.pull_request) return false;
    if (filter === 'prs' && !issue.pull_request) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return issue.title.toLowerCase().includes(q) ||
        issue.user.login.toLowerCase().includes(q) ||
        issue.labels.some(l => l.name.toLowerCase().includes(q));
    }
    return true;
  });

  const filteredRepos = trackedRepos.filter(r =>
    !repoSearch || r.slug.toLowerCase().includes(repoSearch.toLowerCase()) || r.name.toLowerCase().includes(repoSearch.toLowerCase())
  );

  const LABEL_PRESETS = ['bug', 'enhancement', 'help wanted', 'good first issue', 'documentation', 'question'];

  const openCount = issues.filter(i => i.state === 'open' && (filter === 'all' || (filter === 'issues' && !i.pull_request) || (filter === 'prs' && i.pull_request))).length;
  const closedCount = issues.filter(i => i.state === 'closed' && (filter === 'all' || (filter === 'issues' && !i.pull_request) || (filter === 'prs' && i.pull_request))).length;
  const prCount = issues.filter(i => i.pull_request).length;
  const issueCount = issues.filter(i => !i.pull_request).length;

  return (
    <div ref={scrollRef} className="animate-fadeIn w-full pb-24">
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
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span className="font-sora font-bold text-[hsl(var(--text-primary))] text-[0.95rem]">Issues & PRs</span>
          </div>
        </div>
      </div>

      {/* Content Spacer */}
      <div style={{ height: 'calc(env(safe-area-inset-top) + 72px)' }} />

      <div className="space-y-4">

        {/* ═══ Repo Selector ═══ */}
        {!selectedRepo ? (
          <div className="space-y-3">
            <div className="glass-static flex items-center gap-3" style={{ borderRadius: 'var(--btn-radius)', padding: '0.25rem 0.5rem 0.25rem 1.25rem', minHeight: 56 }}>
              <SearchIcon size={20} color="hsl(var(--text-muted))" />
              <input
                type="text"
                value={repoSearch}
                onChange={e => setRepoSearch(e.target.value)}
                placeholder="Search your tracked repos..."
                className="flex-1 bg-transparent border-none outline-none font-sora font-medium"
                style={{ fontSize: '0.9rem', color: 'hsl(var(--text-primary))' }}
              />
            </div>

            <p className="text-[10px] font-bold text-[hsl(var(--text-dim))] uppercase tracking-[0.15em] px-1">
              Select a repository ({trackedRepos.length} tracked)
            </p>

            <div className="grid gap-2">
              {filteredRepos.length === 0 ? (
                <div className="glass-static text-center py-14" style={{ borderRadius: 20 }}>
                  <div className="mb-3 flex justify-center"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg></div>
                  <p className="text-[hsl(var(--text-muted))] font-sora text-sm">No tracked repos found</p>
                  <p className="text-[hsl(var(--text-dim))] text-xs mt-1">Collect repos from Home or Explorer first</p>
                </div>
              ) : (
                filteredRepos.map(repo => (
                  <button
                    key={repo.slug}
                    onClick={() => { Native.vibrate(); setSelectedRepo(repo.slug); }}
                    className="glass-static flex items-center gap-4 text-left active:scale-[0.98] transition-all hover:border-[var(--accent-primary)]/30"
                    style={{ borderRadius: 16, padding: '1rem', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    {repo.avatar && (
                      <img src={repo.avatar} alt="" className="w-10 h-10 rounded-xl" style={{ border: '1px solid var(--glass-border)' }} />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-sora font-bold text-[hsl(var(--text-primary))] truncate" style={{ fontSize: '0.95rem' }}>{repo.name}</div>
                      <div className="text-[0.72rem] text-[hsl(var(--text-dim))]">@{repo.owner}</div>
                    </div>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--text-dim))" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>
                  </button>
                ))
              )}
            </div>
          </div>
        ) : (
          <>
            {/* ═══ Active Repo Header ═══ */}
            <button
              onClick={() => { setSelectedRepo(''); setIssues([]); setSearchQuery(''); setLabelFilter(''); }}
              className="flex items-center gap-2 text-[var(--accent-primary)] font-sora font-bold text-sm mb-2 active:scale-95 transition-transform"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6" /></svg>
              {selectedRepo}
            </button>

            {/* ═══ Stats Row ═══ */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              {[
                { label: 'Open', val: openCount, color: '#3fb950' },
                { label: 'Closed', val: closedCount, color: '#f78166' },
                { label: 'Issues', val: issueCount, color: 'var(--accent-primary)' },
                { label: 'PRs', val: prCount, color: '#d2a8ff' },
              ].map((s, i) => (
                <div key={i} className="glass-static text-center" style={{ borderRadius: 12, padding: '0.7rem 0.4rem' }}>
                  <div className="font-sora font-bold" style={{ fontSize: '1.1rem', color: s.color }}>{s.val}</div>
                  <div style={{ fontSize: '0.6rem', color: 'hsl(var(--text-dim))', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* ═══ Filter Bar ═══ */}
            <div className="space-y-3">
              {/* Type filter */}
              <div className="glass-static flex items-center justify-between rounded-[16px] border border-[var(--glass-border)] px-1 py-1 overflow-hidden select-none bg-white/[0.02]">
                {[
                  { id: 'all' as IssueFilter, label: 'All' },
                  { id: 'issues' as IssueFilter, label: 'Issues' },
                  { id: 'prs' as IssueFilter, label: 'Pull Requests' },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => { Native.vibrate(); setFilter(tab.id); }}
                    className={`flex-1 py-2 rounded-xl text-[0.72rem] font-bold transition-all active:scale-95 cursor-pointer
                    ${filter === tab.id ? 'bg-[var(--accent-primary)] text-[hsl(var(--text-primary))] shadow-lg' : 'text-[hsl(var(--text-muted))]'}
                  `}
                    style={{ border: 'none' }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* State filter */}
              <div className="flex items-center gap-2">
                {[
                  { id: 'open' as IssueState, label: 'Open', color: '#3fb950' },
                  { id: 'closed' as IssueState, label: 'Closed', color: '#f78166' },
                  { id: 'all' as IssueState, label: 'All', color: 'hsl(var(--text-muted))' },
                ].map(s => (
                  <button
                    key={s.id}
                    onClick={() => { Native.vibrate(); setStateFilter(s.id); }}
                    className="flex-1 py-2.5 rounded-xl text-[0.72rem] font-bold transition-all active:scale-95 cursor-pointer"
                    style={{
                      background: stateFilter === s.id ? `${s.color}18` : 'var(--glass-bg)',
                      border: `1px solid ${stateFilter === s.id ? `${s.color}40` : 'rgba(255,255,255,0.06)'}`,
                      color: stateFilter === s.id ? s.color : 'hsl(var(--text-muted))',
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              {/* Label quick filters */}
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1" style={{ WebkitOverflowScrolling: 'touch' }}>
                <button
                  onClick={() => { setLabelFilter(''); Native.vibrate(); }}
                  className="flex-shrink-0 px-3 py-1.5 rounded-lg text-[0.7rem] font-bold transition-all active:scale-95 cursor-pointer"
                  style={{
                    background: !labelFilter ? 'rgba(88,166,255,0.15)' : 'var(--glass-bg)',
                    border: `1px solid ${!labelFilter ? 'rgba(88,166,255,0.3)' : 'rgba(255,255,255,0.06)'}`,
                    color: !labelFilter ? 'var(--accent-primary)' : 'hsl(var(--text-muted))',
                  }}
                >
                  All Labels
                </button>
                {LABEL_PRESETS.map(label => (
                  <button
                    key={label}
                    onClick={() => { setLabelFilter(labelFilter === label ? '' : label); Native.vibrate(); }}
                    className="flex-shrink-0 px-3 py-1.5 rounded-lg text-[0.7rem] font-bold transition-all active:scale-95 cursor-pointer capitalize"
                    style={{
                      background: labelFilter === label ? 'rgba(88,166,255,0.15)' : 'var(--glass-bg)',
                      border: `1px solid ${labelFilter === label ? 'rgba(88,166,255,0.3)' : 'rgba(255,255,255,0.06)'}`,
                      color: labelFilter === label ? 'var(--accent-primary)' : 'hsl(var(--text-muted))',
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Search */}
              <div className="glass-static flex items-center gap-2" style={{ borderRadius: 12, padding: '0.65rem 1rem' }}>
                <SearchIcon size={14} color="hsl(var(--text-muted))" />
                <input
                  type="text"
                  placeholder="Search issues & PRs..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="bg-transparent border-none outline-none w-full text-[hsl(var(--text-primary))] font-sora"
                  style={{ fontSize: '0.82rem' }}
                />
              </div>
            </div>

            {/* ═══ Issues List ═══ */}
            <div className="space-y-2 mt-4">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3 opacity-40">
                  <AppLoader className="w-8 h-8 text-[var(--accent-primary)] loader" />

                </div>
              ) : error ? (
                <div className="glass-static text-center py-10" style={{ borderRadius: 16 }}>
                  <p className="text-[#f78166] text-sm mb-4">❌ {error}</p>
                  <button onClick={() => fetchIssues(selectedRepo)} className="px-4 py-2 rounded-lg bg-[var(--glass-bg)] border border-[var(--glass-border)] text-xs font-sora text-[hsl(var(--text-muted))] cursor-pointer">Retry ↻</button>
                </div>
              ) : filteredIssues.length === 0 ? (
                <div className="glass-static text-center py-16" style={{ borderRadius: 20 }}>
                  <div className="mb-3 flex justify-center">
                    {filter === 'prs' ? (
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#d2a8ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="18" r="3" /><circle cx="6" cy="6" r="3" /><path d="M13 6h3a2 2 0 0 1 2 2v7" /><line x1="6" y1="9" x2="6" y2="21" /></svg>
                    ) : (
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#3fb950" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M16 12l-4-4-4 4M12 8v8" /></svg>
                    )}
                  </div>
                  <p className="text-[hsl(var(--text-muted))] font-sora text-sm">No {filter === 'prs' ? 'pull requests' : 'issues'} found</p>
                  <p className="text-[hsl(var(--text-dim))] text-xs mt-1">Try changing filters or search</p>
                </div>
              ) : (
                <AnimatePresence>
                  {filteredIssues.map((issue) => (
                    <motion.div
                      key={issue.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      style={{
                        background: issue.state === 'open' ? 'rgba(63,185,80,0.02)' : undefined,
                      }}
                      onClick={() => {
                        if (issue.pull_request) {
                          Native.vibrate();
                          setReviewingPR({ slug: selectedRepo, number: issue.number });
                        } else {
                          setExpandedIssue(expandedIssue === issue.id ? null : issue.id);
                        }
                      }}
                    >
                      <div className="flex items-start gap-3">
                        {/* Status icon */}
                        <div className="flex-shrink-0 mt-0.5">
                          {issue.pull_request ? (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={issue.state === 'open' ? '#3fb950' : '#d2a8ff'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="18" cy="18" r="3" />
                              <circle cx="6" cy="6" r="3" />
                              <path d="M13 6h3a2 2 0 0 1 2 2v7" />
                              <line x1="6" y1="9" x2="6" y2="21" />
                            </svg>
                          ) : (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={issue.state === 'open' ? '#3fb950' : '#f78166'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="12" cy="12" r="10" />
                              {issue.state === 'open' ? (
                                <line x1="12" y1="8" x2="12" y2="16" />
                              ) : (
                                <path d="M9 12l2 2 4-4" />
                              )}
                            </svg>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h4 className="font-sora font-bold text-[hsl(var(--text-primary))] text-[0.88rem] leading-tight line-clamp-2">
                              {issue.title}
                            </h4>
                            <span className="text-[10px] text-[hsl(var(--text-dim))] flex-shrink-0 font-mono">#{issue.number}</span>
                          </div>

                          {/* Labels */}
                          {issue.labels.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-2">
                              {issue.labels.slice(0, 4).map(label => (
                                <span
                                  key={label.name}
                                  className="px-2 py-0.5 rounded-md text-[9px] font-bold"
                                  style={{
                                    background: `#${label.color}20`,
                                    border: `1px solid #${label.color}40`,
                                    color: `#${label.color}`,
                                  }}
                                >
                                  {label.name}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Meta */}
                          <div className="flex items-center gap-3 text-[11px] text-[hsl(var(--text-dim))]">
                            <span className="flex items-center gap-1">
                              <img src={issue.user.avatar_url} alt="" className="w-4 h-4 rounded-full" />
                              {issue.user.login}
                            </span>
                            <span>{timeAgo(issue.updated_at)}</span>
                            {issue.comments > 0 && (
                              <span className="flex items-center gap-1">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                                {issue.comments}
                              </span>
                            )}
                          </div>

                          {/* Expanded body */}
                          <AnimatePresence>
                            {expandedIssue === issue.id && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="mt-3 pt-3 border-t border-[var(--glass-border)] overflow-hidden"
                              >
                                {issue.body ? (
                                  <p className="text-[12px] text-[hsl(var(--text-muted))] leading-relaxed line-clamp-6 mb-3 whitespace-pre-wrap">
                                    {issue.body.replace(/[#*`_\[\]]/g, '').substring(0, 500)}
                                  </p>
                                ) : (
                                  <p className="text-[12px] text-[#484f58] italic mb-3">No description provided</p>
                                )}
                                <div className="flex gap-2">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); toggleSubscribe(issue.id); }}
                                    className="px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all active:scale-95 cursor-pointer"
                                    style={{
                                      background: subscribedIssues.includes(issue.id) ? 'rgba(247,129,102,0.1)' : 'rgba(88,166,255,0.1)',
                                      border: `1px solid ${subscribedIssues.includes(issue.id) ? 'rgba(247,129,102,0.3)' : 'rgba(88,166,255,0.3)'}`,
                                      color: subscribedIssues.includes(issue.id) ? '#f78166' : 'var(--accent-primary)',
                                    }}
                                  >
                                    {subscribedIssues.includes(issue.id) ? '🔕 Unsubscribe' : '🔔 Subscribe'}
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); window.open(issue.html_url, '_blank'); }}
                                    className="px-3 py-1.5 rounded-lg text-[10px] font-bold bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[hsl(var(--text-muted))] active:scale-95 transition-all cursor-pointer"
                                  >
                                    Open on GitHub ↗
                                  </button>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}

              {/* Load More */}
              {hasMore && filteredIssues.length > 0 && (
                <button
                  onClick={() => fetchIssues(selectedRepo, true)}
                  disabled={loadingMore}
                  className="w-full py-3 rounded-xl border border-[var(--glass-border)] glass-static hover:bg-[var(--glass-bg)] transition-all text-[var(--accent-primary)] font-sora font-bold text-sm cursor-pointer disabled:opacity-50 active:scale-[0.98]"
                >
                  {loadingMore ? 'Loading more...' : 'Load More'}
                </button>
              )}
            </div>
          </>
        )}
      </div>

      <AnimatePresence>
        {reviewingPR && (
          <PRReviewScreen
            repoSlug={reviewingPR.slug}
            prNumber={reviewingPR.number}
            onClose={() => setReviewingPR(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default IssuesPRTab;
