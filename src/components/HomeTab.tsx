import React, { useState, useEffect, useRef } from 'react';
import { repoCache } from '../utils/repoCache';
import { Native } from '../utils/NativeBridge';
import { PackageIcon, BellIcon, ClockIcon, FlameIcon, ZapIcon, SearchIcon, StarIcon, ForkIcon, LanguagesIcon, SortIcon, BookmarkIcon, MessageIcon, EyeIcon, EyeOffIcon } from './Icons';
import RepoOpener from './RepoOpener';

interface GHUser {
  login: string;
  id: number;
  avatar_url: string;
}
import { motion, AnimatePresence } from 'framer-motion';
import { AppLoader } from './AppLoader';
import { RepoCardSkeleton } from './SkeletonLoader';

interface GHRepo {
  full_name: string;
  name: string;
  description: string;
  stargazers_count: number;
  forks_count: number;
  language: string;
  visibility: string;
  topics?: string[];
  owner: {
    login: string;
    avatar_url: string;
  };
}

const LANGUAGES = [
  'All', 'Kotlin', 'Java', 'JavaScript', 'TypeScript', 'Python', 'Swift', 'Rust', 'Go', 'C#', 'C++', 'C', 'Dart', 'Ruby', 'PHP'
];

type SortType = 'stars' | 'forks' | 'updated' | 'best-match';

interface HomeTabProps {
  onTabChange: (t: any) => void;
  onRepoClick: (slug: string) => void;
  onAppClick: (slug: string) => void;
  onUserClick: (username: string) => void;
  sortMode: SortType;
  setSortMode: (mode: SortType) => void;
  onOpenSort: () => void;
  lang: string;
  setLang: (lang: string) => void;
  onOpenLang: () => void;
  onOpenRecentlyViewed?: () => void;
}

const HomeTab: React.FC<HomeTabProps> = ({ onTabChange, onRepoClick, onAppClick, onUserClick, sortMode, setSortMode, onOpenSort, lang, setLang, onOpenLang, onOpenRecentlyViewed }) => {
  const [repos, setRepos] = useState<GHRepo[]>(() => repoCache.get<GHRepo[]>('home_trending_repos') ?? []);
  const [search, setSearch] = useState(() => repoCache.get<string>('home_search') ?? '');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>(() => repoCache.get<'desc' | 'asc'>('home_sort_order') ?? 'desc');
  const [page, setPage] = useState(() => repoCache.get<number>('home_page') ?? 1);
  const [hasMore, setHasMore] = useState(() => repoCache.get<boolean>('home_has_more') ?? true);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [selectedTopic, setSelectedTopic] = useState(() => repoCache.get<string>('home_topic') ?? 'All');
  const [forceRender, setForceRender] = useState(0);
  const [searchMode, setSearchMode] = useState<'repo' | 'user'>(() => repoCache.get<'repo' | 'user'>('home_search_mode') ?? 'repo');
  const [users, setUsers] = useState<GHUser[]>(() => repoCache.get<GHUser[]>('home_search_users') ?? []);
  const [watchedUsers, setWatchedUsers] = useState<Record<string, any>>({});

  useEffect(() => {
    const updateWatched = () => {
      const data = JSON.parse(localStorage.getItem('gitspace_watched_users') || '{}');
      setWatchedUsers(data);
    };
    updateWatched();
    window.addEventListener('gitspace_notifications_updated', updateWatched);
    return () => window.removeEventListener('gitspace_notifications_updated', updateWatched);
  }, []);

  const toggleWatchUser = (u: any, e: React.MouseEvent) => {
    e.stopPropagation();
    Native.vibrate();
    const current = JSON.parse(localStorage.getItem('gitspace_watched_users') || '{}');
    if (current[u.login]) delete current[u.login];
    else current[u.login] = { avatar: u.avatar_url, subscribedAt: new Date().toISOString() };
    localStorage.setItem('gitspace_watched_users', JSON.stringify(current));
    setWatchedUsers(current);
    window.dispatchEvent(new Event('gitspace_notifications_updated'));
  };

  // Pull-to-refresh state
  const [pullY, setPullY] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const touchStartY = useRef(0);

  const fetchTrends = async (isLoadMore = false) => {
    if (isLoadMore) setLoadingMore(true);
    else {
      setLoading(true);
      setRepos([]);
    }
    setError('');

    try {
      const token = localStorage.getItem('gh_token');
      const headers: Record<string, string> = { 'Accept': 'application/vnd.github.v3+json' };
      if (token) headers['Authorization'] = `token ${token}`;

      let query = search.trim() ? `${search}` : '';
      const currentPage = isLoadMore ? page + 1 : 1;

      if (searchMode === 'user') {
        const url = `https://api.github.com/search/users?q=${encodeURIComponent(query || 'followers:>=1000')}&sort=followers&order=desc&per_page=20&page=${currentPage}`;
        const res = await fetch(url, { headers });
        if (!res.ok) throw new Error('API limit reached.');
        const data = await res.json();
        const newItems = data.items || [];
        if (isLoadMore) {
          setUsers(prev => [...prev, ...newItems]);
          setPage(currentPage);
        } else {
          setUsers(newItems);
          setPage(1);
        }
        setHasMore(newItems.length === 20);
      } else {
        if (selectedTopic !== 'All') {
          const topicTerm = selectedTopic.toLowerCase();
          query = query ? `${query} ${topicTerm}` : topicTerm;
        }

        if (!query) {
          if (sortMode === 'stars') query = 'stars:>10000';
          else if (sortMode === 'forks') query = 'forks:>5000';
          else query = 'pushed:>2024-01-01';
        }

        if (lang !== 'All') {
          query += ` language:${lang}`;
        }

        const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}${sortMode === 'best-match' ? '' : `&sort=${sortMode}`}&order=${sortOrder}&per_page=20&page=${currentPage}`;
        const res = await fetch(url, { headers });

        if (!res.ok) {
          if (res.status === 403) throw new Error('API rate limit exceeded. Add a token in Explorer Settings.');
          throw new Error('Failed to fetch real-time trends.');
        }

        const data = await res.json();
        const newItems = data.items || [];

        if (isLoadMore) {
          setRepos(prev => [...prev, ...newItems]);
          setPage(currentPage);
        } else {
          setRepos(newItems);
          setPage(1);
        }
        setHasMore(newItems.length === 20);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setIsRefreshing(false);
      setPullY(0);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      touchStartY.current = e.touches[0].clientY;
    } else {
      touchStartY.current = -1;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartY.current === -1 || isRefreshing) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - touchStartY.current;
    if (diff > 0 && diff < 150) {
      setPullY(diff);
    }
  };

  const handleTouchEnd = () => {
    if (pullY > 80 && !isRefreshing) {
      setIsRefreshing(true);
      Native.vibrate();
      fetchTrends(false);
    } else {
      setPullY(0);
    }
  };

  useEffect(() => {
    repoCache.set('home_trending_repos', repos);
    repoCache.set('home_search_users', users);
    repoCache.set('home_sort', sortMode);
    repoCache.set('home_lang', lang);
    repoCache.set('home_search', search);
    repoCache.set('home_sort_order', sortOrder);
    repoCache.set('home_page', page);
    repoCache.set('home_has_more', hasMore);
    repoCache.set('home_topic', selectedTopic);
    repoCache.set('home_search_mode', searchMode);
  }, [repos, users, sortMode, lang, search, sortOrder, page, hasMore, selectedTopic, searchMode]);

  useEffect(() => {
    // Fetch trends whenever filter parameters change
    const timer = setTimeout(() => {
      fetchTrends(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [sortMode, lang, search, sortOrder, selectedTopic, searchMode]);

  const [hiddenWidgets, setHiddenWidgets] = useState<string[]>(() => JSON.parse(localStorage.getItem('gitspace_hidden_widgets') || '[]'));

  useEffect(() => {
    const handleUpdate = () => setForceRender(prev => prev + 1);
    const handleWidgetsUpdate = () => setHiddenWidgets(JSON.parse(localStorage.getItem('gitspace_hidden_widgets') || '[]'));
    window.addEventListener('gitspace_notifications_updated', handleUpdate);
    window.addEventListener('gitspace_widgets_updated', handleWidgetsUpdate);
    return () => {
      window.removeEventListener('gitspace_notifications_updated', handleUpdate);
      window.removeEventListener('gitspace_widgets_updated', handleWidgetsUpdate);
    };
  }, []);

  const fmtNum = (n: number) => {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
    return n.toString();
  };

  const LANG_COLORS: Record<string, string> = {
    JavaScript: '#f1e05a', TypeScript: '#3178c6', Python: '#3572A5', Java: '#b07219', 'C++': '#f34b7d', Rust: '#dea584', Go: '#00ADD8', Kotlin: '#A97BFF', Swift: '#F05138', PHP: '#4F5D95'
  };

  const toggleCollect = (repo: GHRepo, e: React.MouseEvent) => {
    e.stopPropagation();
    const data = JSON.parse(localStorage.getItem('gitspace_notifications') || '{}');
    if (data[repo.full_name] && data[repo.full_name].isCollected !== false) {
      data[repo.full_name].isCollected = false;
      if (!data[repo.full_name].isWatching) {
        delete data[repo.full_name];
      }
    } else {
      Native.vibrate();
      if (!data[repo.full_name]) {
        data[repo.full_name] = { name: repo.name, owner: repo.owner.login, avatar: repo.owner.avatar_url, isWatching: false, isCollected: true, hasUpdate: false, lastSeenId: 0, lastPublishedAt: '' };
      } else {
        data[repo.full_name].isCollected = true;
      }
    }
    localStorage.setItem('gitspace_notifications', JSON.stringify(data));
    setForceRender(prev => prev + 1);
    Native.vibrate();
    window.dispatchEvent(new Event('gitspace_notifications_updated'));
  };

  const toggleWatch = (repo: GHRepo, e: React.MouseEvent) => {
    e.stopPropagation();
    const data = JSON.parse(localStorage.getItem('gitspace_notifications') || '{}');
    if (!data[repo.full_name]) {
      data[repo.full_name] = {
        name: repo.name, owner: repo.owner.login, avatar: repo.owner.avatar_url,
        isWatching: true, isCollected: false, hasUpdate: false, lastSeenId: 0, lastPublishedAt: '',
        updatedAt: new Date().toISOString(),
        subscribedAt: new Date().toISOString(),
        folder: 'General'
      };
    } else {
      data[repo.full_name].isWatching = !data[repo.full_name].isWatching;
      if (data[repo.full_name].isWatching) {
        data[repo.full_name].updatedAt = new Date().toISOString();
        data[repo.full_name].subscribedAt = data[repo.full_name].subscribedAt || new Date().toISOString();
      }
      if (data[repo.full_name].isCollected === false && !data[repo.full_name].isWatching) {
        delete data[repo.full_name];
      }
    }
    localStorage.setItem('gitspace_notifications', JSON.stringify(data));
    setForceRender(prev => prev + 1);
    Native.vibrate();
    window.dispatchEvent(new Event('gitspace_notifications_updated'));
  };

  // Home data
  const notifications = JSON.parse(localStorage.getItem('gitspace_notifications') || '{}');
  const trackedRepos = Object.entries(notifications).filter(([_, v]: any) => v.isCollected !== false);
  const updatedRepos = Object.entries(notifications).filter(([_, v]: any) => v.hasUpdate && v.isWatching);
  const recentViews: any[] = JSON.parse(localStorage.getItem('gitspace_recent_views') || '[]').slice(0, 6);

  const isCollected = (slug: string) => !!notifications[slug] && notifications[slug].isCollected !== false;
  const isWatching = (slug: string) => !!notifications[slug]?.isWatching;

  return (
    <div
      className="flex flex-col gap-4 w-full relative"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull-to-refresh indicator */}
      <div
        className="absolute left-0 right-0 flex items-center justify-center transition-all pointer-events-none z-50"
        style={{
          top: -40 + (pullY / 2),
          opacity: pullY / 100,
          transform: `scale(${Math.min(1, pullY / 100)}) rotate(${pullY * 2}deg)`
        }}
      >
        <div className="bg-[var(--accent-primary)] p-2 rounded-full shadow-lg border border-[var(--glass-border)]">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={isRefreshing ? "animate-spin" : ""}>
            <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
            <polyline points="21 3 21 8 16 8" />
          </svg>
        </div>
      </div>

      {/* ═══ Home Quick Stats ═══ */}
      {!hiddenWidgets.includes('stats') && (
        <div className="animate-fadeInUp">
          <div className="grid grid-cols-3 gap-4 mt-1 mb-6 w-full">
            {[
              {
                icon: <FlameIcon size={30} color="#f78166" />,
                label: 'Trending',
                color: '#f78166',
                tab: 'trending',
                glow: 'rgba(247, 129, 102, 0.4)',
                desc: 'See what\'s hot'
              },
              {
                icon: <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#3fb950" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>,
                label: 'Downloads',
                color: '#3fb950',
                tab: 'downloads',
                glow: 'rgba(63, 185, 80, 0.4)',
                desc: 'Local assets'
              },
              {
                icon: <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 8v4l3 3" /></svg>,
                label: 'Recent',
                color: 'var(--accent-primary)',
                tab: 'recently_viewed',
                glow: 'rgba(88, 166, 255, 0.4)',
                desc: 'Latest feed'
              },
            ].map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{
                  delay: i * 0.1,
                  type: 'spring',
                  stiffness: 260,
                  damping: 20
                }}
                whileTap={{ scale: 0.95 }}
                onClick={() => { 
                  Native.vibrate(); 
                  if (s.tab === 'recently_viewed') {
                    onOpenRecentlyViewed?.();
                  } else {
                    onTabChange(s.tab); 
                  }
                }}
                className="group relative flex flex-col items-center justify-center rounded-[24px] cursor-pointer overflow-hidden border border-[var(--glass-border)] transition-all duration-300"
                style={{
                  minHeight: 88,
                  padding: '12px 6px',
                  background: 'var(--glass-bg)',
                  backdropFilter: 'blur(32px)',
                  WebkitBackdropFilter: 'blur(32px)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
                }}
              >
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity">
                  <div className="absolute inset-0" style={{ background: `radial-gradient(circle at top right, ${s.color}, transparent 60%)` }} />
                </div>

                {/* Main Icon with adaptive size */}
                <div className="relative z-10 transition-all duration-500 group-hover:scale-110 mb-3 drop-shadow-2xl" style={{ color: s.color }}>
                  {React.cloneElement(s.icon as React.ReactElement, { size: 24, color: s.color })}
                </div>

                <div className="relative z-10 text-center">
                  <span className="block font-sora font-black text-[10px] uppercase tracking-[0.16em] text-[hsl(var(--text-primary))] leading-none mb-1.5 shadow-sm">
                    {s.label}
                  </span>
                  <span className="block font-sora font-extrabold text-[7px] text-[hsl(var(--text-dim))] uppercase tracking-widest opacity-50">
                    {s.desc}
                  </span>
                </div>

                {/* Ambient glow highlight */}
                <div className="absolute bottom-0 left-0 right-0 h-[2.5px] opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{ background: `linear-gradient(90deg, transparent, ${s.color}, transparent)` }}
                />
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ Repos with Updates ═══ */}
      {!hiddenWidgets.includes('updates') && updatedRepos.length > 0 && (
        <div className="animate-fadeInUp-1 mb-1">
          <p className="flex items-center gap-1.5" style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#f78166', marginBottom: '0.5rem', fontWeight: 700 }}><FlameIcon size={12} color="#f78166" /> New Releases</p>
          <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
            {updatedRepos.slice(0, 5).map(([slug, v]: any) => (
              <button
                key={slug}
                onClick={() => onRepoClick(slug)}
                className="flex-shrink-0 glass flex items-center gap-2.5 transition-all hover:border-[#f78166]/30 active:scale-[0.97]"
                style={{ borderRadius: 12, padding: '0.55rem 0.8rem', border: '1px solid rgba(247,129,102,0.2)', cursor: 'pointer', background: 'rgba(247,129,102,0.06)', maxWidth: 160 }}
              >
                <div style={{ width: 26, height: 26, borderRadius: 6, overflow: 'hidden', border: '1px solid var(--glass-border)', flexShrink: 0 }}>
                  <img src={v.avatar} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="min-w-0 text-left">
                  <div className="font-sora font-bold text-[hsl(var(--text-primary))] truncate" style={{ fontSize: '0.7rem' }}>{v.name}</div>
                  <div className="truncate" style={{ fontSize: '0.58rem', color: '#f78166', fontWeight: 600 }}>{v.latestTagName || 'Update'}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Feed Section */}
      {!hiddenWidgets.includes('feed') && (
        <>
          {/* Advanced Search Bar & Navigation */}
          <div className="animate-fadeInUp-1 space-y-4 mb-6">
            <div className="glass-static flex items-center gap-4" style={{ borderRadius: 'var(--btn-radius)', padding: '0.25rem 0.5rem 0.25rem 1.25rem', minHeight: 56 }}>
              <SearchIcon size={20} color="hsl(var(--text-muted))" />
              <input
                type="text"
                placeholder={searchMode === 'repo' ? "Search repo, description..." : "Search users..."}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-transparent border-none outline-none w-full text-[hsl(var(--text-primary))] font-sora font-medium"
                style={{ fontSize: '1rem' }}
              />
              {search && (
                <button onClick={() => setSearch('')} className="p-2 text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text-primary))] transition-colors cursor-pointer shrink-0">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              )}
              <div className="flex bg-[var(--glass-bg)] p-1 rounded-xl border border-[var(--glass-border)] shrink-0 mr-1">
                <button
                  onClick={() => { Native.vibrate(); setSearchMode('repo'); }}
                  className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tight transition-all ${searchMode === 'repo' ? 'bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border border-[var(--accent-primary)]/30 shadow-[0_0_15px_rgba(88,166,255,0.15)]' : 'text-[hsl(var(--text-dim))]'}`}
                >
                  Repo
                </button>
                <button
                  onClick={() => { Native.vibrate(); setSearchMode('user'); }}
                  className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tight transition-all ${searchMode === 'user' ? 'bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border border-[var(--accent-primary)]/30 shadow-[0_0_15px_rgba(88,166,255,0.15)]' : 'text-[hsl(var(--text-dim))]'}`}
                >
                  User
                </button>
              </div>
            </div>

            {searchMode === 'repo' && (
              <>
                {/* Navigation Chips (Minimalist Text-only) */}
                <div className="glass-static flex items-center justify-between rounded-[20px] border border-[var(--glass-border)] px-2 py-3 overflow-hidden select-none bg-white/[0.02]">
                  {[
                    { id: 'All', color: 'var(--accent-primary)' },
                    { id: 'Android', color: '#3fb950' },
                    { id: 'Windows', color: '#1d9bf0' },
                    { id: 'MacOS', color: 'hsl(var(--text-primary))' },
                    { id: 'Linux', color: '#d29922' },
                  ].map(chip => (
                    <button
                      key={chip.id}
                      onClick={() => { Native.vibrate(); setSelectedTopic(chip.id); }}
                      className={`flex-1 transition-all active:scale-95 cursor-pointer text-center font-sora font-bold text-[0.68rem] tracking-tight
                     ${(selectedTopic === chip.id) ? 'opacity-100' : 'opacity-40'}
                   `}
                      style={{ color: (selectedTopic === chip.id) ? chip.color : 'hsl(var(--text-muted))' }}
                    >
                      {chip.id}
                    </button>
                  ))}
                </div>

                {/* Filter Selection Bar */}
                <div className="flex items-center gap-4 px-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[0.7rem] font-bold text-[hsl(var(--text-dim))] uppercase tracking-wider flex items-center gap-1.5">
                      <LanguagesIcon size={14} color="hsl(var(--text-dim))" />
                      Language:
                    </span>
                    <button
                      onClick={() => { onOpenLang(); Native.vibrate(); }}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[hsl(var(--text-primary))] text-[0.8rem] font-medium active:scale-95 transition-all cursor-pointer"
                    >
                      {lang === 'All' ? 'All' : lang}
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9" /></svg>
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[0.7rem] font-bold text-[hsl(var(--text-dim))] uppercase tracking-wider flex items-center gap-1.5">
                      <SortIcon size={14} color="hsl(var(--text-dim))" />
                      Sort:
                    </span>
                    <button
                      onClick={() => { onOpenSort(); Native.vibrate(); }}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[hsl(var(--text-primary))] text-[0.8rem] font-medium active:scale-95 transition-all cursor-pointer"
                    >
                      {sortMode === 'best-match' ? 'Best Match' : sortMode.charAt(0).toUpperCase() + sortMode.slice(1)}
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9" /></svg>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* ═══ Instagram-Style Repo Feed ═══ */}
          <div className="space-y-5 animate-fadeInUp-2 mb-10">
            {loading ? (
              <div className="flex flex-col gap-5">
                <RepoCardSkeleton />
                <RepoCardSkeleton />
                <RepoCardSkeleton />
              </div>
            ) : error ? (
              <div className="glass-static text-center py-10" style={{ borderRadius: 16 }}>
                <p className="text-[#f78166] text-sm mb-4">❌ {error}</p>
                <button onClick={() => fetchTrends(false)} className="px-4 py-2 rounded-lg bg-[var(--glass-bg)] border border-[var(--glass-border)] text-xs font-sora text-[hsl(var(--text-muted))] cursor-pointer">Retry ↻</button>
              </div>
            ) : searchMode === 'user' ? (
              users.length === 0 ? (
                <div className="text-center py-20 opacity-40">
                  <div style={{ marginBottom: '1rem' }}><SearchIcon size={40} color="hsl(var(--text-muted))" /></div>
                  <p className="font-sora font-medium text-sm">No users found</p>
                </div>
              ) : (
                <div className="space-y-3 px-1">
                  {users.map((u) => (
                    <div key={u.id} onClick={() => onUserClick(u.login)} className="flex items-center gap-4 bg-white/[0.02] border border-[var(--glass-border)] p-4 rounded-[22px] hover:bg-white/[0.05] cursor-pointer transition-all">
                      <img src={u.avatar_url} className="w-14 h-14 rounded-full border-2 border-[var(--glass-border)]" alt={u.login} />
                      <div className="flex-1 min-w-0">
                        <p className="font-sora font-extrabold text-[hsl(var(--text-primary))] truncate">{u.login}</p>
                        <p className="text-[0.8rem] text-[hsl(var(--text-muted))] font-bold font-mono">@{u.login}</p>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-[var(--glass-bg)] flex items-center justify-center transition-all opacity-40">
                        <EyeIcon size={18} color="hsl(var(--text-muted))" />
                      </div>
                    </div>
                  ))}
                  {hasMore && (
                    <button
                      onClick={() => fetchTrends(true)}
                      disabled={loadingMore}
                      className="w-full py-4 rounded-xl border border-[var(--glass-border)] glass-static hover:bg-[var(--glass-bg)] transition-all text-[hsl(var(--text-muted))] font-sora font-semibold text-sm cursor-pointer disabled:opacity-50 mt-4"
                    >
                      {loadingMore ? 'Loading...' : 'Load More Users ↓'}
                    </button>
                  )}
                </div>
              )
            ) : repos.length === 0 ? (
              <div className="text-center py-20 opacity-40">
                <div style={{ marginBottom: '1rem' }}><SearchIcon size={40} color="hsl(var(--text-muted))" /></div>
                <p className="font-sora font-medium text-sm">No repositories found</p>
              </div>
            ) : (
              <>
                {repos.map((r, i) => {
                  const langColor = LANG_COLORS[r.language] || 'var(--accent-primary)';
                  const collected = isCollected(r.full_name);
                  const watching = isWatching(r.full_name);
                  return (
                    <motion.div
                      key={`${r.full_name}-${i}`}
                      layout
                      initial={{ opacity: 0, y: 30, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{
                        delay: Math.min(i * 0.05, 0.4),
                        type: 'spring',
                        stiffness: 200,
                        damping: 24
                      }}
                      onClick={() => { Native.hapticImpact('Light'); onRepoClick(r.full_name); }}
                      style={{
                        minHeight: 400,
                        borderRadius: 32,
                        position: 'relative',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'flex-end',
                        boxShadow: '0 12px 40px rgba(0,0,0,0.3), inset 0 1px 1px rgba(255,255,255,0.1)',
                      }}
                    >
                      <div className="absolute inset-0 z-0 backdrop-blur-3xl" />

                      <div style={{
                        position: 'absolute', inset: 0,
                        background: `radial-gradient(circle at 50% 50%, ${langColor}15 0%, transparent 80%)`,
                        zIndex: 1
                      }} />

                      {/* ─── High Fidelity Language Label (Top Empty Space) ─── */}
                      <div className="absolute top-10 left-0 right-0 flex items-center justify-center pointer-events-none z-[2] overflow-hidden">
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 0.1, y: 0 }}
                          className="font-black text-white uppercase tracking-[0.2em] whitespace-nowrap select-none"
                          style={{
                            fontSize: '3.5rem',
                            filter: 'blur(1px)',
                          }}
                        >
                          {r.language || 'Code'}
                        </motion.div>
                      </div>

                      {/* Hero Banner Area (Now just a subtle top glow) */}
                      <div style={{
                        position: 'absolute', top: 0, left: 0, right: 0, height: 180,
                        background: `linear-gradient(180deg, ${langColor}20 0%, transparent 100%)`,
                        overflow: 'hidden',
                        zIndex: 1
                      }}>
                        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.4) 1px, transparent 0)', backgroundSize: '32px 32px' }} />
                      </div>

                      {/* Ambient glow background */}
                      <div style={{
                        position: 'absolute', inset: 0, pointerEvents: 'none',
                        background: `radial-gradient(ellipse at 25% 15%, ${langColor}10 0%, transparent 60%), radial-gradient(ellipse at 75% 45%, ${langColor}05 0%, transparent 55%), radial-gradient(circle at bottom right, ${langColor}0a 0%, transparent 40%)`,
                      }} />

                      {/* Right side action buttons */}
                      <div style={{
                        position: 'absolute', right: 16, bottom: 130,
                        display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center', zIndex: 10,
                      }}>
                        <motion.button
                          whileTap={{ scale: 0.8 }}
                          onClick={(e) => { e.stopPropagation(); toggleCollect(r, e); }}
                          className="active:scale-90 transition-all shadow-xl"
                          style={{
                            width: 52, height: 52, borderRadius: '50%',
                            background: collected ? 'rgba(88,166,255,0.25)' : 'rgba(255,255,255,0.05)',
                            backdropFilter: 'blur(10px)',
                            border: `1.5px solid ${collected ? 'rgba(88,166,255,0.5)' : 'rgba(255,255,255,0.15)'}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: collected ? 'var(--accent-primary)' : 'hsl(var(--text-primary))',
                            cursor: 'pointer',
                          }}
                        >
                          {collected ? <BookmarkIcon size={24} fill="var(--accent-primary)" color="var(--accent-primary)" /> : <BookmarkIcon size={24} />}
                        </motion.button>
                        <span style={{ fontSize: '0.6rem', color: 'hsl(var(--text-dim))', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                          {collected ? 'Saved' : 'Save'}
                        </span>

                        <motion.button
                          whileTap={{ scale: 0.8 }}
                          onClick={(e) => { e.stopPropagation(); toggleWatch(r, e); }}
                          className="active:scale-90 transition-all shadow-xl"
                          style={{
                            width: 52, height: 52, borderRadius: '50%', marginTop: 8,
                            background: watching ? 'rgba(247,129,102,0.2)' : 'rgba(255,255,255,0.05)',
                            backdropFilter: 'blur(10px)',
                            border: `1.5px solid ${watching ? 'rgba(247,129,102,0.4)' : 'rgba(255,255,255,0.15)'}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                          }}
                        >
                          <BellIcon size={22} color={watching ? '#f78166' : 'hsl(var(--text-primary))'} />
                        </motion.button>
                        <span style={{ fontSize: '0.6rem', color: 'hsl(var(--text-dim))', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                          Notify
                        </span>
                      </div>

                      {/* Bottom content with gradient overlay */}
                      <div style={{
                        position: 'relative', zIndex: 2,
                        padding: '120px 22px 24px 22px',
                        paddingRight: 85,
                        background: 'linear-gradient(to top, rgba(18,24,33,0.9) 30%, rgba(18,24,33,0.4) 70%, transparent)',
                      }}>
                        {/* Owner info */}
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3.5">
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={(e) => { e.stopPropagation(); onUserClick(r.owner.login); }}
                              className="p-0 border-none bg-transparent cursor-pointer"
                            >
                              <img src={r.owner.avatar_url} alt="" className="w-12 h-12 rounded-2xl object-cover" style={{ border: '2px solid rgba(255,255,255,0.15)', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }} />
                            </motion.button>
                            <div>
                              <button
                                onClick={(e) => { e.stopPropagation(); onUserClick(r.owner.login); }}
                                className="font-sora font-extrabold text-[hsl(var(--text-primary))] p-0 border-none bg-transparent cursor-pointer hover:text-[var(--accent-primary)] transition-colors"
                                style={{ fontSize: '1rem' }}
                              >
                                {r.owner.login}
                              </button>
                              <div style={{ fontSize: '0.78rem', color: langColor, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: langColor, boxShadow: `0 0 8px ${langColor}` }} />
                                {r.language || 'Code'}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Repo name */}
                        <h3 className="font-sora font-black text-[hsl(var(--text-primary))] mb-2.5" style={{ fontSize: '1.75rem', letterSpacing: '-0.04em', lineHeight: 1.1 }}>
                          {r.name}
                        </h3>

                        {/* Description */}
                        <p className="line-clamp-2 mb-4" style={{ fontSize: '0.92rem', color: 'hsl(var(--text-muted))', lineHeight: 1.6, opacity: 0.8 }}>
                          {r.description || 'No description provided.'}
                        </p>

                        {/* Tags */}
                        {r.topics && r.topics.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-4">
                            {r.topics.slice(0, 3).map(tag => (
                              <span key={tag} style={{ fontSize: '0.7rem', padding: '5px 12px', borderRadius: 24, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', color: 'hsl(var(--text-dim))', fontWeight: 600 }}>
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Stats */}
                        <div className="flex items-center gap-6">
                          <span className="flex items-center gap-2" style={{ fontSize: '0.88rem', color: 'hsl(var(--text-primary))', fontWeight: 700 }}>
                            <StarIcon size={16} color="#e3b341" fill="#e3b341" /> {fmtNum(r.stargazers_count)}
                          </span>
                          <span className="flex items-center gap-2" style={{ fontSize: '0.88rem', color: 'hsl(var(--text-primary))', fontWeight: 700 }}>
                            <ForkIcon size={16} color="var(--accent-primary)" strokeWidth={3} /> {fmtNum(r.forks_count)}
                          </span>
                        </div>

                      </div>
                    </motion.div>
                  );
                })}

                {hasMore && (
                  <button
                    onClick={() => fetchTrends(true)}
                    disabled={loadingMore}
                    className="w-full py-4 rounded-xl border border-[var(--glass-border)] glass-static hover:bg-[var(--glass-bg)] transition-all text-[hsl(var(--text-muted))] font-sora font-semibold text-sm cursor-pointer disabled:opacity-50"
                  >
                    {loadingMore ? 'Loading...' : 'Load More Repositories ↓'}
                  </button>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default HomeTab;
