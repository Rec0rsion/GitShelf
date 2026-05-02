import React, { useState, useEffect, useRef } from 'react';
import { repoCache } from '../utils/repoCache';
import { Native } from '../utils/NativeBridge';
import { SearchIcon, StarIcon, ForkIcon, EyeIcon, EyeOffIcon } from './Icons';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { trackRecentView } from '../utils/recentViews';
import { AppLoader } from './AppLoader';

interface GHSearchResult {
  id: number;
  full_name: string;
  name: string;
  visibility: string;
  description: string;
  language: string;
  stargazers_count: number;
  forks_count: number;
}

interface GHUser {
  login: string;
  id: number;
  avatar_url: string;
  html_url: string;
  bio?: string;
  followers?: number;
  public_repos?: number;
  name?: string;
  location?: string;
  following?: number;
}

function fmtNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'k';
  return String(n);
}

const LANG_COLORS: Record<string, string> = {
  JavaScript: '#f1e05a', TypeScript: '#3178c6', Python: '#3572A5',
  Java: '#b07219', 'C++': '#f34b7d', C: '#555555', 'C#': '#178600',
  Go: '#00ADD8', Rust: '#dea584', Ruby: '#701516', PHP: '#4F5D95',
  Swift: '#F05138', Kotlin: '#A97BFF', Dart: '#00B4AB',
  HTML: '#e34c26', CSS: '#563d7c', Shell: '#89e051',
};

const repos = [
  { name: 'facebook/react', vis: 'Public', desc: 'The library for web and native user interfaces', lang: 'JavaScript', langColor: '#f1e05a', stars: '218k', forks: '45k', author: 'facebook', authorInitials: 'FB', authorBio: 'Meta open source projects', issues: '1.2k' },
  { name: 'vercel/next.js', vis: 'Public', desc: 'The React Framework for the Web', lang: 'TypeScript', langColor: '#3178c6', stars: '120k', forks: '26k', author: 'vercel', authorInitials: 'VR', authorBio: 'Develop. Preview. Ship.', issues: '2.8k' },
  { name: 'tailwindlabs/tailwindcss', vis: 'Public', desc: 'A utility-first CSS framework', lang: 'CSS', langColor: '#563d7c', stars: '79k', forks: '4k', author: 'tailwindlabs', authorInitials: 'TW', authorBio: 'Creators of Tailwind CSS', issues: '180' },
  { name: 'microsoft/vscode', vis: 'Public', desc: 'Visual Studio Code source code', lang: 'TypeScript', langColor: '#3178c6', stars: '158k', forks: '28k', author: 'microsoft', authorInitials: 'MS', authorBio: 'Open source projects from Microsoft', issues: '5.4k' },
  { name: 'torvalds/linux', vis: 'Public', desc: 'Linux kernel source tree', lang: 'C', langColor: '#555555', stars: '170k', forks: '52k', author: 'torvalds', authorInitials: 'LT', authorBio: 'Linux kernel developer', issues: '320' },
  { name: 'golang/go', vis: 'Public', desc: 'The Go programming language', lang: 'Go', langColor: '#00ADD8', stars: '120k', forks: '17k', author: 'golang', authorInitials: 'GO', authorBio: 'The Go programming language', issues: '8.9k' },
];

interface ExplorerTabProps {
  onRepoClick: (slug: string) => void;
  initialUser?: string | null;
  onClearInitialUser?: () => void;
  selectedUser: string | null;
  setSelectedUser: (user: string | null) => void;
}

const ExplorerTab: React.FC<ExplorerTabProps> = ({ onRepoClick, initialUser, onClearInitialUser, selectedUser, setSelectedUser }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const [explorerMode, setExplorerMode] = useState<'repos' | 'users'>(() => repoCache.get<'repos' | 'users'>('explorer_mode') ?? 'repos');
  const [query, setQuery] = useState(() => repoCache.get<string>('explorer_query') ?? '');
  const [searchResults, setSearchResults] = useState<GHSearchResult[]>(() => repoCache.get<GHSearchResult[]>('explorer_repo_results') ?? []);
  const [userSearchResults, setUserSearchResults] = useState<GHUser[]>(() => repoCache.get<GHUser[]>('explorer_user_results') ?? []);
  const [userDetails, setUserDetails] = useState<GHUser | null>(() => repoCache.get<GHUser | null>('explorer_user_details') ?? null);
  const [userRepos, setUserRepos] = useState<GHSearchResult[]>(() => repoCache.get<GHSearchResult[]>('explorer_user_repos') ?? []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(() => repoCache.get<boolean>('explorer_has_searched') ?? false);
  const [watchedUsers, setWatchedUsers] = useState<Record<string, any>>({});
  const [skippedRepos, setSkippedRepos] = useState<string[]>([]);
  const [showAllRepos, setShowAllRepos] = useState(false);
  const [userRepoPage, setUserRepoPage] = useState(() => repoCache.get<number>('explorer_user_repo_page') ?? 1);
  const [hasMoreUserRepos, setHasMoreUserRepos] = useState(() => repoCache.get<boolean>('explorer_has_more_user_repos') ?? false);
  const [loadingMoreRepos, setLoadingMoreRepos] = useState(false);
  const [randomRepo, setRandomRepo] = useState<any>(null);
  const [loadingRandom, setLoadingRandom] = useState(false);
  const [randomHistory, setRandomHistory] = useState<string[]>([]);
  const [userSearchPage, setUserSearchPage] = useState(() => repoCache.get<number>('explorer_user_search_page') ?? 1);
  const [hasMoreUsers, setHasMoreUsers] = useState(() => repoCache.get<boolean>('explorer_has_more_users') ?? false);
  const [loadingMoreUsers, setLoadingMoreUsers] = useState(false);
  const [repoSearchPage, setRepoSearchPage] = useState(() => repoCache.get<number>('explorer_repo_search_page') ?? 1);
  const [hasMoreRepos, setHasMoreRepos] = useState(() => repoCache.get<boolean>('explorer_has_more_repos') ?? false);
  const [loadingMoreReposSearch, setLoadingMoreReposSearch] = useState(false);

  // Persistence
  useEffect(() => {
    repoCache.set('explorer_mode', explorerMode);
    repoCache.set('explorer_query', query);
    repoCache.set('explorer_repo_results', searchResults);
    repoCache.set('explorer_user_results', userSearchResults);
    repoCache.set('explorer_user_details', userDetails);
    repoCache.set('explorer_user_repos', userRepos);
    repoCache.set('explorer_has_searched', hasSearched);
    repoCache.set('explorer_user_repo_page', userRepoPage);
    repoCache.set('explorer_has_more_user_repos', hasMoreUserRepos);
    repoCache.set('explorer_user_search_page', userSearchPage);
    repoCache.set('explorer_has_more_users', hasMoreUsers);
    repoCache.set('explorer_repo_search_page', repoSearchPage);
    repoCache.set('explorer_has_more_repos', hasMoreRepos);
  }, [explorerMode, query, searchResults, userSearchResults, userDetails, userRepos, hasSearched, userRepoPage, hasMoreUserRepos, userSearchPage, hasMoreUsers, repoSearchPage, hasMoreRepos]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    repoCache.set('explorer_scroll_pos', e.currentTarget.scrollTop);
  };

  useEffect(() => {
    const updateWatched = () => {
      const data = JSON.parse(localStorage.getItem('gitspace_watched_users') || '{}');
      setWatchedUsers(data);
    };
    updateWatched();
    window.addEventListener('gitspace_notifications_updated', updateWatched);
    return () => window.removeEventListener('gitspace_notifications_updated', updateWatched);
  }, []);

  const handleSearch = async (isNextPage = false, overrideQuery?: string) => {
    const q = overrideQuery ?? query;
    if (!q.trim()) return;

    setLoading(isNextPage ? false : true);
    if (isNextPage) {
      if (explorerMode === 'repos') setLoadingMoreReposSearch(true);
      else setLoadingMoreUsers(true);
    }

    setHasSearched(true);
    setError('');

    try {
      const token = localStorage.getItem('gh_token');
      const headers: Record<string, string> = { 'Accept': 'application/vnd.github.v3+json' };
      if (token) headers['Authorization'] = `token ${token}`;

      const pageToFetch = (explorerMode === 'repos' ? repoSearchPage : userSearchPage) + (isNextPage ? 1 : 0);
      const url = explorerMode === 'repos'
        ? `https://api.github.com/search/repositories?q=${encodeURIComponent(q)}&sort=stars&order=desc&per_page=20&page=${pageToFetch}`
        : `https://api.github.com/search/users?q=${encodeURIComponent(q)}&sort=followers&order=desc&per_page=20&page=${pageToFetch}`;

      const res = await fetch(url, { headers });
      if (!res.ok) throw new Error('API limit reached.');

      const data = await res.json();
      const newItems = data.items || [];

      if (explorerMode === 'repos') {
        setSearchResults(prev => isNextPage ? [...prev, ...newItems] : newItems);
        setRepoSearchPage(isNextPage ? pageToFetch : 1);
        setHasMoreRepos(newItems.length === 20);
      } else {
        setUserSearchResults(prev => isNextPage ? [...prev, ...newItems] : newItems);
        setUserSearchPage(isNextPage ? pageToFetch : 1);
        setHasMoreUsers(newItems.length === 20);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setLoadingMoreReposSearch(false);
      setLoadingMoreUsers(false);
    }
  };

  const fetchTrendingUsers = async (isNextPage = false) => {
    setLoading(isNextPage ? false : true);
    if (isNextPage) setLoadingMoreUsers(true);
    setHasSearched(true);
    try {
      const token = localStorage.getItem('gh_token');
      const headers: Record<string, string> = { 'Accept': 'application/vnd.github.v3+json' };
      if (token) headers['Authorization'] = `token ${token}`;
      const pageToFetch = isNextPage ? userSearchPage + 1 : 1;
      const res = await fetch(`https://api.github.com/search/users?q=followers:>=0&sort=followers&order=desc&per_page=20&page=${pageToFetch}`, { headers });
      const data = await res.json();
      const newItems = data.items || [];
      setUserSearchResults(prev => isNextPage ? [...prev, ...newItems] : newItems);
      setHasMoreUsers(newItems.length === 20);
      setUserSearchPage(pageToFetch);
    } catch (e) { } finally { setLoading(false); setLoadingMoreUsers(false); }
  };

  const fetchRandomRepo = async () => {
    setLoadingRandom(true);
    try {
      const token = localStorage.getItem('gh_token');
      const headers: Record<string, string> = { 'Accept': 'application/vnd.github.v3+json' };
      if (token) headers['Authorization'] = `token ${token}`;
      const topics = ['react', 'nextjs', 'ai', 'rust', 'go', 'python'];
      const topic = topics[Math.floor(Math.random() * topics.length)];
      const res = await fetch(`https://api.github.com/search/repositories?q=${topic}+stars:>500&sort=updated&per_page=30`, { headers });
      const data = await res.json();
      if (data.items) {
        const pick = data.items[Math.floor(Math.random() * data.items.length)];
        setRandomRepo(pick);
      }
    } catch (e) { } finally { setLoadingRandom(false); }
  };

  const fetchUserDetails = async (login: string) => {
    try {
      const token = localStorage.getItem('gh_token');
      const headers: Record<string, string> = { 'Accept': 'application/vnd.github.v3+json' };
      if (token) headers['Authorization'] = `token ${token}`;
      const uRes = await fetch(`https://api.github.com/users/${login}`, { headers });
      const data = await uRes.json();
      setUserDetails(data);
      const rRes = await fetch(`https://api.github.com/users/${login}/repos?sort=updated&per_page=30`, { headers });
      const repos = await rRes.json();
      setUserRepos(repos);
      setHasMoreUserRepos(repos.length === 30);
      setUserRepoPage(1);
    } catch (e) { }
  };

  const toggleWatchUser = (u: any) => {
    const current = JSON.parse(localStorage.getItem('gitspace_watched_users') || '{}');
    if (current[u.login]) delete current[u.login];
    else current[u.login] = { avatar: u.avatar_url, subscribedAt: new Date().toISOString() };
    localStorage.setItem('gitspace_watched_users', JSON.stringify(current));
    setWatchedUsers(current);
    window.dispatchEvent(new Event('gitspace_notifications_updated'));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === 'Enter') handleSearch(); };

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      className="w-full space-y-2 pb-10 overflow-y-auto no-scrollbar"
      style={{ touchAction: 'pan-y', height: 'calc(100vh - 160px)' }}
    >
      {/* Header Info */}
      <div className="flex items-center justify-between mb-1 opacity-50 px-1">
        <button onClick={() => { repoCache.clear(); window.location.reload(); }} className="text-[9px] font-bold text-[hsl(var(--text-muted))] uppercase tracking-widest">↻ Refresh Cache</button>
      </div>

      {/* ─── Advanced Search & Filter UI ─── */}
      <div className="space-y-5 px-1 pb-4">
        
        {/* Main Search Pill */}
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-[var(--accent-primary)]/20 to-purple-500/20 rounded-[32px] blur-xl opacity-0 group-focus-within:opacity-100 transition-all duration-500" />
          <div className="relative flex items-center h-[68px] bg-white/[0.03] backdrop-blur-2xl border border-white/5 rounded-[30px] px-5 transition-all focus-within:bg-white/[0.05] focus-within:border-[var(--accent-primary)]/30 focus-within:shadow-[0_0_30px_rgba(88,166,255,0.15)]">
            <SearchIcon size={20} color={query ? 'var(--accent-primary)' : 'rgba(255,255,255,0.4)'} />
            <input
              type="text" value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={explorerMode === 'repos' ? 'Search repo, description...' : 'Search for developers...'}
              className="flex-1 bg-transparent border-none outline-none font-sora font-semibold text-[1rem] text-white ml-3 placeholder:text-white/20"
            />
            
            {/* Integrated Mode Toggle */}
            <div className="flex bg-white/[0.04] p-1 rounded-2xl border border-white/5 ml-2 h-10 w-[140px] relative overflow-hidden shrink-0">
              <motion.div
                className="absolute inset-y-1 bg-white/10 border border-white/10 rounded-xl"
                initial={false}
                animate={{ 
                  x: explorerMode === 'repos' ? 0 : 66,
                  width: 64
                }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
              <button 
                onClick={() => { Native.vibrate(); setExplorerMode('repos'); }}
                className={`relative z-10 flex-1 flex items-center justify-center text-[9px] font-black uppercase tracking-tighter transition-colors duration-300 ${explorerMode === 'repos' ? 'text-[var(--accent-primary)]' : 'text-white/40'}`}>
                REPO
              </button>
              <button 
                onClick={() => { Native.vibrate(); setExplorerMode('users'); setHasSearched(false); setSelectedUser(null); setUserDetails(null); fetchTrendingUsers();}}
                className={`relative z-10 flex-1 flex items-center justify-center text-[9px] font-black uppercase tracking-tighter transition-colors duration-300 ${explorerMode === 'users' ? 'text-[var(--accent-primary)]' : 'text-white/40'}`}>
                USER
              </button>
            </div>
          </div>
        </div>

        {/* Platform / Category Filters (Horizontal Scroll) */}
        <div className="flex gap-2.5 overflow-x-auto no-scrollbar py-1 mask-fade-edges">
          {[
            { id: 'all', label: 'All', color: 'var(--accent-primary)' },
            { id: 'android', label: 'Android', color: '#3fb950' },
            { id: 'windows', label: 'Windows', color: 'var(--accent-primary)' },
            { id: 'macos', label: 'MacOS', color: '#d2a8ff' },
            { id: 'linux', label: 'Linux', color: '#f78166' },
            { id: 'ai', label: 'AI/ML', color: '#ff7b72' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => { Native.vibrate(); /* functionality can be added later */ }}
              className="flex-shrink-0 px-5 py-2.5 rounded-2xl font-sora font-black text-[11px] uppercase tracking-wider transition-all border active:scale-95 bg-white/5 border-white/5 text-white/40 hover:text-white hover:bg-white/10"
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Filters & Sort Row */}
        <div className="flex items-center gap-6 px-1">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 12V7H5a2 2 0 0 1 0-4h14a2 2 0 0 1 2 2v2M3 5v14a2 2 0 0 0 2 2h16" /><path d="M7 11h8" /><path d="M7 15h8" /></svg>
              Language:
            </span>
            <button className="flex items-center gap-2 bg-white/5 border border-white/5 px-3 py-1.5 rounded-xl text-xs font-bold text-white/80 active:scale-95">
              All <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="6 9 12 15 18 9" /></svg>
            </button>
          </div>

          <div className="flex items-center gap-3">
             <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
              Sort:
            </span>
            <button className="flex items-center gap-2 bg-white/5 border border-white/5 px-3 py-1.5 rounded-xl text-xs font-bold text-white/80 active:scale-95">
              Stars <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="6 9 12 15 18 9" /></svg>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <AnimatePresence mode="wait">
        {!loading && explorerMode === 'repos' && (
          <motion.div key="repos" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            {!hasSearched ? (
              <>
                <div className="mb-6 px-1">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-[0.7rem] font-black text-[#d2a8ff] uppercase tracking-[0.2em]">Lucky Discovery</p>
                  </div>
                  {!randomRepo && !loadingRandom && (
                    <button onClick={fetchRandomRepo} className="w-full py-10 rounded-[28px] border-2 border-dashed border-[#d2a8ff]/20 bg-[#d2a8ff]/5 flex flex-col items-center justify-center gap-3 hover:bg-[#d2a8ff]/10 transition-all">
                      <div className="w-12 h-12 rounded-2xl bg-[#d2a8ff]/10 flex items-center justify-center text-[#d2a8ff]">🎲</div>
                      <p className="font-sora font-extrabold text-[0.9rem] text-[hsl(var(--text-primary))]">Roll the Dice</p>
                    </button>
                  )}
                  {randomRepo && (
                    <div onClick={() => onRepoClick(randomRepo.full_name)} className="relative p-6 rounded-[28px] bg-gradient-to-br from-[#d2a8ff]/10 to-transparent border border-[#d2a8ff]/20 cursor-pointer group">
                      <h3 className="font-sora font-extrabold text-[hsl(var(--text-primary))] text-[1.1rem] group-hover:text-[#d2a8ff] transition-colors">{randomRepo.full_name}</h3>
                      <p className="text-[0.85rem] text-[hsl(var(--text-muted))] mt-2 line-clamp-2">{randomRepo.description}</p>
                      <div className="flex gap-4 mt-4 text-[0.75rem] font-bold text-[#d2a8ff]">
                        <span>☆ {fmtNum(randomRepo.stargazers_count)}</span>
                        <span className="uppercase">{randomRepo.language}</span>
                      </div>
                    </div>
                  )}
                </div>

                <p className="text-[0.7rem] font-black text-[hsl(var(--text-dim))] uppercase tracking-[0.2em] px-1 mb-4">Trending Now</p>
                {repos.map((r, i) => (
                  <div key={r.name} onClick={() => onRepoClick(r.name)} className="group relative bg-white/[0.02] border border-[var(--glass-border)] rounded-[26px] p-5 hover:bg-white/[0.05] transition-all cursor-pointer">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-[var(--accent-primary)]/10 flex items-center justify-center font-black text-[var(--accent-primary)]">{r.name.split('/')[1][0].toUpperCase()}</div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-sora font-extrabold text-[hsl(var(--text-primary))] text-[1.1rem] truncate">{r.name.split('/')[1]}</h3>
                        <p className="text-[var(--accent-primary)] text-[0.75rem] font-bold">@{r.author}</p>
                        <p className="text-[0.85rem] text-[hsl(var(--text-muted))] mt-2 line-clamp-2">{r.desc}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <div className="space-y-3 px-1">
                {searchResults.map((r, i) => (
                  <motion.div
                    key={r.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                    onClick={() => onRepoClick(r.full_name)}
                    className="group bg-white/[0.02] border border-[var(--glass-border)] rounded-[24px] p-5 hover:border-[var(--accent-primary)]/30 transition-all"
                  >
                    <h3 className="font-sora font-extrabold text-[hsl(var(--text-primary))] text-[1.1rem] truncate group-hover:text-[var(--accent-primary)] transition-colors">{r.full_name}</h3>
                    <p className="text-[0.85rem] text-[hsl(var(--text-muted))] mt-2 line-clamp-2">{r.description}</p>
                    <div className="flex gap-4 mt-4 items-center">
                      <span className="flex items-center gap-1.5 text-[0.75rem] font-bold text-[hsl(var(--text-muted))]">
                        <span className="w-2 h-2 rounded-full" style={{ background: LANG_COLORS[r.language] || 'hsl(var(--text-muted))' }} />
                        {r.language}
                      </span>
                      <span className="text-[0.75rem] font-bold text-[#f1e05a]">☆ {fmtNum(r.stargazers_count)}</span>
                    </div>
                  </motion.div>
                ))}
                {hasMoreRepos && (
                  <button onClick={() => handleSearch(true)} disabled={loadingMoreReposSearch} className="w-full py-4 rounded-[20px] bg-white/[0.03] text-[var(--accent-primary)] font-sora font-extrabold text-xs tracking-widest uppercase mt-4">
                    {loadingMoreReposSearch ? 'Loading...' : 'Load More Results'}
                  </button>
                )}
              </div>
            )}
          </motion.div>
        )}

        {!loading && explorerMode === 'users' && !selectedUser && (
          <motion.div key="users" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-2 px-1">
            {userSearchResults.map((u) => (
              <div key={u.id} onClick={() => { setSelectedUser(u.login); fetchUserDetails(u.login); }} className="flex items-center gap-4 bg-white/[0.02] border border-[var(--glass-border)] p-4 rounded-[22px] hover:bg-white/[0.05] cursor-pointer transition-all">
                <img src={u.avatar_url} className="w-14 h-14 rounded-full border-2 border-[var(--glass-border)]" alt={u.login} />
                <div className="flex-1 min-w-0">
                  <p className="font-sora font-extrabold text-[hsl(var(--text-primary))] truncate">{u.login}</p>
                  <p className="text-[0.8rem] text-[var(--accent-primary)] font-bold font-mono">@{u.login}</p>
                </div>
                <button onClick={(e) => { e.stopPropagation(); toggleWatchUser(u); }} className="w-10 h-10 rounded-xl bg-[var(--glass-bg)] flex items-center justify-center">
                  {watchedUsers[u.login] ? <EyeOffIcon size={18} color="#f78166" /> : <EyeIcon size={18} color="var(--accent-primary)" />}
                </button>
              </div>
            ))}
            {hasMoreUsers && (
              <button onClick={() => handleSearch(true)} disabled={loadingMoreUsers} className="w-full py-4 rounded-[20px] bg-white/[0.03] text-[var(--accent-primary)] font-sora font-extrabold text-xs tracking-widest uppercase mt-4">
                {loadingMoreUsers ? 'Discovering...' : 'Load More Developers'}
              </button>
            )}
          </motion.div>
        )}

        {!loading && selectedUser && userDetails && (
          <motion.div key="details" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-1">
            <button onClick={() => setSelectedUser(null)} className="text-[hsl(var(--text-muted))] font-bold text-xs mb-4 uppercase tracking-widest">← Back to search</button>
            <div className="bg-gradient-to-br from-white/[0.08] to-transparent border border-[var(--glass-border)] rounded-[28px] p-6 mb-6">
              <div className="flex gap-5 mb-6">
                <img src={userDetails.avatar_url} className="w-16 h-16 rounded-full border-2 border-[var(--accent-primary)]/30 shadow-lg" alt="" />
                <div className="flex-1 min-w-0">
                  <h2 className="font-sora font-black text-[hsl(var(--text-primary))] text-[1.2rem] leading-tight text-shadow-sm">{userDetails.name || userDetails.login}</h2>
                  <p className="text-[var(--accent-primary)] font-bold font-mono text-[0.85rem] mt-1">@{userDetails.login}</p>
                </div>
                <button onClick={() => toggleWatchUser(userDetails)} className="w-12 h-12 rounded-2xl bg-[var(--glass-hover-bg)] flex items-center justify-center">
                  {watchedUsers[userDetails.login] ? <EyeOffIcon size={22} color="#f78166" /> : <EyeIcon size={22} color="var(--accent-primary)" />}
                </button>
              </div>
              {userDetails.bio && <p className="text-[0.9rem] text-[hsl(var(--text-muted))] font-medium leading-relaxed mb-6">{userDetails.bio}</p>}
              <div className="flex gap-8 border-t border-[var(--glass-border)] pt-4">
                <div><p className="font-black text-[hsl(var(--text-primary))] text-[1.1rem]">{fmtNum(userDetails.public_repos || 0)}</p><p className="text-[0.65rem] font-black text-[hsl(var(--text-dim))] uppercase tracking-widest">Repos</p></div>
                <div><p className="font-black text-[hsl(var(--text-primary))] text-[1.1rem]">{fmtNum(userDetails.followers || 0)}</p><p className="text-[0.65rem] font-black text-[hsl(var(--text-dim))] uppercase tracking-widest">Followers</p></div>
              </div>
            </div>

            <p className="text-[0.7rem] font-black text-[hsl(var(--text-dim))] uppercase tracking-[0.2em] mb-4 ml-1">Repositories</p>
            <div className="space-y-3">
              {userRepos.map(r => (
                <div key={r.id} onClick={() => onRepoClick(r.full_name)} className="bg-white/[0.02] border border-[var(--glass-border)] p-5 rounded-[22px] hover:bg-white/[0.05] transition-all cursor-pointer">
                  <h4 className="font-sora font-extrabold text-[hsl(var(--text-primary))] text-[1rem] truncate">{r.name}</h4>
                  <p className="text-[0.8rem] text-[hsl(var(--text-muted))] mt-1 line-clamp-1">{r.description}</p>
                  <div className="flex gap-4 mt-3 text-[0.75rem] font-bold text-[hsl(var(--text-muted))]">
                    <span>☆ {fmtNum(r.stargazers_count)}</span>
                    <span>{r.language}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {(loading || loadingRandom) && !searchResults.length && !userSearchResults.length && !selectedUser && (
        <div className="flex flex-col items-center justify-center py-32 gap-5">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-4 border-[var(--accent-primary)]/10" />
            <AppLoader className="absolute inset-0 text-[var(--accent-primary)] loader shadow-[0_0_15px_rgba(88,166,255,0.4)]" />
          </div>
          <p className="text-[10px] font-black text-[var(--accent-primary)] uppercase tracking-[0.3em] animate-pulse">Syncing Galaxy...</p>
        </div>
      )}
    </div>
  );
};

export default ExplorerTab;
