import React, { useState, useEffect } from 'react';
import { Native } from '../utils/NativeBridge';
import { BellIcon, StarIcon, PackageIcon, SparklesIcon, ClockIcon, FlameIcon } from './Icons';
import { motion, AnimatePresence } from 'framer-motion';
import { AppLoader } from './AppLoader';

interface FeedEvent {
  id: string;
  type: string;
  actor: { login: string; avatar_url: string };
  repo: { name: string };
  payload: any;
  created_at: string;
}

type FeedFilter = 'all' | 'push' | 'star' | 'release' | 'issue' | 'fork' | 'pr';

const ActivityFeed: React.FC<{ onRepoClick: (slug: string) => void; onUserClick?: (username: string) => void; onBack: () => void }> = ({ onRepoClick, onUserClick, onBack }) => {
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<FeedFilter>('all');
  const [feedSource, setFeedSource] = useState<'received' | 'personal' | 'watched'>('received');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchFeed = async (isLoadMore = false) => {
    if (isLoadMore) {/* don't clear */ } else { setLoading(true); setEvents([]); }
    setError('');

    try {
      const token = localStorage.getItem('gh_token') || '';
      if (!token) throw new Error('Please add a GitHub Token to view your activity feed');
      const headers: Record<string, string> = { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github.v3+json' };

      // First get username
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const userRes = await fetch('https://api.github.com/user', { headers, signal: controller.signal });
      clearTimeout(timeoutId);

      if (!userRes.ok) throw new Error('Failed to fetch user');
      const user = await userRes.json();

      const currentPage = isLoadMore ? page + 1 : 1;
      let url = '';

      if (feedSource === 'received') {
        url = `https://api.github.com/users/${user.login}/received_events?per_page=30&page=${currentPage}`;
      } else if (feedSource === 'personal') {
        url = `https://api.github.com/users/${user.login}/events?per_page=30&page=${currentPage}`;
      } else {
        // Watched repos events from tracked repos
        const trackedRepos = Object.keys(JSON.parse(localStorage.getItem('gitspace_notifications') || '{}'));
        if (trackedRepos.length === 0) throw new Error('No tracked repos. Visit Collection to add repos.');
        // Fetch events for first 5 tracked repos
        const allEvents: FeedEvent[] = [];
        for (const slug of trackedRepos.slice(0, 5)) {
          try {
            const res = await fetch(`https://api.github.com/repos/${slug}/events?per_page=10`, { headers });
            if (res.ok) {
              const data = await res.json();
              allEvents.push(...data);
            }
          } catch { }
        }
        allEvents.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setEvents(allEvents.slice(0, 30));
        setHasMore(false);
        setLoading(false);
        return;
      }

      const res = await fetch(url, { headers });
      if (!res.ok) throw new Error('Failed to fetch activity');
      const data: FeedEvent[] = await res.json();

      if (isLoadMore) {
        setEvents(prev => [...prev, ...data]);
        setPage(currentPage);
      } else {
        setEvents(data);
        setPage(1);
      }
      setHasMore(data.length === 30);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchFeed(); }, [feedSource]);

  const timeAgo = (d: string) => {
    const diff = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'PushEvent': return { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><line x1="12" y1="9" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="15" /></svg>, color: 'var(--accent-primary)', label: 'pushed to' };
      case 'WatchEvent': return { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>, color: '#e3b341', label: 'starred' };
      case 'CreateEvent': return { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" /></svg>, color: '#3fb950', label: 'created' };
      case 'DeleteEvent': return { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>, color: '#f78166', label: 'deleted' };
      case 'ForkEvent': return { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="18" r="3" /><circle cx="6" cy="6" r="3" /><circle cx="18" cy="6" r="3" /><path d="M18 9v1a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V9" /><path d="M12 12v3" /></svg>, color: '#d2a8ff', label: 'forked' };
      case 'IssuesEvent': return { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>, color: '#f78166', label: 'issue' };
      case 'IssueCommentEvent': return { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>, color: 'hsl(var(--text-muted))', label: 'commented on' };
      case 'PullRequestEvent': return { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="18" r="3" /><circle cx="6" cy="6" r="3" /><path d="M13 6h3a2 2 0 0 1 2 2v7" /><line x1="6" y1="9" x2="6" y2="21" /></svg>, color: '#d2a8ff', label: 'pull request' };
      case 'PullRequestReviewEvent': return { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><path d="M9 15l2 2 4-4" /></svg>, color: '#238636', label: 'reviewed' };
      case 'ReleaseEvent': return { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" /></svg>, color: '#3fb950', label: 'released' };
      case 'MemberEvent': return { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>, color: '#d2a8ff', label: 'added member' };
      default: return { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>, color: 'hsl(var(--text-dim))', label: type.replace('Event', '').toLowerCase() };
    }
  };

  const getEventDetail = (event: FeedEvent) => {
    const p = event.payload;
    switch (event.type) {
      case 'PushEvent':
        const commits = p.commits?.length || 0;
        const msg = p.commits?.[0]?.message?.split('\n')[0] || '';
        return `${commits} commit${commits > 1 ? 's' : ''}: "${msg}"`;
      case 'WatchEvent': return 'Starred this repository';
      case 'CreateEvent': return `Created ${p.ref_type || 'repository'}${p.ref ? `: ${p.ref}` : ''}`;
      case 'ForkEvent': return `Forked to ${p.forkee?.full_name || ''}`;
      case 'IssuesEvent': return `${p.action} issue: ${p.issue?.title || ''}`;
      case 'IssueCommentEvent': return `on: ${p.issue?.title || ''}`;
      case 'PullRequestEvent': return `${p.action} PR: ${p.pull_request?.title || ''}`;
      case 'ReleaseEvent': return `${p.release?.tag_name || ''} — ${p.release?.name || 'New Release'}`;
      default: return '';
    }
  };

  const filterMap: Record<FeedFilter, string[]> = {
    all: [],
    push: ['PushEvent'],
    star: ['WatchEvent'],
    release: ['ReleaseEvent', 'CreateEvent'],
    issue: ['IssuesEvent', 'IssueCommentEvent'],
    fork: ['ForkEvent'],
    pr: ['PullRequestEvent', 'PullRequestReviewEvent'],
  };

  const filteredEvents = filter === 'all' ? events : events.filter(e => filterMap[filter]?.includes(e.type));

  return (
    <div className="animate-fadeIn w-full pb-24">
      {/* Back Button Bar - Fixed on Top (only if onBack provided) */}
      {onBack && (
        <>
          <div className="fixed top-0 left-0 right-0 z-[150] px-4 flex items-center transition-all duration-300" style={{
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
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
                <span className="font-sora font-bold text-[hsl(var(--text-primary))] text-[0.95rem]">Shorts</span>
              </div>
            </div>
          </div>
          {/* Content Spacer */}
          <div style={{ height: 'calc(env(safe-area-inset-top) + 72px)' }} />
        </>
      )}

      <div className="space-y-4">

        {/* Source Tabs */}
        <div className="glass-static flex items-center justify-between rounded-[16px] border border-[var(--glass-border)] px-1 py-1 overflow-hidden select-none bg-white/[0.02]">
          {[
            { id: 'received' as const, label: <div className="flex items-center justify-center gap-1.5"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="21 15 12 21 3 15" /><polyline points="21 8 12 14 3 8" /><polyline points="21 22 12 22 3 22" stroke="transparent" /></svg>Received</div> },
            { id: 'personal' as const, label: <div className="flex items-center justify-center gap-1.5"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>Personal</div> },
            { id: 'watched' as const, label: <div className="flex items-center justify-center gap-1.5"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>Tracked</div> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => { Native.vibrate(); setFeedSource(tab.id); }}
              className={`flex-1 py-2.5 rounded-xl text-[0.72rem] font-bold transition-all active:scale-95 cursor-pointer
              ${feedSource === tab.id ? 'bg-[var(--accent-primary)] text-[hsl(var(--text-primary))] shadow-lg' : 'text-[hsl(var(--text-muted))]'}
            `}
              style={{ border: 'none' }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Filter chips */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1" style={{ WebkitOverflowScrolling: 'touch' }}>
          {[
            { id: 'all' as FeedFilter, label: 'All', icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><line x1="9" y1="9" x2="15" y2="9" /><line x1="9" y1="15" x2="15" y2="15" /></svg> },
            { id: 'push' as FeedFilter, label: 'Commits', icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><line x1="12" y1="9" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="15" /></svg> },
            { id: 'star' as FeedFilter, label: 'Stars', icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg> },
            { id: 'release' as FeedFilter, label: 'Releases', icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" /></svg> },
            { id: 'issue' as FeedFilter, label: 'Issues', icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg> },
            { id: 'pr' as FeedFilter, label: 'PRs', icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="18" r="3" /><circle cx="6" cy="6" r="3" /><path d="M13 6h3a2 2 0 0 1 2 2v7" /><line x1="6" y1="9" x2="6" y2="21" /></svg> },
            { id: 'fork' as FeedFilter, label: 'Forks', icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="18" r="3" /><circle cx="6" cy="6" r="3" /><circle cx="18" cy="6" r="3" /><path d="M18 9v1a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V9" /><path d="M12 12v3" /></svg> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => { Native.vibrate(); setFilter(tab.id); }}
              className="flex-shrink-0 px-3 py-1.5 rounded-lg text-[0.72rem] font-bold transition-all active:scale-95 cursor-pointer"
              style={{
                background: filter === tab.id ? 'rgba(88,166,255,0.15)' : 'var(--glass-bg)',
                border: `1px solid ${filter === tab.id ? 'rgba(88,166,255,0.3)' : 'rgba(255,255,255,0.06)'}`,
                color: filter === tab.id ? 'var(--accent-primary)' : 'hsl(var(--text-muted))',
              }}
            >
              <span className="flex items-center justify-center gap-1.5">{tab.icon} {tab.label}</span>
            </button>
          ))}
        </div>

        {/* Feed */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 opacity-40">
            <AppLoader className="w-8 h-8 text-[var(--accent-primary)] loader" />

          </div>
        ) : error ? (
          <div className="glass-static text-center py-10" style={{ borderRadius: 16 }}>
            <p className="text-[#f78166] text-sm mb-4">❌ {error}</p>
            <button onClick={() => fetchFeed()} className="px-4 py-2 rounded-lg bg-[var(--glass-bg)] border border-[var(--glass-border)] text-xs font-sora text-[hsl(var(--text-muted))] cursor-pointer">Retry ↻</button>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="glass-static text-center py-16" style={{ borderRadius: 20 }}>
            <div className="text-3xl mb-3">📭</div>
            <p className="text-[hsl(var(--text-muted))] font-sora text-sm">No activity found</p>
            <p className="text-[hsl(var(--text-dim))] text-xs mt-1">Try changing filters or source</p>
          </div>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-5 top-0 bottom-0 w-[2px] bg-[var(--glass-bg)]" />

            <div className="space-y-1">
              {filteredEvents.map((event, i) => {
                const { icon, color, label } = getEventIcon(event.type);
                const detail = getEventDetail(event);
                return (
                  <motion.div
                    key={event.id || `${event.type}-${i}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className="relative pl-12 py-3 group"
                  >
                    {/* Timeline dot */}
                    <div className="absolute left-3 top-5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] z-10 bg-[var(--glass-bg)] border border-[var(--glass-border)]">
                      {icon}
                    </div>

                    <div className="rounded-[28px] overflow-hidden border border-[var(--glass-border)] relative group bg-white/[0.02]"
                      style={{
                        boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                      }}
                      onClick={() => onRepoClick(event.repo.name)}
                    >
                      <div className="p-4 flex items-start gap-3">
                        <button
                          onClick={(e) => { e.stopPropagation(); onUserClick?.(event.actor.login); }}
                          className="flex-shrink-0 bg-transparent border-none cursor-pointer p-0"
                        >
                          <img src={event.actor.avatar_url} alt="" className="w-8 h-8 rounded-lg" style={{ border: '1px solid var(--glass-border)' }} />
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <button
                              onClick={(e) => { e.stopPropagation(); onUserClick?.(event.actor.login); }}
                              className="font-sora font-bold text-[hsl(var(--text-primary))] text-[0.82rem] bg-transparent border-none cursor-pointer p-0 hover:text-[var(--accent-primary)] transition-colors"
                            >
                              {event.actor.login}
                            </button>
                            <span className="text-[0.72rem] text-[hsl(var(--text-dim))]">{label}</span>
                            <span className="font-mono text-[0.72rem] text-[var(--accent-primary)] truncate max-w-[140px]">{event.repo.name.split('/')[1]}</span>
                            <span className="text-[10px] text-[#484f58] ml-auto flex-shrink-0">{timeAgo(event.created_at)}</span>
                          </div>
                          {detail && (
                            <p className="text-[11px] text-[hsl(var(--text-muted))] mt-1 line-clamp-2 leading-relaxed">{detail}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* Load More */}
        {hasMore && filteredEvents.length > 0 && (
          <button
            onClick={() => fetchFeed(true)}
            className="w-full py-3 rounded-xl border border-[var(--glass-border)] glass-static hover:bg-[var(--glass-bg)] transition-all text-[var(--accent-primary)] font-sora font-bold text-sm cursor-pointer active:scale-[0.98]"
          >
            Load More Activity
          </button>
        )}
      </div>
    </div>
  );
};

export default ActivityFeed;
