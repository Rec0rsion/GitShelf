import React, { useState, useEffect } from 'react';
import { Native } from '../utils/NativeBridge';
import { Capacitor } from '@capacitor/core';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { DownloadIcon, StarIcon, ForkIcon, BellIcon, BellOffIcon, ArchiveIcon, BookmarkIcon, ShareIcon, GitHubIcon, ZapIcon, PackageIcon, IssuesIcon, FolderIcon } from './Icons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { trackRecentView } from '../utils/recentViews';
import { AppLoader } from './AppLoader';


// ─── Types ───────────────────────────────────────────────

interface ReleaseAsset {
  name: string;
  size: number;
  browser_download_url: string;
  download_count: number;
  platform: 'android' | 'windows' | 'macos' | 'linux' | 'other';
}

interface Release {
  tag_name: string;
  name: string;
  body: string;
  published_at: string;
  prerelease: boolean;
  assets: ReleaseAsset[];
}

interface RepoDetails {
  full_name: string;
  name: string;
  description: string;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  owner: { login: string; avatar_url: string };
}

interface AppDetailPageProps {
  repoSlug: string;
  onClose: () => void;
  startDownload: (url: string, filename: string) => void;
  downloads: any[];
}

// ─── Helpers ─────────────────────────────────────────────

const PLATFORM_EXTS: Record<string, string[]> = {
  android: ['.apk'],
  windows: ['.exe', '.msi'],
  macos: ['.dmg', '.pkg'],
  linux: ['.deb', '.rpm', '.appimage'],
};

const PLATFORM_META = {
  android: { label: 'Android', color: '#3fb950', bg: '#3fb950' },
  windows: { label: 'Windows', color: 'var(--accent-primary)', bg: 'var(--accent-primary)' },
  macos: { label: 'macOS', color: '#f0f6fc', bg: 'hsl(var(--text-muted))' },
  linux: { label: 'Linux', color: '#f78166', bg: '#f78166' },
} as const;

type Platform = keyof typeof PLATFORM_META;

function detectPlatform(filename: string): ReleaseAsset['platform'] {
  const lower = filename.toLowerCase();
  for (const [p, exts] of Object.entries(PLATFORM_EXTS)) {
    if (exts.some(e => lower.endsWith(e))) return p as Platform;
  }
  return 'other';
}

function fmtNum(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'k';
  return String(n);
}

function fmtSize(bytes: number) {
  if (!bytes) return '—';
  return (bytes / 1024 / 1024).toFixed(1) + ' MB';
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

// ─── Pill component ──────────────────────────────────────

const PlatformPill: React.FC<{
  platform: Platform;
  selected: boolean;
  onClick: () => void;
}> = ({ platform, selected, onClick }) => {
  const meta = PLATFORM_META[platform];
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2.5 px-4 py-3 rounded-xl transition-all active:scale-95 border font-sora font-bold text-[11px] uppercase tracking-wide group relative overflow-hidden"
      style={{
        background: selected ? `linear-gradient(135deg, ${meta.color}25, ${meta.color}10)` : 'var(--glass-bg)',
        borderColor: selected ? `${meta.color}60` : 'var(--glass-border)',
        color: selected ? meta.color : 'hsl(var(--text-muted))',
        boxShadow: selected ? `0 8px 24px -10px ${meta.color}30` : 'none',
        flex: '1 1 auto',
        minWidth: '110px',
      }}
    >
      <div className={`p-1.5 rounded-lg transition-all ${selected ? 'bg-[var(--glass-hover-bg)]' : 'bg-[var(--glass-bg)]'}`}>
        {/* Platform icon SVGs inline */}
        {platform === 'android' && (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 18c0 .55.45 1 1 1h1v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h2v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h1c.55 0 1-.45 1-1V8H6v10zM3.5 8C2.67 8 2 8.67 2 9.5v7c0 .83.67 1.5 1.5 1.5S5 17.33 5 16.5v-7C5 8.67 4.33 8 3.5 8zm17 0c-.83 0-1.5.67-1.5 1.5v7c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5v-7c0-.83-.67-1.5-1.5-1.5zm-4.97-5.84l1.3-1.3c.2-.2.2-.51 0-.71-.2-.2-.51-.2-.71 0l-1.48 1.48A5.84 5.84 0 0 0 12 1.5c-.96 0-1.86.23-2.66.63L7.86.65c-.2-.2-.51-.2-.71 0-.2.2-.2.51 0 .71l1.3 1.3A5.96 5.96 0 0 0 6 7h12a5.96 5.96 0 0 0-2.47-4.84zM10 5H9V4h1v1zm5 0h-1V4h1v1z" />
          </svg>
        )}
        {platform === 'windows' && (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-13.051-1.8" />
          </svg>
        )}
        {platform === 'macos' && (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 2.5c1.86 0 3.565.65 4.9 1.73l-1.42 1.42A6.5 6.5 0 0 0 12 6.5a6.5 6.5 0 0 0-6.5 6.5A6.5 6.5 0 0 0 12 19.5a6.5 6.5 0 0 0 5.5-3l1.73 1.01A8.5 8.5 0 0 1 12 20.5 8.5 8.5 0 0 1 3.5 12 8.5 8.5 0 0 1 12 3.5v1z" />
          </svg>
        )}
        {platform === 'linux' && (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C9.5 2 8 3.8 8 5.5c0 .8.2 1.5.5 2.1C7.2 8.4 6 9.9 6 12c0 1.5.5 2.9 1.4 3.9-.3.5-.4 1-.4 1.6C7 19.4 9.2 21 12 21s5-1.6 5-3.5c0-.6-.1-1.1-.4-1.6.9-1 1.4-2.4 1.4-3.9 0-2.1-1.2-3.6-2.5-4.4.3-.6.5-1.3.5-2.1C16 3.8 14.5 2 12 2zm0 2c1.4 0 2 1 2 1.5 0 .4-.1.8-.3 1.1A3.5 3.5 0 0 0 12 6a3.5 3.5 0 0 0-1.7.6C10.1 6.3 10 5.9 10 5.5c0-.5.6-1.5 2-1.5zm0 3.5c1.1 0 2 .5 2.5 1.2.3.4.5.9.5 1.3 0 .6-.3 1.1-.5 1.3-.5-.2-1.2-.3-2-.3s-1.5.1-2 .3c-.2-.2-.5-.7-.5-1.3 0-.4.2-.9.5-1.3.5-.7 1.4-1.2 2.5-1.2zM10 11h4c1.1 0 2 .9 2 2 0 1.4-.8 2.6-2 3.2V17a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-.8c-1.2-.6-2-1.8-2-3.2 0-1.1.9-2 2-2zm1 1.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5zm2 0a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5z" />
          </svg>
        )}
      </div>
      <span>{meta.label}</span>
    </button>
  );
};


// ─── Component ───────────────────────────────────────────

const AppDetailPage: React.FC<AppDetailPageProps> = ({ repoSlug, onClose, startDownload, downloads }) => {
  const [repo, setRepo] = useState<RepoDetails | null>(null);
  const [releases, setReleases] = useState<Release[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isCollected, setIsCollected] = useState(false);
  const [isWatching, setIsWatching] = useState(false);

  const [availablePlatforms, setAvailablePlatforms] = useState<Platform[]>([]);
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null);
  const [selectedRelease, setSelectedRelease] = useState<Release | null>(null);
  const [versionOpen, setVersionOpen] = useState(false);
  const [detailsTab, setDetailsTab] = useState<'releases' | 'readme'>('releases');
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadFinished, setDownloadFinished] = useState(false);
  const [readme, setReadme] = useState<string>('');
  const [shelves, setShelves] = useState<Record<string, { slugs: string[], folder?: { path: string, uri: string } }>>({});
  const [showShelfPicker, setShowShelfPicker] = useState(false);
  const [newShelfName, setNewShelfName] = useState('');

  const ghToken = localStorage.getItem('gh_token') || '';

  // ── Fetch ──────────────────────────────────────────────
  useEffect(() => {
    const updateLocalState = () => {
      const notifs = JSON.parse(localStorage.getItem('gitspace_notifications') || '{}');
      const existing = notifs[repoSlug];
      setIsCollected(existing?.isCollected === true);
      setIsWatching(!!existing?.isWatching);

      const shelfData = JSON.parse(localStorage.getItem('gitspace_shelves') || '{}');
      setShelves(shelfData);
    };

    window.addEventListener('gitspace_notifications_updated', updateLocalState);

    const run = async () => {
      setLoading(true);
      setError('');
      try {
        const headers: Record<string, string> = { 'Accept': 'application/vnd.github.v3+json' };
        if (ghToken) headers['Authorization'] = `token ${ghToken}`;

        const [repoRes, relRes, readmeRes] = await Promise.all([
          fetch(`https://api.github.com/repos/${repoSlug}`, { headers }),
          fetch(`https://api.github.com/repos/${repoSlug}/releases?per_page=20`, { headers }),
          fetch(`https://api.github.com/repos/${repoSlug}/readme`, { headers: { ...headers, 'Accept': 'application/vnd.github.v3.raw' } }),
        ]);

        if (!repoRes.ok) throw new Error('Repository not found.');
        const repoData: RepoDetails = await repoRes.json();
        setRepo(repoData);

        if (readmeRes.ok) {
          const readmeText = await readmeRes.text();
          setReadme(readmeText);
        }

        // Track recently viewed
        trackRecentView({
          id: repoSlug,
          type: 'app',
          name: repoData.name,
          owner: repoData.owner.login,
          avatar: repoData.owner.avatar_url,
          stars: repoData.stargazers_count,
          description: repoData.description
        });

        // Attach platform info to each asset
        const relData: Release[] = relRes.ok ? await relRes.json() : [];
        const enriched = relData.map(rel => ({
          ...rel,
          assets: rel.assets.map(a => ({ ...a, platform: detectPlatform(a.name) })),
        }));

        // Only keep releases that have at least 1 installable asset
        const usable = enriched.filter(r => r.assets.some(a => a.platform !== 'other'));
        setReleases(usable);

        // Derive available platforms across ALL releases
        const seen = new Set<Platform>();
        usable.forEach(r => r.assets.forEach(a => { if (a.platform !== 'other') seen.add(a.platform as Platform); }));
        const platforms = Array.from(seen) as Platform[];
        setAvailablePlatforms(platforms);

        const currentOS = Capacitor.getPlatform();
        let defaultPlatform = platforms[0];
        if (currentOS === 'android' && platforms.includes('android')) {
          defaultPlatform = 'android';
        } else if (currentOS === 'ios' && platforms.includes('macos')) {
          // macos assets aren't ios assets, but close enough for discovery? No, stick to first.
        } else if (currentOS === 'web') {
          // Maybe check userAgent if truly needed, but platforms[0] is fine.
        }

        if (platforms.length > 0) {
          setSelectedPlatform(defaultPlatform);
        }
        if (usable.length > 0) {
          setSelectedRelease(usable[0]);
        }

        // Persist state
        updateLocalState();
      } catch (e: any) {
        setError(e.message || 'Failed to load app details.');
      } finally {
        setLoading(false);
      }
    };
    run();

    // Explicit return for cleanup of the event listener
    return () => {
      window.removeEventListener('gitspace_notifications_updated', updateLocalState);
    };
  }, [repoSlug]);

  // ── Derived ────────────────────────────────────────────

  // Releases that have assets for the selected platform
  const releasesForPlatform = releases.filter(r =>
    r.assets.some(a => a.platform === selectedPlatform)
  );

  // Selected asset = first asset of the right platform in the selected release
  const downloadAsset = selectedRelease?.assets.find(a => a.platform === selectedPlatform) || null;

  // ── Actions ────────────────────────────────────────────

  const handleDownload = async () => {
    if (!downloadAsset) return;
    Native.vibrate();
    startDownload(downloadAsset.browser_download_url, downloadAsset.name);
  };



  const toggleCollect = () => {
    const data = JSON.parse(localStorage.getItem('gitspace_notifications') || '{}');
    if (isCollected) {
      data[repoSlug] = {
        ...(data[repoSlug] || {}),
        name: repo?.name, owner: repo?.owner.login, avatar: repo?.owner.avatar_url,
        isCollected: false, isWatching, hasUpdate: false, lastSeenId: 0,
        isApp: true,
      };
      if (!isWatching) delete data[repoSlug];
      localStorage.setItem('gitspace_notifications', JSON.stringify(data));
      setIsCollected(false);
      Native.vibrate();
      window.dispatchEvent(new Event('gitspace_notifications_updated'));
    } else {
      Native.vibrate();
      const currentData = JSON.parse(localStorage.getItem('gitspace_notifications') || '{}');
      currentData[repoSlug] = {
        ...(currentData[repoSlug] || {}),
        name: repo?.name, owner: repo?.owner.login, avatar: repo?.owner.avatar_url,
        isCollected: true, isWatching, hasUpdate: false, lastSeenId: 0,
        isApp: true,
        subscribedAt: new Date().toISOString(),
      };
      localStorage.setItem('gitspace_notifications', JSON.stringify(currentData));
      setIsCollected(true);
      window.dispatchEvent(new Event('gitspace_notifications_updated'));
    }
  };

  const toggleWatch = () => {
    const data = JSON.parse(localStorage.getItem('gitspace_notifications') || '{}');
    if (repo) {
      data[repoSlug] = {
        ...(data[repoSlug] || {}),
        name: repo.name, owner: repo.owner.login, avatar: repo.owner.avatar_url,
        isWatching: !isWatching, isCollected, hasUpdate: false, lastSeenId: 0,
        isApp: true,  // ← mark as an App-section entry
        updatedAt: new Date().toISOString(),
        subscribedAt: new Date().toISOString(),
        folder: 'General'
      };
    }
    if (data[repoSlug] && data[repoSlug].isWatching) {
      data[repoSlug].updatedAt = new Date().toISOString();
    }
    localStorage.setItem('gitspace_notifications', JSON.stringify(data));
    setIsWatching(v => !v);
    Native.vibrate();
    window.dispatchEvent(new Event('gitspace_notifications_updated'));
  };

  const toggleRepoInShelf = (shelfName: string) => {
    const next = { ...shelves };
    const shelfData = next[shelfName];

    // Handle both old and new formats
    let slugs = Array.isArray(shelfData) ? shelfData : (shelfData?.slugs || []);

    if (slugs.includes(repoSlug)) {
      slugs = slugs.filter(s => s !== repoSlug);
    } else {
      slugs = [...slugs, repoSlug];
      // Mark as collected if added
      const notifs = JSON.parse(localStorage.getItem('gitspace_notifications') || '{}');
      if (notifs[repoSlug]) {
        notifs[repoSlug].isCollected = true;
        notifs[repoSlug].isApp = true;
      } else {
        notifs[repoSlug] = {
          name: repo?.name, owner: repo?.owner.login, avatar: repo?.owner.avatar_url,
          isCollected: true, isWatching, hasUpdate: false, lastSeenId: 0,
          isApp: true, subscribedAt: new Date().toISOString()
        };
      }
      localStorage.setItem('gitspace_notifications', JSON.stringify(notifs));
      window.dispatchEvent(new Event('gitspace_notifications_updated'));
    }

    if (Array.isArray(shelfData)) {
      next[shelfName] = slugs as any;
    } else {
      next[shelfName] = { ...shelfData, slugs };
    }

    setShelves(next);
    localStorage.setItem('gitspace_shelves', JSON.stringify(next));
    Native.vibrate();
  };

  const createAndAddToShelf = () => {
    if (!newShelfName.trim()) return;
    const name = newShelfName.trim();
    const next = { ...shelves, [name]: { slugs: [repoSlug] } };
    setShelves(next);
    localStorage.setItem('gitspace_shelves', JSON.stringify(next));

    const notifs = JSON.parse(localStorage.getItem('gitspace_notifications') || '{}');
    if (notifs[repoSlug]) {
      notifs[repoSlug].isCollected = true;
    } else {
      notifs[repoSlug] = {
        name: repo?.name, owner: repo?.owner.login, avatar: repo?.owner.avatar_url,
        isCollected: true, isWatching, hasUpdate: false, lastSeenId: 0,
        isApp: true, subscribedAt: new Date().toISOString()
      };
    }
    localStorage.setItem('gitspace_notifications', JSON.stringify(notifs));
    window.dispatchEvent(new Event('gitspace_notifications_updated'));

    setNewShelfName('');
    toast.success(`Shelf "${name}" created with this app!`);
    setIsCollected(true);
  };



  // ── Loading ────────────────────────────────────────────

  if (loading) {
    return (
      <div className="fixed inset-0 z-[200] bg-[var(--bg-primary)] flex flex-col items-center justify-center gap-4">
        <AppLoader className="w-8 h-8 text-[var(--accent-primary)] loader" />
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────

  return (
    <div
      className="fixed inset-0 z-[200] overflow-y-auto no-scrollbar gpu-accelerated"
      style={{
        background: 'transparent',
        height: '100dvh',
        width: '100%',
        overscrollBehavior: 'none',
        WebkitOverflowScrolling: 'touch'
      }}
    >
      <motion.div className="w-full min-h-full pb-8">

        {/* ─── Header ─── */}
        <div className="sticky top-0 z-[300] flex items-center transition-all duration-300"
          style={{
            height: 'calc(env(safe-area-inset-top) + 68px)',
            paddingTop: 'env(safe-area-inset-top)',
          }}
        >
          <div className="flex items-center justify-between w-full h-[54px] px-3 bg-white/[0.04] backdrop-blur-3xl border border-white/5 rounded-2xl shadow-2xl">
            <div className="flex items-center gap-3">
              <button onClick={() => { Native.vibrate(); onClose(); }}
                className="group flex items-center justify-center w-9 h-9 rounded-xl bg-white/5 border border-white/10 text-[hsl(var(--text-primary))] cursor-pointer active:scale-90 transition-all hover:bg-white/10">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:-translate-x-0.5 transition-transform">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <div className="flex flex-col">
                <span className="text-[9px] text-[var(--accent-primary)] font-black uppercase tracking-widest opacity-60 leading-none mb-0.5">Application</span>
                <span className="text-[13px] font-bold text-white leading-none truncate max-w-[120px]">{repo?.name}</span>
              </div>
            </div>

            <div className="flex items-center gap-1 p-1 bg-white/5 rounded-xl border border-white/5">
              <HeaderActionButton onClick={toggleCollect} active={isCollected} activeColor="var(--accent-primary)">
                <BookmarkIcon size={18} fill={isCollected ? 'currentColor' : 'none'} color="currentColor" />
              </HeaderActionButton>

              <HeaderActionButton onClick={toggleWatch} active={isWatching} activeColor="#f78166">
                {isWatching ? <BellIcon size={18} color="currentColor" /> : <BellOffIcon size={18} color="currentColor" />}
              </HeaderActionButton>

              <HeaderActionButton onClick={() => { Native.vibrate(); setShowShelfPicker(true); }} active={Object.values(shelves).some(s => s.slugs.includes(repoSlug))} activeColor="var(--accent-primary)">
                <FolderIcon size={18} color="currentColor" />
              </HeaderActionButton>

              <HeaderActionButton onClick={() => { Native.vibrate(); Native.shareRepo(repo?.name || '', repo?.description || '', `https://github.com/${repoSlug}`); }}>
                <ShareIcon size={18} color="currentColor" />
              </HeaderActionButton>
            </div>
          </div>
        </div>

        <div className="pt-12 pb-28 max-w-[600px] mx-auto space-y-10">

          {/* ─── Hero ─── */}
          <div className="relative flex flex-col items-center text-center mt-2 mb-8 px-2">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="relative mb-6 group"
            >
              <div className="relative w-28 h-28 rounded-[32px] overflow-hidden border-[1.5px] border-[var(--glass-border)] shadow-2xl bg-[var(--bg-primary)] flex items-center justify-center p-1 backdrop-blur-xl">
                <img src={repo?.owner.avatar_url} className="w-full h-full object-cover rounded-[26px]" alt="" />
              </div>
              <div className="absolute -bottom-2 right-0 px-2.5 py-1 bg-[var(--accent-primary)] rounded-full shadow-lg border-2 border-[var(--bg-primary)]">
                <GitHubIcon size={12} color="white" />
              </div>
            </motion.div>

            <motion.h1
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="font-sora font-black text-3xl text-[hsl(var(--text-primary))] tracking-tight mb-2"
            >
              {repo?.name}
            </motion.h1>

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.8 }}
              className="flex flex-col items-center gap-5"
            >
              <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--glass-bg)] border border-[var(--glass-border)]">
                <span className="text-[10px] text-[var(--accent-primary)] font-black uppercase tracking-[0.2em] opacity-80">@{repo?.owner.login}</span>
              </div>

              {repo?.description && (
                <p className="text-[hsl(var(--text-muted))] text-[0.95rem] leading-relaxed max-w-[440px] font-medium opacity-90 tracking-tight">
                  {repo.description}
                </p>
              )}
            </motion.div>
          </div>

          {/* ─── Stats Bar ─── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass-static flex items-center justify-around py-4 border border-[var(--glass-border)] rounded-2xl shadow-xl"
          >
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-2 mb-1">
                <StarIcon size={16} color="#e3b341" />
                <span className="font-sora font-black text-[1.2rem] text-[hsl(var(--text-primary))] leading-none">{fmtNum(repo?.stargazers_count || 0)}</span>
              </div>
              <span className="text-[9px] font-black uppercase tracking-[0.15em] text-[hsl(var(--text-dim))]">Stars</span>
            </div>

            <div className="h-6 w-[1px] bg-[var(--glass-border)] opacity-30" />

            <div className="flex flex-col items-center">
              <div className="flex items-center gap-2 mb-1">
                <ForkIcon size={16} color="#3fb950" />
                <span className="font-sora font-black text-[1.2rem] text-[hsl(var(--text-primary))] leading-none">{fmtNum(repo?.forks_count || 0)}</span>
              </div>
              <span className="text-[9px] font-black uppercase tracking-[0.15em] text-[hsl(var(--text-dim))]">Forks</span>
            </div>

            <div className="h-6 w-[1px] bg-[var(--glass-border)] opacity-30" />

            <div className="flex flex-col items-center">
              <div className="flex items-center gap-2 mb-1">
                <IssuesIcon size={16} color="#f78166" />
                <span className="font-sora font-black text-[1.2rem] text-[hsl(var(--text-primary))] leading-none">{fmtNum(repo?.open_issues_count || 0)}</span>
              </div>
              <span className="text-[9px] font-black uppercase tracking-[0.15em] text-[hsl(var(--text-dim))]">Issues</span>
            </div>
          </motion.div>

          {/* ─── Platform Selector ─── */}
          {availablePlatforms.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-[hsl(var(--text-dim))] uppercase tracking-[0.2em] mb-3">Install for</p>
              <div className="flex gap-2 flex-wrap">
                {availablePlatforms.map(p => (
                  <PlatformPill
                    key={p}
                    platform={p}
                    selected={selectedPlatform === p}
                    onClick={() => {
                      Native.vibrate();
                      setSelectedPlatform(p);
                      // Auto-select the first release that has this platform
                      const first = releases.find(r => r.assets.some(a => a.platform === p));
                      if (first) setSelectedRelease(first);
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ─── Version Selector ─── */}
          {selectedPlatform && releasesForPlatform.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-[hsl(var(--text-dim))] uppercase tracking-[0.2em] mb-3">Select Version</p>
              <div className="relative">
                <button
                  onClick={() => setVersionOpen(v => !v)}
                  className="glass-static w-full flex items-center justify-between p-4 border border-[var(--glass-border)] rounded-2xl cursor-pointer hover:bg-[var(--glass-bg)] transition-all"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">🔖</span>
                    <div className="text-left">
                      <p className="font-mono font-bold text-[var(--accent-primary)] text-sm">{selectedRelease?.tag_name || '—'}</p>
                      <p className="text-[10px] text-[hsl(var(--text-dim))] mt-0.5">{selectedRelease ? fmtDate(selectedRelease.published_at) : '—'}</p>
                    </div>
                  </div>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--text-dim))" strokeWidth="2.5"
                    style={{ transform: versionOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s' }}>
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                <AnimatePresence>
                  {versionOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      className="absolute top-full left-0 right-0 mt-2 z-[400] rounded-2xl overflow-hidden shadow-2xl"
                      style={{ background: 'var(--bg-primary)', border: '1px solid var(--glass-border)', maxHeight: 280, overflowY: 'auto' }}
                    >
                      {releasesForPlatform.map(rel => {
                        const assetCount = rel.assets.filter(a => a.platform === selectedPlatform).length;
                        return (
                          <button
                            key={rel.tag_name}
                            onClick={() => { setSelectedRelease(rel); setVersionOpen(false); Native.vibrate(); }}
                            className="flex items-center justify-between px-5 py-4 w-full text-left hover:bg-[var(--glass-bg)] border-b border-[var(--glass-border)] last:border-none transition-all"
                          >
                            <div>
                              <p className="font-mono font-bold text-sm text-[hsl(var(--text-primary))]">{rel.tag_name}</p>
                              <p className="text-[10px] text-[hsl(var(--text-dim))] mt-0.5">{fmtDate(rel.published_at)}{rel.prerelease ? ' · Pre-release' : ''}</p>
                            </div>
                            <span className="text-[10px] font-bold" style={{ color: selectedPlatform ? PLATFORM_META[selectedPlatform].color : 'var(--accent-primary)' }}>
                              {assetCount} file{assetCount > 1 ? 's' : ''}
                            </span>
                          </button>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* ─── Error ─── */}
          {error && (
            <div className="glass-static rounded-2xl p-5 border border-red-500/20 text-center text-[#f78166] text-sm">
              {error}
            </div>
          )}

          {/* ─── Download Section ─── */}
          {downloadAsset ? (
            <div className="space-y-4">
              <p className="text-[10px] font-black text-[hsl(var(--text-dim))] uppercase tracking-[0.3em] ml-1">Installation</p>

              <AnimatePresence mode="wait">
                {downloads.find(d => d.filename === downloadAsset?.name && d.status === 'downloading') ? (
                  <motion.div
                    key="progress-bar"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full glass-static p-6 rounded-[24px] border border-[var(--glass-border)] shadow-xl"
                  >
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-[10px] font-black text-[var(--accent-primary)] uppercase tracking-widest">Downloading...</span>
                      <span className="text-[10px] font-black text-[var(--accent-primary)]">
                        {downloads.find(d => d.filename === downloadAsset?.name)?.progress}%
                      </span>
                    </div>
                    <div className="h-3 w-full bg-[var(--glass-bg)] rounded-full overflow-hidden border border-[var(--glass-border)]">
                      <motion.div
                        className="h-full bg-[var(--accent-primary)] shadow-[0_0_20px_var(--accent-primary)88]"
                        initial={{ width: 0 }}
                        animate={{ width: `${downloads.find(d => d.filename === downloadAsset?.name)?.progress}%` }}
                        transition={{ ease: "easeOut" }}
                      />
                    </div>
                    <p className="text-[10px] text-[hsl(var(--text-dim))] mt-3 font-bold truncate opacity-60 text-center">{downloadAsset.name}</p>
                  </motion.div>
                ) : downloads.some(d => d.filename === downloadAsset?.name && d.status === 'done') ? (
                  <motion.div
                    key="done-btn"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full h-[88px] flex flex-col items-center justify-center gap-1 rounded-[24px] font-sora font-black text-[#3fb950] shadow-xl border border-[#3fb950]/30 bg-[#3fb950]/10 cursor-pointer"
                    onClick={() => {
                      const dl = downloads.find(d => d.filename === downloadAsset?.name && d.status === 'done');
                      if (dl?.localUri) {
                        Native.openFile(dl.localUri);
                      } else if (downloadAsset) {
                        Native.openFile(downloadAsset.name); // Fallback
                      }
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <ZapIcon size={20} color="#3fb950" />
                      <span className="text-xl tracking-tight uppercase">Open Now</span>
                    </div>
                    <p className="text-[10px] opacity-60 uppercase tracking-widest">Saved to Internal Storage</p>
                  </motion.div>
                ) : (
                  <motion.button
                    key="download-btn"
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleDownload}
                    className="w-full flex items-center justify-between p-5 rounded-[24px] font-sora transition-all relative overflow-hidden group"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      cursor: 'pointer',
                      border: 'none',
                    }}
                  >
                    <div className="absolute inset-0 bg-[var(--glass-bg)] opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="text-left flex-1 min-w-0 relative z-10">
                      <div className="flex items-center gap-2 mb-1.5">
                        <p className="text-[1.1rem] font-bold truncate tracking-tight text-[hsl(var(--text-primary))]">
                          {downloadAsset.name}
                        </p>
                        {selectedRelease?.prerelease && (
                          <span className="text-[9px] font-black px-1.5 py-0.5 bg-[#f78166]/10 text-[#f78166] rounded-md">BETA</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 opacity-60 text-[10px] font-bold uppercase tracking-widest text-[hsl(var(--text-muted))]">
                        <p>{fmtSize(downloadAsset.size)}</p>
                        <div className="w-1 h-1 rounded-full bg-current opacity-40" />
                        <p>{downloadAsset.download_count.toLocaleString()} installs</p>
                      </div>
                    </div>
                    <div className="relative z-10 shrink-0 ml-3">
                      <div className="w-11 h-11 rounded-full flex items-center justify-center transition-transform group-hover:scale-110"
                        style={{
                          background: selectedPlatform ? PLATFORM_META[selectedPlatform].color : 'var(--accent-primary)',
                          color: selectedPlatform === 'macos' ? 'var(--bg-primary)' : '#ffffff'
                        }}>
                        <DownloadIcon size={20} color="currentColor" />
                      </div>
                    </div>
                  </motion.button>
                )}
              </AnimatePresence>

              {/* Multiple files for the same platform */}
              {selectedRelease && selectedRelease.assets.filter(a => a.platform === selectedPlatform).length > 1 && (
                <div className="space-y-2 mt-4">
                  <p className="text-[10px] text-[hsl(var(--text-dim))] uppercase font-black tracking-[0.2em] px-1">Other formats</p>
                  {selectedRelease.assets
                    .filter(a => a.platform === selectedPlatform)
                    .slice(1)
                    .map((asset, i) => (
                      <button
                        key={i}
                        onClick={() => { Native.vibrate(); toast.success(`Starting download: ${asset.name}`); Native.downloadAsset(asset.browser_download_url, asset.name); }}
                        className="w-full flex items-center justify-between glass-static p-4 rounded-2xl border border-[var(--glass-border)] transition-all active:scale-[0.98] hover:bg-[var(--glass-bg)]"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-[var(--glass-bg)] flex items-center justify-center opacity-60">
                            <ArchiveIcon size={14} color="hsl(var(--text-muted))" />
                          </div>
                          <span className="font-mono text-xs text-[hsl(var(--text-primary))] font-bold truncate">{asset.name}</span>
                        </div>
                        <span className="text-[10px] font-black text-[var(--accent-primary)] uppercase tracking-widest">{fmtSize(asset.size)}</span>
                      </button>
                    ))}
                </div>
              )}
            </div>
          ) : (
            !error && selectedPlatform && (
              <div className="glass-static rounded-[32px] p-12 text-center border border-[var(--glass-border)]">
                <div className="w-16 h-16 bg-[var(--glass-bg)] rounded-full flex items-center justify-center mx-auto mb-4 grayscale opacity-50">
                  <ArchiveIcon size={32} color="hsl(var(--text-muted))" />
                </div>
                <p className="text-[hsl(var(--text-muted))] font-sora font-bold text-sm">No {PLATFORM_META[selectedPlatform].label} assets available.</p>
                <p className="text-[10px] text-[#484f58] uppercase font-bold tracking-widest mt-2">Check other releases or platforms</p>
              </div>
            )
          )}

          {/* ─── Details Section Toggle ─── */}
          <div className="mt-10">
            <div className="flex items-center gap-6 border-b border-[var(--glass-border)] mb-6">
              {[
                { id: 'releases' as const, label: 'What\'s New' },
                ...(readme ? [{ id: 'readme' as const, label: 'Overview' }] : [])
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => { Native.vibrate(); setDetailsTab(tab.id); }}
                  className={`pb-4 text-[11px] font-black uppercase tracking-[0.3em] transition-all relative ${detailsTab === tab.id ? 'text-[hsl(var(--text-primary))]' : 'text-[hsl(var(--text-dim))]'}`}
                  style={{ background: 'none' }}
                >
                  {tab.label}
                  {detailsTab === tab.id && (
                    <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--accent-primary)] rounded-full" />
                  )}
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              {detailsTab === 'releases' && (
                <motion.div
                  key="releases"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  {selectedRelease && selectedRelease.body ? (
                    <div className="glass-static rounded-2xl p-6 border border-[var(--glass-border)] text-left text-sm text-[hsl(var(--text-primary))]">
                      <div className="prose prose-invert max-w-none prose-p:text-[#e6edf3] prose-headings:text-white prose-a:text-[var(--accent-primary)]">
                        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                          {selectedRelease.body}
                        </ReactMarkdown>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-[hsl(var(--text-dim))] text-sm py-8 uppercase tracking-widest font-bold opacity-50">
                      No release notes provided
                    </div>
                  )}
                </motion.div>
              )}

              {detailsTab === 'readme' && (
                <motion.div
                  key="readme"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <div className="glass-static rounded-2xl p-6 border border-[var(--glass-border)] text-left text-sm text-[hsl(var(--text-primary))]">
                    <div className="prose prose-invert max-w-none prose-p:text-[#e6edf3] prose-headings:text-white prose-a:text-[var(--accent-primary)]">
                      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                        {readme}
                      </ReactMarkdown>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>

      </motion.div>

      <ShelfPicker
        isOpen={showShelfPicker}
        onClose={() => setShowShelfPicker(false)}
        shelves={shelves}
        repoSlug={repoSlug}
        onToggle={toggleRepoInShelf}
        newShelfName={newShelfName}
        setNewShelfName={setNewShelfName}
        onCreate={createAndAddToShelf}
      />
    </div>
  );
};

const HeaderActionButton: React.FC<{
  children: React.ReactNode,
  onClick: () => void,
  active?: boolean,
  activeColor?: string
}> = ({ children, onClick, active, activeColor = "#58a6ff" }) => (
  <motion.button
    whileTap={{ scale: 0.9 }}
    onClick={onClick}
    className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200 border-none bg-transparent cursor-pointer ${active ? '' : 'text-[hsl(var(--text-dim))] hover:text-white'}`}
    style={{
      color: active ? activeColor : undefined,
      background: active ? `${activeColor}15` : undefined,
    }}
  >
    {children}
  </motion.button>
);

const ShelfPicker: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  shelves: Record<string, { slugs: string[], folder?: any }>;
  repoSlug: string;
  onToggle: (name: string) => void;
  newShelfName: string;
  setNewShelfName: (v: string) => void;
  onCreate: () => void;
}> = ({ isOpen, onClose, shelves, repoSlug, onToggle, newShelfName, setNewShelfName, onCreate }) => (
  <AnimatePresence>
    {isOpen && (
      <>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[1000] bg-[#0f141d]/60 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed bottom-0 left-0 right-0 z-[1001] bg-[var(--bg-primary)] border-t border-[var(--glass-border)] rounded-t-[32px] max-h-[70vh] flex flex-col overflow-hidden"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 24px)' }}
        >
          <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto my-4 shrink-0" />

          <div className="px-6 pb-4 flex items-center justify-between">
            <div>
              <h3 className="font-sora font-bold text-xl text-[hsl(var(--text-primary))]">App Shelves</h3>
              <p className="text-[10px] text-[hsl(var(--text-dim))] uppercase font-bold tracking-widest mt-1">Organize your collection</p>
            </div>
            <button onClick={onClose} className="w-10 h-10 rounded-full bg-[var(--glass-bg)] flex items-center justify-center text-[hsl(var(--text-muted))]">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-2 space-y-3">
            {Object.keys(shelves).length === 0 ? (
              <div className="py-12 text-center opacity-40">
                <FolderIcon size={40} color="hsl(var(--text-dim))" />
                <p className="font-sora text-sm mt-4">You have no shelves yet</p>
              </div>
            ) : (
              Object.entries(shelves).map(([name, data]) => {
                const slugs = Array.isArray(data) ? data : (data?.slugs || []);
                const folder = Array.isArray(data) ? null : data.folder;
                const active = slugs.includes(repoSlug);
                return (
                  <button
                    key={name}
                    onClick={() => onToggle(name)}
                    className="w-full flex items-center justify-between p-4 rounded-2xl border transition-all active:scale-[0.98]"
                    style={{
                      background: active ? 'rgba(88,166,255,0.08)' : 'var(--glass-bg)',
                      borderColor: active ? 'var(--accent-primary)' : 'var(--glass-border)',
                      cursor: 'pointer'
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${active ? 'bg-[var(--accent-primary)]/20' : 'bg-white/5'}`}>
                        {folder ? (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={active ? 'var(--accent-primary)' : 'hsl(var(--text-muted))'} strokeWidth="3"><path d="M12 2v8m0 0l-3-3m3 3l3-3M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0z" /></svg>
                        ) : (
                          <FolderIcon size={18} color={active ? 'var(--accent-primary)' : 'hsl(var(--text-muted))'} />
                        )}
                      </div>
                      <div className="text-left">
                        <p className={`font-sora font-bold text-sm ${active ? 'text-[var(--accent-primary)]' : 'text-[hsl(var(--text-primary))]'}`}>{name}</p>
                        <p className="text-[10px] text-[hsl(var(--text-dim))] font-bold">{slugs.length} items</p>
                      </div>
                    </div>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${active ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)]' : 'border-white/10'}`}>
                      {active && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="4"><polyline points="20 6 9 17 4 12" /></svg>}
                    </div>
                  </button>
                );
              })
            )}

            <div className="pt-4 pb-8">
              <p className="text-[10px] font-bold text-[hsl(var(--text-dim))] uppercase tracking-widest ml-1 mb-3">Create New Shelf</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Shelf Name..."
                  value={newShelfName}
                  onChange={e => setNewShelfName(e.target.value)}
                  className="flex-1 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl px-4 py-3 text-[hsl(var(--text-primary))] text-sm outline-none focus:border-[var(--accent-primary)]/50"
                  onKeyDown={e => e.key === 'Enter' && onCreate()}
                />
                <button
                  onClick={onCreate}
                  disabled={!newShelfName.trim()}
                  className="px-6 py-3 bg-[var(--accent-primary)] rounded-xl text-[hsl(var(--text-primary))] font-bold text-sm disabled:opacity-50 transition-all active:scale-95"
                  style={{ border: 'none' }}
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </>
    )}
  </AnimatePresence>
);

export default AppDetailPage;
