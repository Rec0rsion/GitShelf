import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Native } from '../utils/NativeBridge';
import {
  SearchIcon, DownloadIcon, AndroidIcon, WindowsIcon,
  AppleIcon, LinuxIcon, PackageIcon, ZapIcon, GlobeIcon, GridIcon, StarIcon,
  ClockIcon, SparklesIcon, SortIcon,
} from './Icons';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { AppLoader } from './AppLoader';
import { AppCardSkeleton } from './SkeletonLoader';
import {
  GitHubApp, GHAsset, AppPlatforms,
  discoverApps, searchGitHubApps,
  getCachedApps, setCachedApps, clearAppsCache,
} from '../utils/fetchGitHubApps';
import { DownloadTask } from '../utils/DownloadManager';
import DownloadsSheet from './DownloadsSheet';

// ─────────── constants ───────────
const PAGE_SIZE = 20;

type PlatformFilter = 'all' | 'android' | 'windows' | 'macos' | 'linux';
type SortMode = 'stars' | 'downloads' | 'updated' | 'newest';

// ─────────── helpers ───────────
const fmtSize = (b: number) => {
  if (!b) return '';
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
};
const fmtNum = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
};
const timeAgo = (iso: string) => {
  if (!iso) return '';
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (d < 1) return 'today';
  if (d < 30) return `${d}d ago`;
  if (d < 365) return `${Math.floor(d / 30)}mo ago`;
  return `${Math.floor(d / 365)}y ago`;
};

const sortApps = (apps: GitHubApp[], mode: SortMode): GitHubApp[] => {
  const copy = [...apps];
  if (mode === 'stars') return copy.sort((a, b) => (b.stars || 0) - (a.stars || 0));
  if (mode === 'downloads') return copy.sort((a, b) => b.totalDownloads - a.totalDownloads);
  if (mode === 'updated') return copy.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  if (mode === 'newest') return copy.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  return copy;
};

const filterByPlatform = (apps: GitHubApp[], platform: PlatformFilter): GitHubApp[] => {
  if (platform === 'all') return apps;
  return apps.filter(a => a.platforms[platform]?.length > 0);
};

// ─────────── Download sheet ───────────
interface SheetProps { app: GitHubApp; onClose: () => void; downloads: DownloadTask[]; startDownload: (url: string, filename: string) => void }
const DownloadSheet: React.FC<SheetProps> = ({ app, onClose, downloads, startDownload }) => {
  const sections: { key: keyof AppPlatforms; label: string; color: string; icon: React.ReactNode }[] = [
    { key: 'android', label: 'Android', color: '#3fb950', icon: <AndroidIcon size={13} color="#3fb950" /> },
    { key: 'windows', label: 'Windows', color: 'var(--accent-primary)', icon: <WindowsIcon size={13} color="var(--accent-primary)" /> },
    { key: 'macos', label: 'macOS', color: '#d2a8ff', icon: <AppleIcon size={13} color="#d2a8ff" /> },
    { key: 'linux', label: 'Linux', color: '#f78166', icon: <LinuxIcon size={13} color="#f78166" /> },
  ].filter(s => app.platforms[s.key].length > 0);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[900] flex items-end bg-[#0f141d]/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 260 }}
        className="w-full max-h-[82vh] overflow-y-auto rounded-t-[32px] border-t border-[var(--glass-border)] p-6 flex flex-col pb-safe"
        style={{ background: 'var(--bg-secondary, #161b22)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-5" />
        <div className="flex items-center gap-3 mb-6">
          <img src={app.icon} alt={app.name}
            className="w-12 h-12 rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-bg)]"
            onError={e => {
              const el = e.target as HTMLImageElement;
              const colors = ['#1a3a5c', '#1a3a2c', '#3a1a1a', '#2a1a3a', '#3a2a1a'];
              const idx = app.name.charCodeAt(0) % colors.length;
              el.style.background = `linear-gradient(135deg, ${colors[idx]}, var(--bg-primary))`;
              el.style.border = '1px solid var(--glass-hover-bg)';
              el.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>';
            }} />
          <div>
            <h3 className="font-sora font-bold text-[hsl(var(--text-primary))]">{app.name}</h3>
            <p className="text-xs text-[hsl(var(--text-dim))] font-mono">{app.version}</p>
          </div>
        </div>
        <div className="space-y-6">
          {sections.map(sec => (
            <div key={sec.key}>
              <div className="flex items-center gap-2 mb-3 px-1">
                {sec.icon}
                <span className="text-[10px] font-black uppercase tracking-widest text-[hsl(var(--text-dim))]">{sec.label}</span>
              </div>
              <div className="space-y-2">
                {app.platforms[sec.key].map(asset => {
                  const isDone = downloads.some(d => d.filename === asset.name && d.status === 'done');
                  const dlTask = downloads.find(d => d.filename === asset.name && d.status === 'downloading');

                return (
                  <button key={asset.name}
                    onClick={async () => {
                      Native.vibrate();
                      if (dlTask) return;
                      const dlDone = downloads.find(d => d.filename === asset.name && d.status === 'done');
                      if (dlDone?.localUri) {
                        Native.openFile(dlDone.localUri);
                        return;
                      }
                      startDownload(asset.browser_download_url, asset.name);
                      onClose();
                    }}
                    className={`w-full flex items-center justify-between p-3.5 rounded-2xl border border-[var(--glass-border)] active:scale-[0.98] transition-all text-left ${dlTask ? 'opacity-50 cursor-default' : ''
                      }`}
                    style={{ background: `${sec.color}08` }}
                  >
                    <div className="min-w-0 mr-3">
                      <p className="text-sm font-medium text-[hsl(var(--text-primary))] truncate">{asset.name}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        {asset.size > 0 && <span className="text-[11px] text-[hsl(var(--text-dim))]">{fmtSize(asset.size)}</span>}
                        {asset.download_count > 0 && <span className="text-[11px] text-[hsl(var(--text-dim))]">{fmtNum(asset.download_count)} dl</span>}
                      </div>
                    </div>
                    <div className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold border"
                      style={{
                        background: isDone ? 'rgba(59,185,80,0.15)' : `${sec.color}18`,
                        borderColor: isDone ? '#3fb950' : `${sec.color}45`,
                        color: isDone ? '#3fb950' : sec.color
                      }}>
                      {dlTask ? (
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 border border-current border-t-transparent rounded-full animate-spin" />
                          {dlTask.progress}%
                        </div>
                      ) : isDone ? 'OPEN' : 'GET'}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        <button onClick={() => window.open(app.repoUrl, '_blank')}
          className="w-full py-3.5 mt-2 rounded-2xl border border-[var(--glass-border)] text-sm font-bold text-[hsl(var(--text-muted))] flex items-center justify-center gap-2 hover:text-[hsl(var(--text-primary))] transition-colors">
          <GlobeIcon size={14} /> View on GitHub
        </button>
      </div>
    </motion.div>
  </motion.div>
  );
};

// ─────────── Skeleton ───────────
const SkeletonCard = () => (
  <div className="glass p-5 rounded-[24px] border border-[var(--glass-border)] animate-pulse">
    <div className="flex items-start gap-4 mb-4">
      <div className="w-14 h-14 rounded-2xl bg-[var(--glass-hover-bg)] shrink-0" />
      <div className="flex-1 space-y-2 py-1">
        <div className="h-4 bg-[var(--glass-hover-bg)] rounded w-2/3" />
        <div className="h-3 bg-[var(--glass-hover-bg)] rounded w-1/3" />
        <div className="h-3 bg-[var(--glass-hover-bg)] rounded w-1/2" />
      </div>
    </div>
    <div className="space-y-2 mb-4">
      <div className="h-3 bg-[var(--glass-hover-bg)] rounded w-full" />
      <div className="h-3 bg-[var(--glass-hover-bg)] rounded w-4/5" />
    </div>
    <div className="flex gap-2 pt-4 border-t border-[var(--glass-border)]">
      <div className="h-8 bg-[var(--glass-hover-bg)] rounded-xl w-24" />
      <div className="h-8 bg-[var(--glass-hover-bg)] rounded-xl w-20" />
    </div>
  </div>
);

// ─────────── App Card ───────────
interface CardProps {
  app: GitHubApp;
  onRepoClick: (slug: string) => void;
  onDownload: (app: GitHubApp) => void;
  downloads: DownloadTask[];
  startDownload: (url: string, filename: string) => void;
}

const BADGE_CFG: Record<keyof AppPlatforms, { label: string; color: string; icon: React.ReactNode }> = {
  android: { label: 'APK', color: '#3fb950', icon: <AndroidIcon size={9} color="#3fb950" /> },
  windows: { label: 'EXE', color: 'var(--accent-primary)', icon: <WindowsIcon size={9} color="var(--accent-primary)" /> },
  macos: { label: 'DMG', color: '#d2a8ff', icon: <AppleIcon size={9} color="#d2a8ff" /> },
  linux: { label: 'Linux', color: '#f78166', icon: <LinuxIcon size={9} color="#f78166" /> },
};

const AppCard: React.FC<CardProps> = ({ app, onRepoClick, onDownload, downloads, startDownload }) => {
  const presentPlatforms = (Object.keys(BADGE_CFG) as (keyof AppPlatforms)[])
    .filter(k => app.platforms[k].length > 0);

  const allAssets: GHAsset[] = [
    ...app.platforms.android,
    ...app.platforms.windows,
    ...app.platforms.macos,
    ...app.platforms.linux,
  ];

  const primary = presentPlatforms[0];
  const primaryCfg = primary ? BADGE_CFG[primary] : null;

  return (
    <motion.div layout initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      className="glass p-5 rounded-[24px] border border-[var(--glass-border)] hover:border-[var(--accent-primary)]/30 active:scale-[0.98] transition-all cursor-pointer group"
      onClick={() => { Native.vibrate(); onRepoClick(app.repo); }}
    >
      {/* ── header ── */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative shrink-0">
            <img src={app.icon} alt={app.name}
              className="w-14 h-14 rounded-2xl border border-[var(--glass-border)] shadow-lg bg-[var(--glass-bg)]"
              onError={e => {
                const el = e.target as HTMLImageElement;
                const colors = ['#1a3a5c', '#1a3a2c', '#3a1a1a', '#2a1a3a', '#3a2a1a'];
                const idx = app.name.charCodeAt(0) % colors.length;
                el.style.background = `linear-gradient(135deg, ${colors[idx]}, var(--bg-primary))`;
                el.style.border = '1px solid var(--glass-hover-bg)';
                el.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>';
              }} />
          </div>
          <div className="min-w-0">
            <h3 className="font-sora font-bold text-[hsl(var(--text-primary))] group-hover:text-[var(--accent-primary)] transition-colors truncate leading-tight">
              {app.name}
            </h3>
            <p className="text-[11px] text-[hsl(var(--text-dim))] font-mono truncate">{app.repo}</p>
            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-600">
              {app.version && <span className="text-[hsl(var(--text-dim))]">{app.version}</span>}
              {app.version && app.publishedAt && <span className="opacity-40">·</span>}
              {app.publishedAt && <span>{timeAgo(app.publishedAt)}</span>}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1.5 ml-2 shrink-0">
          {app.stars > 0 && (
            <div className="flex items-center gap-1 px-2 py-1 bg-[var(--glass-bg)] rounded-lg border border-[var(--glass-border)]">
              <StarIcon size={10} color="#e3b341" />
              <span className="text-[10px] font-bold text-[hsl(var(--text-muted))]">{fmtNum(app.stars)}</span>
            </div>
          )}
          {app.totalDownloads > 0 && (
            <div className="flex items-center gap-1 px-2 py-1 bg-[var(--glass-bg)] rounded-lg border border-[var(--glass-border)]">
              <DownloadIcon size={10} color="hsl(var(--text-muted))" />
              <span className="text-[10px] font-bold text-[hsl(var(--text-dim))]">{fmtNum(app.totalDownloads)}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── description ── */}
      {app.description && (
        <p className="text-sm text-[hsl(var(--text-muted))] line-clamp-2 leading-relaxed mb-3">
          {app.description}
        </p>
      )}

      {/* ── platform badges ── */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {presentPlatforms.map(k => {
          const cfg = BADGE_CFG[k];
          return (
            <span key={k} className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider border border-[var(--glass-border)] bg-[var(--glass-bg)] text-[hsl(var(--text-muted))]">
              {cfg.icon} {cfg.label}
            </span>
          );
        })}
      </div>

      {/* ── actions ── */}
      <div className="flex items-center gap-2 pt-3 border-t border-[var(--glass-border)]"
        onClick={e => e.stopPropagation()}>
        {allAssets.length === 1 ? (() => {
          const asset = allAssets[0];
          const isDownloading = downloads.some(d => d.filename === asset.name && d.status === 'downloading');
          const isDone = downloads.some(d => d.filename === asset.name && d.status === 'done');
          const dlTask = downloads.find(d => d.filename === asset.name && d.status === 'downloading');

          return (
            <button
              onClick={() => {
                Native.vibrate();
                if (isDownloading) return;
                const dlDone = downloads.find(d => d.filename === asset.name && d.status === 'done');
                if (dlDone?.localUri) {
                  Native.openFile(dlDone.localUri);
                  return;
                }
                startDownload(asset.browser_download_url, asset.name);
              }}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider border transition-all active:scale-95 ${isDownloading
                  ? 'bg-blue-500/20 border-blue-500/40 text-blue-400'
                  : isDone
                    ? 'bg-green-500/20 border-green-500/40 text-green-400'
                    : 'bg-[var(--glass-bg)] border-white/15 text-[hsl(var(--text-primary))]'
                }`}
            >
              {dlTask ? (
                <span className="flex items-center gap-2">
                  <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  {dlTask.progress}%
                </span>
              ) : isDone ? (
                "Open"
              ) : (
                <>
                  Download
                  {asset.size > 0 && <span className="opacity-60 font-normal normal-case ml-1">{fmtSize(asset.size)}</span>}
                  <DownloadIcon size={9} color="hsl(var(--text-muted))" />
                </>
              )}
            </button>
          );
        })() : (
          <button
            onClick={() => { Native.vibrate(); onDownload(app); }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider border border-white/15 bg-[var(--glass-bg)] text-[hsl(var(--text-primary))] active:scale-95 transition-all"
          >
            <DownloadIcon size={9} color="hsl(var(--text-muted))" />
            {allAssets.length} Files
          </button>
        )}
        <button
          onClick={() => { Native.vibrate(); onRepoClick(app.repo); }}
          className="ml-auto text-[11px] font-bold text-[hsl(var(--text-dim))] hover:text-gray-300 border border-[var(--glass-border)] hover:border-white/15 px-3 py-2 rounded-xl transition-all active:scale-95">
          Details →
        </button>
      </div>
    </motion.div>
  );
};

// ─────────── Sort modal ───────────
interface SortModalProps { current: SortMode; onChange: (m: SortMode) => void; onClose: () => void }
const SortModal: React.FC<SortModalProps> = ({ current, onChange, onClose }) => {
  const opts: { key: SortMode; label: string; icon: React.ReactNode; color: string }[] = [
    { key: 'stars', label: 'Most Stars', icon: <StarIcon size={16} color="#e3b341" />, color: '#e3b341' },
    { key: 'downloads', label: 'Most Downloads', icon: <DownloadIcon size={16} color="var(--accent-primary)" />, color: 'var(--accent-primary)' },
    { key: 'updated', label: 'Recently Updated', icon: <ClockIcon size={16} color="#3fb950" />, color: '#3fb950' },
    { key: 'newest', label: 'Newest Release', icon: <SparklesIcon size={16} color="#d2a8ff" />, color: '#d2a8ff' },
  ];
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[800] bg-[#0f141d]/60 backdrop-blur-sm flex items-end"
      onClick={onClose}>
      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 260 }}
        className="w-full rounded-t-[32px] border-t border-[var(--glass-border)] p-6 flex flex-col pb-safe"
        style={{ background: 'var(--bg-primary, var(--bg-primary))' }}
        onClick={e => e.stopPropagation()}>
        <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-6" />
        <h3 className="font-sora font-bold text-xl text-[hsl(var(--text-primary))] mb-5">Sort Apps</h3>
        <div className="space-y-3">
          {opts.map(o => (
            <button key={o.key}
              onClick={() => { onChange(o.key); onClose(); }}
              className={`w-full flex items-center gap-3 justify-between p-4 rounded-2xl border font-sora font-bold text-sm transition-all ${current === o.key
                  ? 'bg-[var(--accent-primary)]/10 border-[var(--accent-primary)]/30 text-[var(--accent-primary)]'
                  : 'bg-white/[0.03] border-[var(--glass-border)] text-[hsl(var(--text-primary))]'
                }`}>
              <div className="flex items-center gap-3">
                <span style={{ color: current === o.key ? 'var(--accent-primary)' : o.color }}>{o.icon}</span>
                {o.label}
              </div>
              {current === o.key && (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8L6.5 11.5L13 5" stroke="var(--accent-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
          ))}
        </div>
        <button onClick={onClose}
          className="w-full py-4 mt-4 rounded-2xl bg-[var(--glass-bg)] text-[hsl(var(--text-muted))] font-sora font-bold">
          Cancel
        </button>
      </motion.div>
    </motion.div>
  );
};

// ─────────── Main AppsTab ───────────
interface AppsTabProps {
  onRepoClick: (slug: string) => void;
  showSortModal: boolean;
  setShowSortModal: (show: boolean) => void;
  startDownload: (url: string, filename: string) => void;
  downloads: DownloadTask[];
}

const AppsTab: React.FC<AppsTabProps> = ({ onRepoClick, showSortModal, setShowSortModal, startDownload, downloads }) => {
  const [allApps, setAllApps] = useState<GitHubApp[]>([]);
  const [displayedApps, setDisplayedApps] = useState<GitHubApp[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [fromCache, setFromCache] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);
  const [error, setError] = useState('');

  const [query, setQuery] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [platform, setPlatform] = useState<PlatformFilter>('all');
  const [sortMode, setSortMode] = useState<SortMode>('stars');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isSearchMode, setIsSearchMode] = useState(false);
  // showSortModal is now from props
  const [sheetApp, setSheetApp] = useState<GitHubApp | null>(null);
  // showDownloads moved to Index.tsx

  const loaderRef = useRef<HTMLDivElement>(null);
  const token = localStorage.getItem('gh_token') || '';

  // ── 500ms debounce on query ──
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(query), 500);
    return () => clearTimeout(t);
  }, [query]);

  // ── Trigger search when debounced query changes ──
  useEffect(() => {
    if (debouncedQ.trim()) {
      runSearch(debouncedQ, 1);
    } else if (debouncedQ === '' && isSearchMode) {
      setIsSearchMode(false);
      loadDiscover(1, true);
    }
  }, [debouncedQ]);

  // ── Initial load ──
  useEffect(() => {
    const cached = getCachedApps(platform, '');
    if (cached && cached.length > 0) {
      const sorted = sortApps(cached, sortMode);
      setAllApps(sorted);
      setDisplayedApps(sorted.slice(0, PAGE_SIZE));
      setHasMore(sorted.length > PAGE_SIZE);
      setFromCache(true);

      // Auto background refresh silently
      setTimeout(() => loadDiscover(1, true, true), 100);
      return;
    }
    loadDiscover(1, true);
  }, []);

  // ── Sync sheet with modal state for back button handling ──
  useEffect(() => {
    if (!showSortModal) {
      setSheetApp(null);
    }
  }, [showSortModal]);

  // ── Re-sort when sort mode changes ──
  useEffect(() => {
    const sorted = sortApps(allApps, sortMode);
    setAllApps(sorted);
    const p = filterByPlatform(sorted, platform);
    setDisplayedApps(p.slice(0, page * PAGE_SIZE));
  }, [sortMode]);

  // ── Re-filter when platform changes ──
  useEffect(() => {
    const p = filterByPlatform(allApps, platform);
    setDisplayedApps(p.slice(0, PAGE_SIZE));
    setPage(1);
    setHasMore(true); // Reset hasMore to true to allow discovery on new platforms

    if (p.length === 0 && !loading) {
      // Trigger fetch to find items for this category!
      setLoading(true); // Show skeletons while auto-fetching for the new platform
      loadDiscover(1, true, false);
    }
  }, [platform]);

  // ── Infinite scroll observer ──
  useEffect(() => {
    const el = loaderRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
        handleLoadMore();
      }
    }, { threshold: 0.1 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loading, allApps, platform, page]);

  const loadDiscover = async (pg: number, fresh: boolean, silent = false) => {
    if (!silent) {
      if (fresh) setLoading(true);
      else setLoadingMore(true);
    }
    setError('');
    setRateLimited(false);
    try {
      const fetched = await discoverApps(token, pg, PAGE_SIZE);
      if (fetched.length > 0) {
        const sorted = sortApps(
          fresh ? fetched : [...allApps, ...fetched],
          sortMode
        );
        const deduped = Array.from(new Map(sorted.map(a => [a.id, a])).values());
        const filtered = filterByPlatform(deduped, platform);
        setAllApps(deduped);
        setDisplayedApps(filtered.slice(0, pg * PAGE_SIZE));
        setPage(pg);
        setHasMore(fetched.length >= PAGE_SIZE);
        setFromCache(false);
        if (fresh) setCachedApps(platform, '', deduped);

        // Auto Load: If after filtering we still have no apps for this platform, try next page automatically
        if (filtered.length === 0 && fetched.length >= PAGE_SIZE && pg < 10) {
          loadDiscover(pg + 1, false, true);
          return; // Skip finally to keep loading state
        }
      } else {
        setHasMore(false);
      }
    } catch (e: any) {
      const msg = e.message || '';
      if (msg.includes('403') || msg.includes('rate')) {
        setRateLimited(true);
        const cached = getCachedApps(platform, '');
        if (cached) { setAllApps(cached); setDisplayedApps(filterByPlatform(cached, platform)); setFromCache(true); }
      } else if (!silent) {
        setError('Failed to load apps. Check your connection.');
      }
    } finally {
      if (!silent) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  };

  const runSearch = async (q: string, pg: number) => {
    setLoading(true);
    setError('');
    setIsSearchMode(true);
    
    // Clear previous results on fresh search
    if (pg === 1) {
      setAllApps([]);
      setDisplayedApps([]);
    }

    const cached = getCachedApps(platform, q);
    if (cached && cached.length > 0 && pg === 1) {
      const sorted = sortApps(cached, sortMode);
      setAllApps(sorted);
      setDisplayedApps(filterByPlatform(sorted, platform).slice(0, PAGE_SIZE));
      setPage(1);
      setHasMore(sorted.length > PAGE_SIZE);
      setFromCache(true);
      setLoading(false);
      return;
    }
    try {
      const results = await searchGitHubApps(q, token, pg);
      if (results.length > 0) {
        const sorted = sortApps(pg === 1 ? results : [...allApps, ...results], sortMode);
        const deduped = Array.from(new Map(sorted.map(a => [a.id, a])).values());
        const filtered = filterByPlatform(deduped, platform);
        setAllApps(deduped);
        setDisplayedApps(filtered.slice(0, pg * PAGE_SIZE));
        setPage(pg);
        setHasMore(results.length >= 10);
        setFromCache(false);
        setCachedApps(platform, q, deduped);

        // Auto Load Search: If filtered list is empty but we have more results to check
        if (filtered.length === 0 && results.length >= 10 && pg < 5) {
          runSearch(q, pg + 1);
        }
      } else {
        setHasMore(false);
        if (pg === 1) {
          setAllApps([]);
          setDisplayedApps([]);
        }
      }
    } catch (e: any) {
      if (e.message?.includes('403')) {
        setRateLimited(true);
        const cached = getCachedApps(platform, q);
        if (cached) { setAllApps(cached); setDisplayedApps(filterByPlatform(cached, platform)); setFromCache(true); }
      } else {
        setError('Search failed. Try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = useCallback(() => {
    if (loadingMore || loading || !hasMore) return;
    const nextPage = page + 1;
    const filtered = filterByPlatform(allApps, platform);
    if (nextPage * PAGE_SIZE <= filtered.length) {
      setDisplayedApps(filtered.slice(0, nextPage * PAGE_SIZE));
      setPage(nextPage);
      setHasMore(nextPage * PAGE_SIZE < filtered.length);
    } else {
      // Need more from API
      if (isSearchMode) runSearch(debouncedQ, nextPage);
      else loadDiscover(nextPage, false);
    }
  }, [page, allApps, platform, hasMore, loadingMore, loading, isSearchMode, debouncedQ]);

  const handleRefresh = () => {
    clearAppsCache();
    setQuery('');
    setDebouncedQ('');
    setIsSearchMode(false);
    setPage(1);
    setHasMore(true);
    loadDiscover(1, true);
  };

  const PLATFORM_TABS: { key: PlatformFilter; label: string; color: string }[] = [
    { key: 'all', label: 'All', color: 'var(--accent-primary)' },
    { key: 'android', label: 'Android', color: '#3fb950' },
    { key: 'windows', label: 'Windows', color: 'var(--accent-primary)' },
    { key: 'macos', label: 'Mac', color: '#d2a8ff' },
    { key: 'linux', label: 'Linux', color: '#f78166' },
  ];

  const SORT_LABELS: Record<SortMode, React.ReactNode> = {
    stars: <><StarIcon size={12} color="#e3b341" /> Stars</>,
    downloads: <><DownloadIcon size={12} color="var(--accent-primary)" /> Downloads</>,
    updated: <><ClockIcon size={12} color="#3fb950" /> Updated</>,
    newest: <><SparklesIcon size={12} color="#d2a8ff" /> Newest</>,
  };

  return (
    <div className="animate-fadeIn w-full space-y-4 pb-32">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <h2 className="font-sora font-bold text-2xl flex items-center gap-2 text-[hsl(var(--text-primary))]">
          <PackageIcon size={24} color="var(--accent-primary)" />
          App Store
        </h2>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowSortModal(true)}
            className="glass flex items-center gap-1.5 px-3 py-2 rounded-[12px] text-[11px] font-bold text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text-primary))] transition-colors border border-[var(--glass-border)]">
            {SORT_LABELS[sortMode]}
          </button>
          <button onClick={handleRefresh}
            className="glass px-3 py-2 rounded-[12px] text-[11px] font-bold text-[hsl(var(--text-dim))] hover:text-gray-300 transition-colors border border-[var(--glass-border)]">
            ↻
          </button>
        </div>
      </div>

      {/* ── Search bar ── */}
      <div className="flex items-center gap-3">
        <div className="glass-static flex-1 flex items-center gap-3 rounded-[var(--btn-radius)] px-4" style={{ minHeight: 52 }}>
          <SearchIcon size={18} color="hsl(var(--text-muted))" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search open-source apps…"
            className="flex-1 bg-transparent border-none outline-none font-sora text-[0.9rem] text-[hsl(var(--text-primary))]"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-gray-600 hover:text-[hsl(var(--text-muted))] text-lg leading-none">×</button>
          )}
        </div>
        {isSearchMode && (
          <button onClick={() => { setQuery(''); setDebouncedQ(''); }}
            className="glass px-4 py-3 rounded-[var(--btn-radius)] text-[11px] font-bold text-[hsl(var(--text-muted))] border border-[var(--glass-border)] h-[52px]">
            Clear
          </button>
        )}
      </div>

      {/* ── Platform filter tabs ── */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1" style={{ WebkitOverflowScrolling: 'touch' }}>
        {PLATFORM_TABS.map(tab => (
          <button key={tab.key}
            onClick={() => { Native.vibrate(); setPlatform(tab.key); }}
            className="flex-shrink-0 px-4 py-2 rounded-xl font-sora font-bold text-xs capitalize transition-all border"
            style={{
              background: platform === tab.key ? `${tab.color}18` : 'rgba(255,255,255,0.04)',
              borderColor: platform === tab.key ? `${tab.color}45` : 'var(--glass-hover-bg)',
              color: platform === tab.key ? tab.color : 'hsl(var(--text-muted))',
            }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Info banners ── */}
      {fromCache && displayedApps.length > 0 && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-yellow-500/8 border border-yellow-500/20 text-yellow-400 text-xs font-medium">
          ⚡ Showing cached results —
          <button onClick={handleRefresh} className="underline underline-offset-2 text-yellow-300">Refresh</button>
        </div>
      )}
      {rateLimited && (
        <div className="px-4 py-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          🚫 GitHub rate limit reached. Retry in ~1 hour.
        </div>
      )}
      {error && !rateLimited && (
        <div className="flex items-center justify-between px-4 py-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          ❌ {error}
          <button onClick={handleRefresh} className="text-[11px] underline ml-2">Retry</button>
        </div>
      )}

      {/* ── Loading skeletons ── */}
      {loading && (
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => <AppCardSkeleton key={i} />)}
        </div>
      )}

      {/* ── App list ── */}
      {!loading && (
        <div className="grid gap-4">
          <AnimatePresence>
            {displayedApps.map(app => (
              <AppCard key={app.id} app={app} onRepoClick={onRepoClick} onDownload={(app) => { setSheetApp(app); setShowSortModal(true); }} downloads={downloads} startDownload={startDownload} />
            ))}
          </AnimatePresence>


          {displayedApps.length === 0 && !hasMore && !loadingMore && (
            <div className="text-center py-20 bg-[var(--glass-bg)] rounded-3xl border border-[var(--glass-border)]">
              <div className="mx-auto mb-4 opacity-20 flex justify-center"><ZapIcon size={40} color="hsl(var(--text-dim))" /></div>
              <p className="font-sora font-bold text-gray-600 text-sm">End of results</p>
            </div>
          )}
        </div>
      )}

      {/* ── Infinite scroll trigger ── */}
      <div ref={loaderRef} className="flex justify-center py-6">
        {loadingMore && (
          <div className="flex items-center gap-2 text-[hsl(var(--text-dim))] text-sm">
            <AppLoader className="w-5 h-5" /> Loading more…
          </div>
        )}
      </div>

      {/* ── Sort modal ── */}
      <AnimatePresence>
        {showSortModal && (
          <SortModal current={sortMode} onChange={setSortMode} onClose={() => setShowSortModal(false)} />
        )}
      </AnimatePresence>

      {/* Download sheet */}
      <AnimatePresence>
        {sheetApp && (
          <DownloadSheet
            app={sheetApp}
            onClose={() => {
              setSheetApp(null);
              setShowSortModal(false); // Hide "fake" modal state if we were using it to hide bottom nav
            }}
            downloads={downloads}
            startDownload={startDownload}
          />
        )}
      </AnimatePresence>

    </div>
  );
};

export default AppsTab;
