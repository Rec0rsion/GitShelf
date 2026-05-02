import React, { useState, useEffect, useCallback } from 'react';
import { repoCache } from '../utils/repoCache';
import { Native } from '../utils/NativeBridge';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { toast } from 'sonner';
import { FolderIcon, FileIcon, BellIcon, BellOffIcon, TrashIcon, PackageIcon, ArchiveIcon, SearchIcon, DownloadIcon, GitHubIcon, BookmarkIcon } from './Icons';
import { motion, AnimatePresence } from 'framer-motion';
import { trackRecentView } from '../utils/recentViews';
import { AppLoader } from './AppLoader';
import { ZapIcon, StarIcon, ForkIcon, IssuesIcon, ShareIcon } from './Icons';

// ─── Types ───
export interface GHRepo {
  id: number;
  name: string;
  full_name: string;
  description: string;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  watchers_count: number;
  subscribers_count: number;
  language: string;
  default_branch: string;
  created_at: string;
  updated_at: string;
  topics: string[];
  html_url: string;
  owner: {
    login: string;
    avatar_url: string;
    html_url: string;
    type: string;
  };
}

interface GHAsset {
  name: string;
  browser_download_url: string;
  size: number;
}

interface GHRelease {
  id: number;
  tag_name: string;
  name: string;
  body: string;
  published_at: string;
  prerelease: boolean;
  zipball_url: string;
  tarball_url: string;
  assets: GHAsset[];
}

// ─── Types ───

// ─── Helpers ───
const LANG_COLORS: Record<string, string> = {
  JavaScript: '#f1e05a', TypeScript: '#3178c6', Python: '#3572A5',
  Java: '#b07219', 'C++': '#f34b7d', C: '#555555', 'C#': '#178600',
  Go: '#00ADD8', Rust: '#dea584', Ruby: '#701516', PHP: '#4F5D95',
  Swift: '#F05138', Kotlin: '#A97BFF', Dart: '#00B4AB',
  HTML: '#e34c26', CSS: '#563d7c', Shell: '#89e051',
};

function fmtNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'k';
  return String(n);
}

function fmtDate(d: string): string {
  return new Date(d).toISOString().split('T')[0];
}

function fmtSize(bytes: number): string {
  return (bytes / 1024 / 1024).toFixed(1) + ' MB';
}

function timeAgo(d: string): string {
  const diff = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`;
  if (diff < 31536000) return `${Math.floor(diff / 2592000)}mo ago`;
  return `${Math.floor(diff / 31536000)}y ago`;
}

function getPlatform(name: string) {
  const n = name.toLowerCase();
  if (n.endsWith('.apk') || n.includes('android'))
    return {
      emoji: <DownloadIcon size={16} color="#3DDC84" />, label: 'Android', bg: 'rgba(61,220,132,0.10)',
      arch: n.includes('arm64') || n.includes('aarch64') ? 'arm64-v8a'
        : n.includes('armeabi') ? 'armeabi-v7a'
          : n.includes('x86_64') ? 'x86_64' : 'Universal'
    };
  if (n.endsWith('.ipa') || n.includes('ios'))
    return { emoji: <DownloadIcon size={16} color="#999" />, label: 'iOS', bg: 'rgba(200,200,200,0.08)', arch: 'Universal' };
  if (n.endsWith('.dmg') || n.includes('darwin') || n.includes('macos') || n.includes('osx') || n.includes('mac-'))
    return {
      emoji: <DownloadIcon size={16} color="#c8c8c8" />, label: 'macOS', bg: 'rgba(200,200,200,0.08)',
      arch: n.includes('arm64') || n.includes('silicon') ? 'Apple Silicon'
        : n.includes('universal') ? 'Universal' : 'Intel x64'
    };
  if (n.endsWith('.deb'))
    return {
      emoji: <DownloadIcon size={16} color="#fcc624" />, label: 'Linux', bg: 'rgba(252,198,36,0.08)',
      arch: (n.includes('arm64') ? 'ARM64' : n.includes('armhf') ? 'ARMhf' : 'x86_64') + ' · deb'
    };
  if (n.endsWith('.rpm'))
    return {
      emoji: <DownloadIcon size={16} color="#fcc624" />, label: 'Linux', bg: 'rgba(252,198,36,0.08)',
      arch: (n.includes('arm64') ? 'ARM64' : 'x86_64') + ' · rpm'
    };
  if (n.endsWith('.appimage'))
    return {
      emoji: <DownloadIcon size={16} color="#fcc624" />, label: 'Linux', bg: 'rgba(252,198,36,0.08)',
      arch: (n.includes('arm64') ? 'ARM64' : 'x86_64') + ' · AppImage'
    };
  if (n.includes('linux') && !n.includes('win') && !n.includes('mac'))
    return {
      emoji: <DownloadIcon size={16} color="#fcc624" />, label: 'Linux', bg: 'rgba(252,198,36,0.08)',
      arch: n.includes('arm64') ? 'ARM64' : n.includes('armhf') ? 'ARMhf' : 'x86_64'
    };
  if (n.endsWith('.exe') || n.endsWith('.msi') || n.includes('win32') || n.includes('win64') || n.includes('windows') || n.includes('-win-'))
    return {
      emoji: <DownloadIcon size={16} color="#0078d4" />, label: 'Windows', bg: 'rgba(0,120,212,0.12)',
      arch: n.includes('arm64') ? 'ARM64'
        : n.includes('ia32') || (n.includes('x86') && !n.includes('x86_64')) ? 'x86'
          : 'x64'
    };
  if (n.endsWith('.zip') || n.endsWith('.tar.gz') || n.endsWith('.tar.xz'))
    return {
      emoji: <PackageIcon size={16} color="#8b949e" />, label: 'Source Code', bg: 'rgba(110,118,129,0.10)',
      arch: n.endsWith('.zip') ? 'ZIP' : 'TAR.GZ'
    };
  return { emoji: <PackageIcon size={16} color="#8b949e" />, label: 'Asset', bg: 'rgba(110,118,129,0.10)', arch: name.split('.').pop()?.toUpperCase() ?? '' };
}

function parseChangelog(body: string) {
  if (!body) return [];
  return body
    .split('\n')
    .map((l) => l.replace(/^[-*•]\s*/, '').trim())
    .filter((l) => l && !l.startsWith('#') && !l.startsWith('http') && l.length > 4)
    .slice(0, 20)
    .map((text) => {
      let tag: 'feat' | 'fix' | 'perf' | 'chore' = 'chore';
      if (/^feat|add|new|support|implement/i.test(text)) tag = 'feat';
      else if (/^fix|bug|patch|correct|resolve/i.test(text)) tag = 'fix';
      else if (/^perf|improv|optim|speed|faster/i.test(text)) tag = 'perf';
      return { tag, text };
    });
}

const GITHUB_SVG = 'M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12';

const tagStyles: Record<string, { color: string; bg: string; border: string }> = {
  feat: { color: '#58a6ff', bg: 'rgba(88,166,255,0.12)', border: 'rgba(88,166,255,0.25)' },
  fix: { color: '#f78166', bg: 'rgba(247,129,102,0.1)', border: 'rgba(247,129,102,0.25)' },
  perf: { color: '#3fb950', bg: 'rgba(63,185,80,0.1)', border: 'rgba(63,185,80,0.25)' },
  chore: { color: '#8b949e', bg: 'rgba(110,118,129,0.15)', border: 'rgba(110,118,129,0.25)' },
};

export interface RepoOpenerProps {
  repoSlug: string;
  onClose: () => void;
  onOpenUser?: (username: string) => void;
  showReleaseHistory?: boolean;
  setShowReleaseHistory?: (show: boolean) => void;
  downloads: any[];
  startDownload: (url: string, filename: string) => void;
}

const RepoOpener: React.FC<RepoOpenerProps> = ({
  repoSlug,
  onClose,
  onOpenUser,
  showReleaseHistory = false,
  setShowReleaseHistory = (show: boolean) => { },
  downloads,
  startDownload
}) => {
  const [repo, setRepo] = useState<GHRepo | null>(null);
  const [releases, setReleases] = useState<GHRelease[]>([]);
  const [selectedRelease, setSelected] = useState<GHRelease | null>(null);
  const [readme, setReadme] = useState<string>('');
  const [dropOpen, setDropOpen] = useState(false);
  const [versionOpen, setVersionOpen] = useState(false);
  const [showAllLogs, setShowAllLogs] = useState(false);
  const [readmeExpanded, setReadmeExpanded] = useState(false);
  const [readmeLoading, setReadmeLoading] = useState(false);
  const [loading, setLoading] = useState(() => {
    const cache = JSON.parse(localStorage.getItem('gitspace_repo_cache') || '{}');
    return !cache[repoSlug];
  });
  const [error, setError] = useState('');
  const [isCollected, setIsCollected] = useState(false);
  const [isWatching, setIsWatching] = useState(false);
  const [shelves, setShelves] = useState<Record<string, { slugs: string[], folder?: any }>>({});
  const [showShelfPicker, setShowShelfPicker] = useState(false);
  const [newShelfName, setNewShelfName] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Phase 1 Features

  const [repoNotes, setRepoNotes] = useState('');
  const [compareSuccess, setCompareSuccess] = useState('');
  const [isExplorerOpen, setIsExplorerOpen] = useState(false);
  const [explorerFiles, setExplorerFiles] = useState<any[]>([]);
  const [explorerPath, setExplorerPath] = useState('');
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [viewingFile, setViewingFile] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [activeAsset, setActiveAsset] = useState<GHAsset | null>(null);
  const [codeQuery, setCodeQuery] = useState('');
  const [codeResults, setCodeResults] = useState<any[]>([]);
  const [codeLoading, setCodeLoading] = useState(false);
  const [insightsOpen, setInsightsOpen] = useState(false);


  useEffect(() => {
    // 1. Initial Local State Logic
    const updateLocalState = () => {
      const notifications = JSON.parse(localStorage.getItem('gitspace_notifications') || '{}');
      const existing = notifications[repoSlug];
      setIsCollected(existing ? existing.isCollected !== false : false);
      setIsWatching(!!existing?.isWatching);

      const shelfData = JSON.parse(localStorage.getItem('gitspace_shelves') || '{}');
      setShelves(shelfData);
    };

    updateLocalState();
    window.addEventListener('gitspace_notifications_updated', updateLocalState);

    const notes = JSON.parse(localStorage.getItem('gitspace_repo_notes') || '{}');
    setRepoNotes(notes[repoSlug] || '');

    // 2. Offline Cache - Instant Loading
    const cache = JSON.parse(localStorage.getItem('gitspace_repo_cache') || '{}');
    if (cache[repoSlug]) {
      const { repo: cRepo, readme: cReadme, releases: cRel } = cache[repoSlug];
      if (cRepo) setRepo(cRepo);
      if (cReadme) setReadme(cReadme);
      if (cRel) {
        setReleases(cRel);
        const first = cRel.find((r: any) => !r.prerelease) ?? cRel[0] ?? null;
        setSelected(first);
      }
    }

    return () => {
      window.removeEventListener('gitspace_notifications_updated', updateLocalState);
    };
  }, [repoSlug]);

  // Auto-select first valid asset when release changes — handled after assets filter below

  const highlightCode = (code: string, name: string) => {
    if (!code) return '';
    const ext = name.split('.').pop()?.toLowerCase() || '';

    // Escape HTML to prevent injection and break rendering
    let html = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    if (['js', 'ts', 'tsx', 'jsx', 'json', 'py', 'go', 'rs', 'java', 'c', 'cpp', 'swift', 'kt'].includes(ext)) {
      // Strings (priority)
      html = html.replace(/(&quot;.*?&quot;|&#39;.*?&#39;|`.*?`)/g, '<span style="color:#98c379">$1</span>');
      // Comments
      html = html.replace(/(\/\/.*$)/gm, '<span style="color:#5c6370;font-style:italic">$1</span>');
      html = html.replace(/(\/\*[\s\S]*?\*\/)/g, '<span style="color:#5c6370;font-style:italic">$1</span>');
      // Keywords
      html = html.replace(/\b(const|let|var|function|return|if|else|for|while|import|export|from|class|extends|interface|type|default|break|continue|async|await|switch|case|try|catch|finally|this|new|typeof|instanceof|void|delete|in|of|as|any|number|string|boolean|object|symbol|bigint|keyof|readonly|public|private|protected|static|abstract|throw|yield)\b/g, '<span style="color:#c678dd">$1</span>');
      // Built-ins & Globals
      html = html.replace(/\b(true|false|null|undefined|NaN|Infinity|window|document|console|process|module|exports|Array|Object|String|Number|Boolean|Map|Set|Promise|Error|Symbol|JSON|Math|Date)\b/g, '<span style="color:#d19a66">$1</span>');
      // Function names & calls
      html = html.replace(/\b([a-zA-Z_]\w*)(?=\s*\()/g, '<span style="color:#61afef">$1</span>');
      // Properties
      html = html.replace(/\.([a-zA-Z_]\w*)\b/g, '.<span style="color:#e06c75">$1</span>');
      // Numbers
      html = html.replace(/\b(\d+(\.\d+)?)\b/g, '<span style="color:#d19a66">$1</span>');
      // Operators
      html = html.replace(/([-+*/%&|^!<>]=?|===|!==|&amp;&amp;|\|\||\?\?)/g, '<span style="color:#56b6c2">$1</span>');
    } else if (['html', 'xml', 'svg'].includes(ext)) {
      // Tags
      html = html.replace(/(&lt;\/?[a-z1-6]+)(&gt;| )/gi, '<span style="color:#e06c75">$1</span>$2');
      // Attributes
      html = html.replace(/ ([a-z-]+)=/gi, ' <span style="color:#d19a66">$1</span>=');
      // Attribute values
      html = html.replace(/=(&quot;.*?&quot;|&#39;.*?&#39;)/g, '=<span style="color:#98c379">$1</span>');
    } else if (['css', 'scss', 'less'].includes(ext)) {
      // Selectors
      html = html.replace(/^([.#\w][^{]+)/gm, '<span style="color:#e06c75">$1</span>');
      // Properties
      html = html.replace(/([\w-]+):/g, '<span style="color:#abb2bf">$1</span>:');
      // Values
      html = html.replace(/: ([^;]+);/g, ': <span style="color:#d19a66">$1</span>;');
    } else if (['md', 'markdown'].includes(ext)) {
      // Headers
      html = html.replace(/^(#+.*)$/gm, '<span style="color:#e06c75;font-weight:bold">$1</span>');
      // Links
      html = html.replace(/(\[.*?\])\((.*?)\)/g, '<span style="color:#61afef">$1</span>(<span style="color:#98c379">$2</span>)');
      // In-line code
      html = html.replace(/(`.*?`)/g, '<span style="color:#98c379">$1</span>');
    }

    return html;
  };

  const handleDownload = () => {
    if (!fileContent || !viewingFile) return;
    const blob = new Blob([fileContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = viewingFile;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopy = () => {
    if (!fileContent) return;
    navigator.clipboard.writeText(fileContent)
      .then(() => {
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      })
      .catch(() => { });
  };

  const getLangBadge = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase() || '';
    const map: Record<string, string> = {
      'ts': 'Typescript', 'tsx': 'JSX', 'js': 'Javascript', 'jsx': 'JSX',
      'py': 'Python', 'html': 'HTML', 'css': 'CSS', 'json': 'JSON',
      'go': 'Go', 'rs': 'Rust', 'java': 'Java', 'c': 'C', 'cpp': 'C++',
      'md': 'Markdown', 'sh': 'Shell', 'yml': 'YAML', 'yaml': 'YAML'
    };
    return map[ext] || ext.toUpperCase() || 'Text';
  };

  const handleAssetDownload = (url: string, filename: string) => {
    Native.vibrate();
    startDownload(url, filename);
  };

  const fetchFiles = async (path: string) => {
    setLoadingFiles(true);
    const token = localStorage.getItem('gh_token');
    const headers = token ? { 'Authorization': `token ${token}` } : {};
    try {
      const res = await fetch(`https://api.github.com/repos/${repoSlug}/contents/${path}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setExplorerFiles(Array.isArray(data) ? data : []);
        setExplorerPath(path);
      }
    } catch (err) {
      console.error("Failed to fetch files", err);
    } finally {
      setLoadingFiles(false);
    }
  };

  const fetchFileContent = async (path: string, name: string) => {
    setLoadingFiles(true);
    setViewingFile(name);
    const token = localStorage.getItem('gh_token');
    const headers = token ? { 'Authorization': `token ${token}` } : {};
    try {
      const res = await fetch(`https://api.github.com/repos/${repoSlug}/contents/${path}`, { headers });
      if (res.ok) {
        const data = await res.json();
        const content = atob(data.content.replace(/\s/g, ''));
        setFileContent(content);
      }
    } catch (err) {
      console.error("Failed to fetch file content", err);
    } finally {
      setLoadingFiles(false);
    }
  };

  const toggleExplorer = () => {
    if (!isExplorerOpen && explorerFiles.length === 0) {
      fetchFiles('');
    }
    setIsExplorerOpen(!isExplorerOpen);
  };

  const handleBack = () => {
    const parts = explorerPath.split('/').filter(Boolean);
    parts.pop();
    fetchFiles(parts.join('/'));
  };

  useEffect(() => {
    if (isExplorerOpen) fetchFiles('');
  }, [repoSlug]);

  const saveNotes = (val: string) => {
    setRepoNotes(val);
    const notes = JSON.parse(localStorage.getItem('gitspace_repo_notes') || '{}');
    notes[repoSlug] = val;
    localStorage.setItem('gitspace_repo_notes', JSON.stringify(notes));
  };

  const handleCodeSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codeQuery.trim()) return;
    setCodeLoading(true);
    try {
      const token = localStorage.getItem('gh_token') || '';
      const headers: Record<string, string> = { 'Accept': 'application/vnd.github.v3.text-match+json' };
      if (token) headers['Authorization'] = `token ${token}`;
      const res = await fetch(`https://api.github.com/search/code?q=${encodeURIComponent(codeQuery)}+repo:${repoSlug}&per_page=5`, { headers });
      const data = await res.json();
      setCodeResults(data.items || []);
    } catch (err) { }
    setCodeLoading(false);
  };

  const addToCollection = () => {
    const notifications = JSON.parse(localStorage.getItem('gitspace_notifications') || '{}');
    if (!notifications[repoSlug] && repo) {
      notifications[repoSlug] = {
        lastSeenId: selectedRelease?.id || 0,
        name: repo.name,
        owner: repo.owner.login,
        avatar: repo.owner.avatar_url,
        hasUpdate: false,
        isWatching: false,
        isCollected: true,
        updatedAt: new Date().toISOString(),
        subscribedAt: new Date().toISOString(),
      };
      localStorage.setItem('gitspace_notifications', JSON.stringify(notifications));
      setIsCollected(true);
      setIsWatching(false);
      window.dispatchEvent(new Event('gitspace_notifications_updated'));
    }
  };



  const toggleNotification = async () => {
    const notifications = JSON.parse(localStorage.getItem('gitspace_notifications') || '{}');

    // Helper: fetch the real latest release/tag ID from GitHub
    const fetchLatestId = async (): Promise<{ id: any, tag_name: string, published_at: string } | null> => {
      try {
        const token = localStorage.getItem('gh_token') || '';
        const headers: Record<string, string> = { 'Accept': 'application/vnd.github.v3+json' };
        if (token) headers['Authorization'] = `token ${token}`;
        const relRes = await fetch(`https://api.github.com/repos/${repoSlug}/releases/latest`, { headers });
        if (relRes.ok) {
          const data = await relRes.json();
          return { id: data.id, tag_name: data.tag_name, published_at: data.published_at };
        }
        const tagRes = await fetch(`https://api.github.com/repos/${repoSlug}/tags?per_page=1`, { headers });
        if (tagRes.ok) {
          const tags = await tagRes.json();
          if (tags.length > 0) return { id: tags[0].name, tag_name: tags[0].name, published_at: new Date().toISOString() };
        }
      } catch (e) { console.error(e); }
      return null;
    };

    if (notifications[repoSlug]) {
      notifications[repoSlug].isWatching = !notifications[repoSlug].isWatching;
      // When enabling watch, snapshot the current latest release so we don't false-flag
      if (notifications[repoSlug].isWatching) {
        notifications[repoSlug].subscribedAt = new Date().toISOString();
        const latest = await fetchLatestId();
        // If we have a specific release selected, use it as baseline to avoid "same build" confusion
        if (selectedRelease) {
          notifications[repoSlug].lastSeenId = selectedRelease.id;
          notifications[repoSlug].latestTagName = selectedRelease.tag_name;
          notifications[repoSlug].latestPublishedAt = selectedRelease.published_at;
        } else if (latest) {
          notifications[repoSlug].lastSeenId = latest.id;
          notifications[repoSlug].latestTagName = latest.tag_name;
          notifications[repoSlug].latestPublishedAt = latest.published_at;
        }
        notifications[repoSlug].hasUpdate = false;
        toast.success(`Notifications enabled for ${repoSlug}`);
      } else {
        toast.info(`Notifications disabled for ${repoSlug}`);
      }
      localStorage.setItem('gitspace_notifications', JSON.stringify(notifications));
      setIsWatching(notifications[repoSlug].isWatching);
    } else if (repo) {
      const latest = await fetchLatestId();
      notifications[repoSlug] = {
        lastSeenId: latest?.id || selectedRelease?.id || 0,
        latestTagName: latest?.tag_name || '',
        latestPublishedAt: latest?.published_at || '',
        name: repo.name,
        owner: repo.owner.login,
        avatar: repo.owner.avatar_url,
        hasUpdate: false,
        isWatching: true,
        isCollected: false,
        updatedAt: new Date().toISOString(),
        folder: 'General'
      };
      localStorage.setItem('gitspace_notifications', JSON.stringify(notifications));
      setIsCollected(false);
      setIsWatching(true);
      toast.success(`Enabled notifications for ${repoSlug}`);
    }
    window.dispatchEvent(new Event('gitspace_notifications_updated'));
  };

  const toggleRepoInShelf = (shelfName: string) => {
    const next = { ...shelves };
    const shelfData = next[shelfName];
    let slugs = Array.isArray(shelfData) ? shelfData : (shelfData?.slugs || []);

    if (slugs.includes(repoSlug)) {
      slugs = slugs.filter(s => s !== repoSlug);
    } else {
      slugs = [...slugs, repoSlug];
      // Mark as collected if added to a shelf
      const notifications = JSON.parse(localStorage.getItem('gitspace_notifications') || '{}');
      if (notifications[repoSlug]) {
        notifications[repoSlug].isCollected = true;
      } else if (repo) {
        notifications[repoSlug] = {
          lastSeenId: selectedRelease?.id || 0,
          name: repo.name,
          owner: repo.owner.login,
          avatar: repo.owner.avatar_url,
          hasUpdate: false,
          isWatching: false,
          isCollected: true,
          updatedAt: new Date().toISOString(),
          subscribedAt: new Date().toISOString(),
        };
      }
      localStorage.setItem('gitspace_notifications', JSON.stringify(notifications));
      setIsCollected(true);
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

    // Also mark as collected
    const notifications = JSON.parse(localStorage.getItem('gitspace_notifications') || '{}');
    if (notifications[repoSlug]) {
      notifications[repoSlug].isCollected = true;
    } else if (repo) {
      notifications[repoSlug] = {
        lastSeenId: selectedRelease?.id || 0,
        name: repo.name,
        owner: repo.owner.login,
        avatar: repo.owner.avatar_url,
        hasUpdate: false,
        isWatching: false,
        isCollected: true,
        updatedAt: new Date().toISOString(),
        subscribedAt: new Date().toISOString(),
      };
    }
    localStorage.setItem('gitspace_notifications', JSON.stringify(notifications));
    setIsCollected(true);
    window.dispatchEvent(new Event('gitspace_notifications_updated'));

    setNewShelfName('');
    toast.success(`Shelf "${name}" created with this repo!`);
  };

  const removeFromCollection = () => {
    const notifications = JSON.parse(localStorage.getItem('gitspace_notifications') || '{}');
    if (notifications[repoSlug]) {
      notifications[repoSlug].isCollected = false;
      if (!notifications[repoSlug].isWatching) {
        delete notifications[repoSlug];
      }
      localStorage.setItem('gitspace_notifications', JSON.stringify(notifications));
      setIsCollected(false);
      window.dispatchEvent(new Event('gitspace_notifications_updated'));
      toast.info(`Removed ${repoSlug} from collection`);
    }
  };

  const fetchData = useCallback(async (slug: string, isSilent = false) => {
    // 1. Check Memory Cache First
    const cacheKey = `repo_${slug}`;
    const relCacheKey = `rel_${slug}`;
    const readmeCacheKey = `readme_${slug}`;

    const mRepo = repoCache.get<GHRepo>(cacheKey);
    const mRel = repoCache.get<GHRelease[]>(relCacheKey);
    const mReadme = repoCache.get<string>(readmeCacheKey);

    if (mRepo && mRel) {
      setRepo(mRepo);
      setReleases(mRel);
      if (mReadme) setReadme(mReadme);
      const first = mRel.find((r) => !r.prerelease) ?? mRel[0] ?? null;
      setSelected(first);
      setLoading(false);
      return;
    }

    if (!isSilent) setLoading(true);
    setError('');
    setShowAllLogs(false);
    try {
      const token = localStorage.getItem('gh_token') || '';
      const headers: Record<string, string> = {
        'Accept': 'application/vnd.github.v3+json',
      };
      if (token) {
        headers['Authorization'] = `token ${token}`;
      }

      const [repoRes, relRes, readmeRes] = await Promise.all([
        fetch(`https://api.github.com/repos/${slug}`, { headers }),
        fetch(`https://api.github.com/repos/${slug}/releases?per_page=30`, { headers }),
        fetch(`https://raw.githubusercontent.com/${slug}/HEAD/README.md`), // Raw content usually doesn't need auth, but can be added if needed
      ]);
      if (!repoRes.ok) {
        if (repoRes.status === 403) throw new Error('API rate limit exceeded. Add a token in Explorer Settings.');
        throw new Error('Repo not found: ' + slug);
      }
      const repoData: GHRepo = await repoRes.json();
      const relData: GHRelease[] = relRes.ok ? await relRes.json() : [];
      const readmeText = readmeRes.ok ? await readmeRes.text() : '';

      setRepo(repoData);
      setReleases(relData);
      setReadme(readmeText);
      const first = relData.find((r) => !r.prerelease) ?? relData[0] ?? null;
      setSelected(first);

      // ─── Update Memory Cache ───
      repoCache.set(cacheKey, repoData);
      repoCache.set(relCacheKey, relData);
      repoCache.set(readmeCacheKey, readmeText);

      // ─── Update Offline Cache (Legacy support) ───
      const cache = JSON.parse(localStorage.getItem('gitspace_repo_cache') || '{}');
      cache[slug] = {
        repo: repoData,
        releases: relData,
        readme: readmeText,
        cachedAt: new Date().toISOString()
      };
      // Keep cache under control (limit to 50 repos for localStorage)
      const keys = Object.keys(cache);
      if (keys.length > 50) delete cache[keys[0]];
      localStorage.setItem('gitspace_repo_cache', JSON.stringify(cache));

      // Track recently viewed
      trackRecentView({
        id: slug,
        type: 'repo',
        name: repoData.name,
        owner: repoData.owner.login,
        avatar: repoData.owner.avatar_url,
        stars: repoData.stargazers_count,
        description: repoData.description
      });


    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const cache = JSON.parse(localStorage.getItem('gitspace_repo_cache') || '{}');
    const cached = cache[repoSlug];
    const isStale = !cached || (Date.now() - new Date(cached.cachedAt).getTime() > 30 * 60 * 1000); // 30 minutes

    if (isStale) {
      fetchData(repoSlug, !!cached);
    }
  }, [repoSlug, fetchData]);

  const filtered = releases;

  const assets = (selectedRelease?.assets ?? []).filter((a) => {
    const n = a.name.toLowerCase();
    return !n.endsWith('.sig')
      && !n.endsWith('.sha256')
      && !n.endsWith('.sha512')
      && !n.endsWith('.asc')
      && !n.endsWith('.json')
      && !n.endsWith('.yml')
      && !n.endsWith('.yaml')
      && !n.endsWith('.txt')
      && !n.endsWith('.md5')
      && !n.includes('checksum')
      && !n.includes('sha256sum')
      && !n.includes('sum');
  });

  // Auto-select first valid asset when selectedRelease changes
  useEffect(() => {
    const freshAssets = (selectedRelease?.assets ?? []).filter((a) => {
      const n = a.name.toLowerCase();
      return !n.endsWith('.sig')
        && !n.endsWith('.sha256')
        && !n.endsWith('.sha512')
        && !n.endsWith('.asc')
        && !n.endsWith('.json')
        && !n.endsWith('.yml')
        && !n.endsWith('.yaml')
        && !n.endsWith('.txt')
        && !n.endsWith('.md5')
        && !n.includes('checksum')
        && !n.includes('sha256sum')
        && !n.includes('sum');
    });
    if (freshAssets.length > 0) setActiveAsset(freshAssets[0]);
    else setActiveAsset(null);
  }, [selectedRelease]);

  const changelog = parseChangelog(selectedRelease?.body ?? '');
  const visibleLogs = showAllLogs ? changelog : changelog.slice(0, 5);
  const langColor = LANG_COLORS[repo?.language ?? ''] ?? '#8b949e';



  return (
    <motion.div className="w-full min-h-full pb-32">
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
              <span className="text-[9px] text-[var(--accent-primary)] font-black uppercase tracking-widest opacity-60 leading-none mb-0.5">Repository</span>
              <span className="text-[13px] font-bold text-white leading-none truncate max-w-[120px]">{repo?.name}</span>
            </div>
          </div>

          <div className="flex items-center gap-1 p-1 bg-white/5 rounded-xl border border-white/5">
            <HeaderActionButton onClick={() => { Native.vibrate(); isCollected ? removeFromCollection() : addToCollection(); }} active={isCollected} activeColor="var(--accent-primary)">
              <BookmarkIcon size={18} fill={isCollected ? 'currentColor' : 'none'} color="currentColor" />
            </HeaderActionButton>

            <HeaderActionButton onClick={toggleNotification} active={isWatching} activeColor="#f78166">
              {isWatching ? <BellIcon size={18} color="currentColor" /> : <BellOffIcon size={18} color="currentColor" />}
            </HeaderActionButton>

            <HeaderActionButton onClick={() => { Native.vibrate(); setShowShelfPicker(true); }} active={Object.values(shelves).some(s => (Array.isArray(s) ? s : s.slugs).includes(repoSlug))} activeColor="var(--accent-primary)">
              <FolderIcon size={18} color="currentColor" />
            </HeaderActionButton>

            <HeaderActionButton onClick={() => { Native.vibrate(); Native.shareRepo(repo?.name || '', repo?.description || '', `https://github.com/${repoSlug}`); }}>
              <ShareIcon size={18} color="currentColor" />
            </HeaderActionButton>
          </div>
        </div>
      </div>

      <div className="pt-6" />

      {/* Loading State */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-9 h-9 border-2 border-white/10 border-t-[#58a6ff] rounded-full animate-spin" />
          <p className="text-[0.85rem] text-[#8b949e] font-medium tracking-wide">Syncing Repository...</p>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="glass-static mx-2.5 mb-6" style={{ borderRadius: 14, padding: '1.25rem', color: '#f78166', fontSize: '0.85rem' }}>
          <p className="font-bold mb-1">Update Failed</p>
          <p className="opacity-80">{error}</p>
        </div>
      )}

      {/* Main Content */}
      {!loading && !error && repo && (
        <div className="px-2.5">
          {/* Click-away backdrops for various menus */}
          {(showShelfPicker || versionOpen || showDeleteConfirm) && (
            <div
              className="fixed inset-0 z-[200] bg-[#0f141d]/20 backdrop-blur-sm"
              onClick={() => {
                setShowShelfPicker(false);
                setVersionOpen(false);
                setDropOpen(false);
                setShowDeleteConfirm(false);
              }}
            />
          )}
          {/* APP HEADER CARD */}
          <div className="glass-static flex gap-5 mb-4 animate-fadeInUp" style={{ borderRadius: 20, padding: '1.5rem' }}>
            <div className="flex-shrink-0" style={{ width: 72, height: 72, borderRadius: 18, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.18)' }}>
              <img src={repo.owner.avatar_url} alt={repo.owner.login} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-sora font-bold text-white mb-1" style={{ fontSize: '1.5rem', letterSpacing: '-0.04em', lineHeight: 1.2 }}>
                {repo.name}
              </h2>
              <p className="font-medium mb-3" style={{ fontSize: '0.82rem', color: '#58a6ff' }}>by @{repo.owner.login}</p>

              <div className="flex items-center gap-2 flex-wrap mb-4">
                {selectedRelease && (
                  <span className="font-mono" style={{
                    fontSize: '0.78rem', fontWeight: 600, padding: '4px 12px', borderRadius: 100,
                    background: 'rgba(88,166,255,0.1)', border: '1px solid rgba(88,166,255,0.25)', color: '#58a6ff',
                  }}>{selectedRelease.tag_name}</span>
                )}
                {selectedRelease && (
                  <span style={{ fontSize: '0.75rem', color: '#6e7681' }}>{fmtDate(selectedRelease.published_at)}</span>
                )}
                {repo.language && (
                  <span className="flex items-center gap-1.5 ml-1" style={{ fontSize: '0.75rem', color: '#8b949e' }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: langColor, display: 'inline-block' }} />
                    {repo.language}
                  </span>
                )}
              </div>
              <p style={{ fontSize: '0.85rem', color: '#8b949e', lineHeight: 1.6 }}>{repo.description ?? 'No description.'}</p>
            </div>
          </div>

          {/* STATS BAR */}
          <div className="glass-static flex items-center justify-between px-6 py-4 mb-6 shadow-xl animate-fadeInUp" style={{ borderRadius: 22, animationDelay: '0.1s' }}>
            {[
              { label: 'Forks', value: fmtNum(repo.forks_count), color: '#58a6ff', icon: <ForkIcon size={16} color="#58a6ff" /> },
              { label: 'Stars', value: fmtNum(repo.stargazers_count), color: '#e3b341', icon: <StarIcon size={16} color="#e3b341" /> },
              { label: 'Issues', value: fmtNum(repo.open_issues_count), color: '#f78166', icon: <IssuesIcon size={16} color="#f78166" /> },
            ].map((s, i) => (
              <React.Fragment key={s.label}>
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-2 mb-1">
                    {s.icon}
                    <span className="font-mono font-black text-[1.25rem] text-[#e6edf3] leading-none">{s.value}</span>
                  </div>
                  <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#8b949e]">{s.label}</span>
                </div>
                {i < 2 && <div className="h-6 w-[1px] bg-white/10" />}
              </React.Fragment>
            ))}
          </div>

          {/* RELEASE DATE CARD (Clickable for History) */}
          <div className="w-full glass-static flex items-center gap-4 py-4 px-5 mb-4 active:scale-[0.98] transition-all cursor-pointer"
            style={{ borderRadius: 18, border: '1px solid rgba(255,255,255,0.05)' }}
            onClick={() => { Native.vibrate(); setShowReleaseHistory(true); }}
          >
            <div className="w-11 h-11 rounded-2xl bg-[#58a6ff]/10 flex items-center justify-center border border-[#58a6ff]/20">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#58a6ff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#8b949e] mb-1">Created Date</p>
              <div className="font-sora font-extrabold text-[#e6edf3] text-[1rem]">
                {new Date(repo.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
            </div>
            <div className="text-[#8b949e] opacity-40">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>
            </div>
          </div>

          {/* CODE SEARCH */}
          <div className="glass-static mb-4" style={{ borderRadius: 14, padding: '1.25rem' }}>
            <span className="font-sora font-bold mb-3 block" style={{ fontSize: '0.88rem' }}>Code Search</span>
            <form onSubmit={handleCodeSearch} className="flex gap-2">
              <input
                type="text"
                value={codeQuery}
                onChange={e => setCodeQuery(e.target.value)}
                placeholder="Search repo code..."
                className="flex-1 bg-white/[0.03] border border-white/10 rounded-xl py-2 px-3 text-[#e6edf3] text-sm focus:outline-none focus:border-[#58a6ff] transition-all"
              />
              <button
                type="submit"
                disabled={codeLoading}
                onClick={() => Native.vibrate()}
                className="font-sora font-bold px-4 rounded-xl transition-all"
                style={{ background: '#58a6ff', color: '#fff', fontSize: '0.8rem', border: 'none', cursor: 'pointer', opacity: codeLoading ? 0.7 : 1 }}
              >
                {codeLoading ? '...' : 'Search'}
              </button>
            </form>
            {codeResults.length > 0 && (
              <div className="mt-3 flex flex-col gap-2">
                {codeResults.map(res => (
                  <a key={res.sha} href={res.html_url} target="_blank" rel="noopener noreferrer" className="block glass p-2.5 rounded-lg transition-colors hover:bg-white/5 text-decoration-none group">
                    <div className="text-[11px] font-mono font-bold text-[#58a6ff] truncate mb-1.5">{res.path}</div>
                    {res.text_matches && res.text_matches.length > 0 && (
                      <div className="bg-[#121821] rounded border border-white/5 p-1.5 mt-1 overflow-hidden">
                        <pre className="text-[9px] text-[#8b949e] font-mono whitespace-pre-wrap leading-tight max-h-[60px] overflow-hidden" style={{ wordBreak: 'break-all' }}>
                          {res.text_matches[0].fragment.trim()}
                        </pre>
                      </div>
                    )}
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* CODE EXPLORER */}
          <div className="animate-fadeInUp-2 mb-4">
            <button
              onClick={() => { Native.vibrate(); toggleExplorer(); }}
              className="glass-static w-full flex items-center justify-between transition-all active:scale-[0.98]"
              style={{ borderRadius: 16, padding: '1rem 1.25rem', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', background: 'rgba(255,255,255,0.02)' }}
            >
              <div className="flex items-center gap-3">
                <FolderIcon size={18} color="#58a6ff" />
                <span className="font-sora font-bold text-[#e6edf3]" style={{ fontSize: '0.9rem' }}>Code Explorer</span>
              </div>
              <svg
                width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8b949e" strokeWidth="2.5"
                style={{ transform: isExplorerOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {isExplorerOpen && (
              <div className="glass-static mt-2 overflow-hidden animate-slideDown" style={{ borderRadius: 16, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(18,24,33,0.4)' }}>
                <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-white/5">
                  <button
                    disabled={!explorerPath}
                    onClick={() => { Native.vibrate(); handleBack(); }}
                    className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-20 transition-all active:scale-90"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6" /></svg>
                  </button>
                  <div className="flex-1 font-mono text-[10px] text-[#8b949e] truncate">
                    {explorerPath || 'root'}
                  </div>
                </div>

                <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  {loadingFiles && explorerFiles.length === 0 ? (
                    <div className="py-12 flex justify-center items-center opacity-40">
                      <AppLoader className="w-5 h-5 text-[#58a6ff] loader" />
                    </div>
                  ) : (
                    <div className="flex flex-col">
                      {explorerFiles.map((file: any) => (
                        <button
                          key={file.sha}
                          onClick={() => { Native.vibrate(); file.type === 'dir' ? fetchFiles(file.path) : fetchFileContent(file.path, file.name); }}
                          className="flex items-center gap-3 px-4 py-3 text-left hover:bg-white/5 active:bg-white/10 transition-colors border-b border-white/5 last:border-none"
                        >
                          {file.type === 'dir' ? <FolderIcon size={16} color="#58a6ff" /> : <FileIcon size={16} color="#8b949e" />}
                          <div className="flex-1 min-w-0">
                            <div className="font-sora text-[#e6edf3] text-[0.85rem] truncate">{file.name}</div>
                            <div className="text-[10px] text-[#6e7681]">{file.type === 'dir' ? 'Folder' : `${(file.size / 1024).toFixed(1)} KB`}</div>
                          </div>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6e7681" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>
                        </button>
                      ))}
                      {explorerFiles.length === 0 && <div className="py-8 text-center text-[#6e7681] text-xs">This directory is empty</div>}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* FILE VIEWER CODE PAGE */}
          {/* FILE VIEWER CODE PAGE (Transparent UI) */}
          {viewingFile && (
            <div className="fixed inset-0 z-[500] flex flex-col p-4" style={{ background: 'rgba(18,24,33,0.6)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="flex-1 glass-static overflow-hidden flex flex-col shadow-2xl relative"
                style={{ borderRadius: 24, background: 'rgba(18,24,33,0.85)', border: '1px solid rgba(255,255,255,0.18)' }}
              >
                {/* Modal Header */}
                <div className="px-5 py-4 flex items-center justify-between border-b border-white/10" style={{ background: 'rgba(18,24,33,0.4)', backdropFilter: 'blur(10px)' }}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-[#58a6ff]/15 flex items-center justify-center border border-[#58a6ff]/30">
                      <FileIcon size={20} color="#58a6ff" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <p className="font-sora font-bold text-[#e6edf3] text-[0.9rem] truncate leading-tight">{viewingFile}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] text-[#58a6ff] font-mono font-bold uppercase tracking-wider">{getLangBadge(viewingFile)}</span>
                        <span className="text-[10px] text-[#6e7681] font-mono opacity-50">• {explorerPath || 'root'}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => { setViewingFile(null); setFileContent(null); }}
                    className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-white/10 transition-all active:scale-90 cursor-pointer"
                    style={{ border: 'none', background: 'rgba(255,255,255,0.05)' }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8b949e" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                  </button>
                </div>

                {/* Code Container */}
                <div className="flex-1 overflow-hidden flex flex-col relative">
                  {!fileContent ? (
                    <div className="flex-1 flex flex-col items-center justify-center gap-4">
                      <AppLoader className="w-12 h-12 text-[#58a6ff] loader" />
                      <p className="text-[#8b949e] text-xs font-mono font-bold tracking-widest animate-pulse">DECODING STREAM...</p>
                    </div>
                  ) : (
                    <div className="flex-1 flex overflow-auto font-mono text-[13px] relative selection:bg-[#58a6ff]/30 antialiased" style={{ lineHeight: '20px', WebkitOverflowScrolling: 'touch' }}>
                      {/* Line Numbers Gutter */}
                      <div className="py-6 px-2 text-right select-none opacity-25 border-r border-white/5 sticky left-0 z-10" style={{ minWidth: 44, background: 'rgba(18,24,33,0.3)', backdropFilter: 'blur(5px)' }}>
                        {fileContent.split('\n').map((_, i) => (
                          <div key={i} className="text-[10px] font-mono" style={{ height: 20 }}>{i + 1}</div>
                        ))}
                      </div>
                      {/* Syntax Highlighted Code */}
                      <div className="flex-1 py-6 px-4 min-w-fit">
                        <pre
                          className="font-mono text-[13px]"
                          style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', tabSize: 2, color: '#abb2bf', lineHeight: '20px' }}
                          dangerouslySetInnerHTML={{ __html: highlightCode(fileContent, viewingFile) }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Floating Action Row */}
                  <AnimatePresence>
                    {fileContent && (
                      <motion.div
                        initial={{ y: 50, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1 p-1 glass-static shadow-2xl z-20"
                        style={{ borderRadius: 14, background: 'rgba(22,27,34,0.95)', border: '1px solid rgba(255,255,255,0.25)', scale: 0.9 }}
                      >
                        <button
                          onClick={handleCopy}
                          className="flex items-center gap-2 px-4 py-2 hover:bg-white/5 rounded-xl transition-all active:scale-95 group"
                          style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                        >
                          {copySuccess ? (
                            <><span className="text-green-400 font-bold">✓</span> <span className="text-[#e6edf3] text-[10px] font-bold uppercase tracking-wider">Copied</span></>
                          ) : (
                            <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#58a6ff" strokeWidth="2.5" className="group-hover:scale-110 transition-transform"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg> <span className="text-[#e6edf3] text-[10px] font-bold uppercase tracking-wider">Copy</span></>
                          )}
                        </button>
                        <div className="w-[1px] h-4 bg-white/15" />
                        <button
                          onClick={handleDownload}
                          className="flex items-center gap-2 px-4 py-2 hover:bg-white/5 rounded-xl transition-all active:scale-95 group"
                          style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                        >
                          <DownloadIcon size={12} color="#3fb950" />
                          <span className="text-[#e6edf3] text-[10px] font-bold uppercase tracking-wider">Save</span>
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            </div>
          )}




          {/* VERSION SELECTOR */}
          <div className="relative mb-4 animate-fadeInUp" style={{ animationDelay: '0.2s' }}>
            <button
              onClick={() => { Native.vibrate(); setVersionOpen(!versionOpen); }}
              className="glass-static w-full flex items-center justify-between transition-all active:scale-[0.98]"
              style={{ borderRadius: 18, padding: '1rem 1.25rem', cursor: 'pointer' }}
            >
              <div className="flex items-center gap-4">
                <span style={{ fontSize: '1.1rem' }}>🔖</span>
                <div className="text-left">
                  <p className="font-mono font-bold text-[#58a6ff]" style={{ fontSize: '1.05rem', lineHeight: 1 }}>
                    {selectedRelease?.tag_name ?? 'No releases'}
                  </p>
                  <p className="mt-1" style={{ fontSize: '0.72rem', color: '#6e7681' }}>
                    {assets.length} installable files found
                  </p>
                </div>
              </div>
              <svg
                width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8b949e" strokeWidth="2.5"
                style={{ transform: versionOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {versionOpen && (
              <div className="glass-static mt-2 absolute top-full left-0 right-0 z-[210] overflow-hidden backdrop-blur-md" style={{ borderRadius: 16, padding: '8px', border: '1px solid rgba(255,255,255,0.18)', boxShadow: '0 20px 50px rgba(0,0,0,0.6)', background: 'rgba(18,24,33,0.9)' }}>
                {filtered.length === 0 && (
                  <div className="px-4 py-3 text-sm text-[#8b949e]">No releases found.</div>
                )}
                {filtered.map((r) => (
                  <button key={r.id} onClick={() => { setSelected(r); setVersionOpen(false); setShowAllLogs(false); }} className="w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all hover:bg-white/5 active:bg-white/10 text-decoration-none border-none bg-transparent mb-1 cursor-pointer text-[#e6edf3]">
                    <div className="text-left">
                      <p className="font-mono font-bold text-[0.9rem]" style={{ color: selectedRelease?.id === r.id ? '#58a6ff' : '#e6edf3' }}>{r.tag_name}</p>
                      <p className="text-[0.7rem] text-[#8b949e] mt-0.5">{fmtDate(r.published_at)}</p>
                    </div>
                    {selectedRelease?.id === r.id && <div className="w-2 h-2 rounded-full bg-[#58a6ff]" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Version Content with Animation Key */}
          <div key={selectedRelease?.id} className="animate-fadeIn">
            {assets.length > 0 ? (
              <>
                {/* INSTALL BUTTONS */}
                <div className="flex gap-2.5 mb-6 animate-fadeInUp" style={{ animationDelay: '0.3s' }}>
                  <button
                    onClick={() => activeAsset && handleAssetDownload(activeAsset.browser_download_url, activeAsset.name)}
                    className="flex-1 flex items-center justify-between glass-static border border-[#58a6ff]/35 bg-[#58a6ff]/15 px-5 py-4 transition-all active:scale-[0.97]"
                    style={{ borderRadius: 16, cursor: activeAsset ? 'pointer' : 'default' }}
                  >
                    {(() => {
                      const dlTask = downloads.find(d => d.filename === activeAsset?.name && d.status === 'downloading');
                      const dlDone = downloads.find(d => d.filename === activeAsset?.name && d.status === 'done');

                      if (dlTask) {
                        return (
                          <div className="flex flex-col w-full gap-2">
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] font-black uppercase tracking-widest text-[#58a6ff]">Downloading...</span>
                              <span className="text-[10px] font-black text-[#58a6ff]">{dlTask.progress}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                              <motion.div className="h-full bg-[#58a6ff]" initial={{ width: 0 }} animate={{ width: `${dlTask.progress}%` }} />
                            </div>
                          </div>
                        );
                      }

                      if (dlDone) {
                        return (
                          <div className="flex items-center justify-between w-full" onClick={(e) => { e.stopPropagation(); Native.openFile(dlDone.localUri || activeAsset?.name || ''); }}>
                            <div className="flex items-center gap-4">
                              <ZapIcon size={20} color="#3fb950" />
                              <div className="text-left">
                                <p className="font-sora font-black text-[0.85rem] text-[#3fb950] leading-none mb-1">OPEN NOW</p>
                                <p className="text-[10px] opacity-60 text-[#3fb950] font-mono">INTERNAL STORAGE</p>
                              </div>
                            </div>
                            <div className="w-9 h-9 rounded-full bg-[#3fb950]/20 flex items-center justify-center">
                              <ZapIcon size={16} color="#3fb950" />
                            </div>
                          </div>
                        );
                      }

                      return (
                        <>
                          <div className="flex items-center gap-4">
                            <span style={{ fontSize: '1.2rem' }}>{activeAsset ? getPlatform(activeAsset.name).emoji : '📦'}</span>
                            <div className="text-left">
                              <p className="font-sora font-bold text-white text-[0.95rem] leading-none mb-1 truncate max-w-[140px]">
                                {activeAsset ? activeAsset.name : 'Select File'}
                              </p>
                              <p className="font-mono text-[0.68rem] text-[#58a6ff]/80">INSTALL APP</p>
                            </div>
                          </div>
                          <DownloadIcon size={20} color="#58a6ff" />
                        </>
                      );
                    })()}
                  </button>
                  <button
                    onClick={() => setDropOpen(!dropOpen)}
                    className="w-[52px] h-[52px] flex items-center justify-center glass-static border border-[#58a6ff]/35 bg-[#58a6ff]/15 transition-all active:scale-90"
                    style={{ borderRadius: 16, cursor: 'pointer', height: 'auto' }}
                  >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#58a6ff" strokeWidth="2.5" style={{ transform: dropOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s' }}><polyline points="6 9 12 15 18 9" /></svg>
                  </button>
                </div>
              </>
            ) : (
              <div className="flex gap-2 mb-3">
                <button
                  onClick={() => {
                    if (activeAsset) {
                      handleAssetDownload(activeAsset.browser_download_url, activeAsset.name);
                    } else {
                      const url = selectedRelease?.zipball_url || `https://github.com/${repoSlug}/archive/refs/heads/${repo?.default_branch || 'main'}.zip`;
                      handleAssetDownload(url, `${repo?.name || 'source'}.zip`);
                    }
                  }}
                  className="flex-1 text-left"
                  style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer' }}
                >
                  <div className="glass-static flex items-center justify-between transition-all hover:border-white/20 active:scale-[0.98]" style={{
                    borderRadius: 12, padding: '0.85rem 1rem', background: 'rgba(63,185,80,0.12)', border: '1px solid rgba(63,185,80,0.3)', color: '#3fb950', cursor: 'pointer'
                  }}>
                    <div className="flex items-center gap-3 min-w-0">
                      <span style={{ flexShrink: 0 }}>{activeAsset ? getPlatform(activeAsset.name).emoji : <PackageIcon size={18} color="#3fb950" />}</span>
                      <div className="flex flex-col min-w-0">
                        <span className="font-sora font-bold truncate" style={{ fontSize: '0.82rem' }}>
                          {activeAsset ? activeAsset.name : `${repo?.name || 'source'}-${selectedRelease?.tag_name || 'main'}.zip`}
                        </span>
                        <span style={{ fontSize: '0.62rem', color: 'rgba(63,185,80,0.7)' }}>
                          {activeAsset ? `${getPlatform(activeAsset.name).label} · ${getPlatform(activeAsset.name).arch}` : 'Source Code · ZIP'}
                        </span>
                      </div>
                    </div>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                  </div>
                </button>
                <button onClick={() => setDropOpen(!dropOpen)} style={{
                  width: 52, flexShrink: 0, borderRadius: 12, cursor: 'pointer',
                  background: 'rgba(63,185,80,0.12)', border: '1px solid rgba(63,185,80,0.3)', color: '#3fb950',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: dropOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}><polyline points="6 9 12 15 18 9" /></svg>
                </button>
              </div>
            )}

            {/* Platform dropdown / Other assets */}
            {dropOpen && (
              <div onClick={(e) => e.stopPropagation()} style={{ background: 'var(--bg-secondary)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: 14, overflow: 'hidden', marginBottom: '0.75rem', boxShadow: '0 10px 40px rgba(0,0,0,0.5)', position: 'relative', zIndex: 210 }}>
                <p style={{ padding: '0.85rem 1.1rem 0.5rem', fontSize: '0.7rem', color: '#6e7681', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>Available Downloads</p>

                {/* Release specific binary assets */}
                {assets.map((a) => {
                  const p = getPlatform(a.name);
                  const isSelected = activeAsset?.name === a.name;
                  return (
                    <div
                      key={a.name}
                      onClick={() => { setActiveAsset(a); setDropOpen(false); }}
                      className={`flex items-center gap-3 px-4 py-3 cursor-pointer border-b border-white/[0.06] last:border-0 transition-all ${isSelected ? 'bg-blue-500/[0.10] border-l-2 border-l-blue-500' : 'hover:bg-white/[0.05]'}`}
                    >
                      <div className="w-8 h-8 rounded-[8px] flex items-center justify-center text-base flex-shrink-0" style={{ background: p?.bg }}>
                        {p?.emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[0.82rem] font-semibold text-[#e6edf3]">{p?.label}
                          <span className="ml-1.5 text-[#6e7681] font-normal text-[0.7rem]">· {p?.arch}</span>
                        </p>
                        <p className="text-[0.68rem] text-[#6e7681] truncate font-mono">{a.name}</p>
                      </div>
                      <span className="text-[0.7rem] text-[#6e7681] font-mono whitespace-nowrap">{fmtSize(a.size)}</span>
                      {isSelected
                        ? <span className="px-2.5 py-[3px] bg-blue-500/20 border border-blue-500/40 rounded-full text-[#58a6ff] text-[0.65rem] font-semibold">Selected</span>
                        : <span className="px-2.5 py-[3px] bg-white/[0.05] border border-white/10 rounded-full text-[#8b949e] text-[0.65rem]">↓ Get</span>
                      }
                    </div>
                  );
                })}

                {/* Source Code Fallbacks (Always present) */}
                {(() => {
                  const zipUrl = selectedRelease?.zipball_url || `https://github.com/${repoSlug}/archive/refs/heads/${repo?.default_branch || 'main'}.zip`;
                  const tarUrl = selectedRelease?.tarball_url || `https://github.com/${repoSlug}/archive/refs/heads/${repo?.default_branch || 'main'}.tar.gz`;
                  const zipName = `${repo?.name || 'source'}-${selectedRelease?.tag_name || 'main'}.zip`;
                  const tarName = `${repo?.name || 'source'}-${selectedRelease?.tag_name || 'main'}.tar.gz`;
                  const isZipSelected = activeAsset?.name === zipName;
                  const isTarSelected = activeAsset?.name === tarName;
                  return (
                    <>
                      <div
                        onClick={() => { setActiveAsset({ name: zipName, browser_download_url: zipUrl, size: 0 }); setDropOpen(false); }}
                        className={`flex items-center gap-3 px-4 py-3 cursor-pointer border-b border-white/[0.06] transition-all ${isZipSelected ? 'bg-blue-500/[0.10] border-l-2 border-l-blue-500' : 'hover:bg-white/[0.05]'}`}
                      >
                        <div className="w-8 h-8 rounded-[8px] flex items-center justify-center text-base flex-shrink-0" style={{ background: 'rgba(63,185,80,0.08)' }}>
                          <PackageIcon size={16} color="#3fb950" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[0.82rem] font-semibold text-[#e6edf3]">Source Code
                            <span className="ml-1.5 text-[#6e7681] font-normal text-[0.7rem]">· ZIP</span>
                          </p>
                          <p className="text-[0.68rem] text-[#6e7681] truncate font-mono">{zipName}</p>
                        </div>
                        {isZipSelected
                          ? <span className="px-2.5 py-[3px] bg-blue-500/20 border border-blue-500/40 rounded-full text-[#58a6ff] text-[0.65rem] font-semibold">Selected</span>
                          : <span className="px-2.5 py-[3px] bg-white/[0.05] border border-white/10 rounded-full text-[#3fb950] text-[0.65rem]">↓ Get</span>
                        }
                      </div>
                      <div
                        onClick={() => { setActiveAsset({ name: tarName, browser_download_url: tarUrl, size: 0 }); setDropOpen(false); }}
                        className={`flex items-center gap-3 px-4 py-3 cursor-pointer last:border-0 transition-all ${isTarSelected ? 'bg-blue-500/[0.10] border-l-2 border-l-blue-500' : 'hover:bg-white/[0.05]'}`}
                      >
                        <div className="w-8 h-8 rounded-[8px] flex items-center justify-center text-base flex-shrink-0" style={{ background: 'rgba(63,185,80,0.08)' }}>
                          <ArchiveIcon size={16} color="#3fb950" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[0.82rem] font-semibold text-[#e6edf3]">Source Code
                            <span className="ml-1.5 text-[#6e7681] font-normal text-[0.7rem]">· TAR.GZ</span>
                          </p>
                          <p className="text-[0.68rem] text-[#6e7681] truncate font-mono">{tarName}</p>
                        </div>
                        {isTarSelected
                          ? <span className="px-2.5 py-[3px] bg-blue-500/20 border border-blue-500/40 rounded-full text-[#58a6ff] text-[0.65rem] font-semibold">Selected</span>
                          : <span className="px-2.5 py-[3px] bg-white/[0.05] border border-white/10 rounded-full text-[#3fb950] text-[0.65rem]">↓ Get</span>
                        }
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
          </div>



          {/* README SECTION */}
          {readme && (
            <div className="glass-static mb-8 animate-fadeInUp" style={{ borderRadius: 20, padding: '1.5rem', animationDelay: '0.4s' }}>
              <div className="flex items-center gap-2 mb-4">
                <span className="font-mono font-bold text-[#3fb950]" style={{ fontSize: '0.85rem', letterSpacing: '0.1em' }}>ABOUT</span>
                <div className="h-[1px] flex-1 bg-white/10" />
              </div>

              <div className="relative overflow-hidden transition-all duration-500" style={{ maxHeight: readmeExpanded ? 'none' : '200px' }}>
                <div className="prose prose-invert prose-sm max-w-none prose-p:text-[#e6edf3] prose-headings:text-white prose-a:text-[#58a6ff]">
                  {readmeLoading ? (
                    <div className="py-8 flex justify-center"><AppLoader className="w-5 h-5 text-white loader" /></div>
                  ) : (
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeRaw]}
                      urlTransform={(uri) =>
                        uri.startsWith('http') || uri.startsWith('mailto:') || uri.startsWith('#')
                          ? uri
                          : `https://raw.githubusercontent.com/${repoSlug}/HEAD/${uri}`
                      }
                    >
                      {readme}
                    </ReactMarkdown>
                  )}
                </div>

                {!readmeExpanded && (
                  <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[var(--bg-primary)] to-transparent pointer-events-none" />
                )}
              </div>

              <button
                onClick={() => { Native.vibrate(); setReadmeExpanded(!readmeExpanded); }}
                className="w-full mt-4 py-3 rounded-xl font-mono font-bold text-[0.75rem] transition-all active:scale-[0.98] border-none"
                style={{ background: 'rgba(63,185,80,0.1)', border: '1px solid rgba(63,185,80,0.2)', color: '#3fb950', cursor: 'pointer' }}
              >
                {readmeExpanded ? 'COLLAPSE DESCRIPTION' : 'READ FULL README'}
              </button>
            </div>
          )}

          {/* WHAT'S NEW SECTION */}
          <div className="glass-static mb-4 animate-fadeInUp" style={{ borderRadius: 14, padding: '1.25rem', animationDelay: '0.5s' }}>
            <div className="flex items-center gap-2 mb-4">
              <span className="font-mono font-bold text-[#58a6ff]" style={{ fontSize: '0.85rem', letterSpacing: '0.1em' }}>CHANGELOG</span>
              <div className="h-[1px] flex-1 bg-white/10" />
            </div>

            <div className="flex items-center gap-2 mb-4">
              {selectedRelease && (
                <span className="font-mono" style={{
                  fontSize: '0.78rem', padding: '4px 10px', borderRadius: 100,
                  background: 'rgba(88,166,255,0.1)', border: '1px solid rgba(88,166,255,0.2)', color: '#58a6ff',
                }}>{selectedRelease.tag_name}</span>
              )}
              <span style={{ fontSize: '0.7rem', color: '#6e7681', marginLeft: 'auto' }}>
                {selectedRelease ? timeAgo(selectedRelease.published_at) : ''}
              </span>
            </div>

            {changelog.length === 0 ? (
              <div className="py-4 text-center">
                <p className="text-[0.85rem] text-[#8b949e]">No detailed changelog provided.</p>
              </div>
            ) : showAllLogs ? (
              <div className="animate-fadeIn">
                <div className="prose prose-invert prose-sm max-w-none text-[#e6edf3] marker:text-[#e6edf3] prose-headings:text-white prose-a:text-[#58a6ff]">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                    {selectedRelease.body}
                  </ReactMarkdown>
                </div>
                <button onClick={() => setShowAllLogs(false)} className="w-full mt-4 py-2 text-[#58a6ff] font-bold text-[0.75rem] border-none bg-transparent cursor-pointer">Show Less ↑</button>
              </div>
            ) : (
              <div className="space-y-3">
                {visibleLogs.map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="font-mono px-2 py-0.5 rounded text-[0.62rem] font-bold mt-0.5 shrink-0" style={{
                      color: tagStyles[item.tag]?.color || '#8b949e',
                      background: tagStyles[item.tag]?.bg || 'rgba(255,255,255,0.05)',
                      border: `1px solid ${tagStyles[item.tag]?.border || 'rgba(255,255,255,0.1)'}`
                    }}>{item.tag.toUpperCase()}</span>
                    <span className="text-[0.82rem] text-[#8b949e] leading-relaxed">{item.text}</span>
                  </div>
                ))}
                {selectedRelease.body && (
                  <button onClick={() => setShowAllLogs(true)} className="w-full mt-4 py-3 rounded-xl border border-[#58a6ff]/20 bg-[#58a6ff]/10 text-[#58a6ff] font-bold text-[0.75rem] transition-all active:scale-[0.98] cursor-pointer">
                    READ FULL RELEASE NOTES
                  </button>
                )}
              </div>
            )}
          </div>

          <div style={{ height: 1, background: 'rgba(255,255,255,0.1)', margin: '1rem 0' }} />

          {/* TOPICS SECTION */}
          {repo.topics?.length > 0 && (
            <div className="glass-static mb-6" style={{ borderRadius: 14, padding: '1.25rem' }}>
              <span className="font-sora font-bold mb-4 block flex items-center gap-2" style={{ fontSize: '0.88rem' }}>
                <span>🏷️</span> Repository Topics
              </span>
              <div className="flex flex-wrap gap-2">
                {repo.topics.map((t) => (
                  <span key={t} style={{
                    fontSize: '0.8rem', fontWeight: 600, padding: '6px 14px', borderRadius: 12,
                    background: 'rgba(56,139,253,0.1)', border: '1px solid rgba(56,139,253,0.25)', color: '#58a6ff',
                    fontFamily: 'font-sora'
                  }} className="hover:bg-[#58a6ff]/20 transition-all cursor-default">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* REPORT ISSUE */}
          <a href={repo.html_url + '/issues/new'} target="_blank" rel="noopener noreferrer" className="glass-static flex items-center justify-between w-full mb-4" style={{
            borderRadius: 14, padding: '1rem 1.25rem', cursor: 'pointer', textDecoration: 'none', color: '#e6edf3', transition: 'all 0.2s',
          }}>
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center" style={{
                width: 32, height: 32, borderRadius: 8, background: 'rgba(247,129,102,0.1)', border: '1px solid rgba(247,129,102,0.25)', fontSize: '1rem',
              }}>🐛</div>
              <span className="font-sora font-medium" style={{ fontSize: '0.88rem' }}>Report Issue</span>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8b949e" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
          </a>

          {/* AUTHOR CARD */}
          <div className="glass-static mb-8 animate-fadeInUp" style={{ borderRadius: 20, padding: '1.25rem', animationDelay: '0.6s' }}>
            <div className="flex items-center gap-2 mb-4">
              <span className="font-mono font-bold text-[#8b949e]" style={{ fontSize: '0.8rem', letterSpacing: '0.1em' }}>DEVELOPER</span>
              <div className="h-[1px] flex-1 bg-white/10" />
            </div>

            <div
              onClick={() => onOpenUser?.(repo.owner.login)}
              className="flex items-center gap-4 cursor-pointer active:scale-95 transition-all"
            >
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-2 border-[#58a6ff] overflow-hidden">
                  <img src={repo.owner.avatar_url} alt={repo.owner.login} className="w-full h-full object-cover" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#121821] border border-white/10 flex items-center justify-center">
                  <GitHubIcon size={12} color="#58a6ff" />
                </div>
              </div>

              <div className="flex-1">
                <h4 className="font-sora font-bold text-white text-[1.05rem]">{repo.owner.login}</h4>
                <p className="text-[0.75rem] text-[#8b949e] mt-1 uppercase font-mono tracking-wider">{repo.owner.type}</p>
              </div>

              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6e7681" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>
            </div>
          </div>

          <div className="h-4" />
        </div>
      )}

      {/* RELEASE HISTORY SHEET */}
      <AnimatePresence>
        {showReleaseHistory && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[2000] bg-[#0f141d]/70 backdrop-blur-md"
              onClick={() => setShowReleaseHistory(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-[2001] bg-[#121821] border-t border-white/10 rounded-t-[32px] overflow-hidden flex flex-col max-h-[85vh]"
              style={{ paddingBottom: 'env(safe-area-inset-bottom, 24px)' }}
            >
              <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto my-6 shrink-0" />

              <div className="px-6 pb-4 shrink-0">
                <h3 className="font-sora font-bold text-xl text-[#e6edf3] flex items-center gap-2">
                  <span className="p-2 rounded-xl bg-[#58a6ff]/10 border border-[#58a6ff]/20">📅</span>
                  Release Timeline
                </h3>
                <p className="text-[11px] text-[#8b949e] font-bold uppercase tracking-widest mt-2">{releases.length} total releases</p>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-2">
                <div className="relative">
                  {/* Timeline vertical line */}
                  <div className="absolute left-[23px] top-6 bottom-6 w-[1.5px] bg-white/5" />

                  <div className="space-y-6">
                    {/* Repository Creation Event */}
                    <div className="relative flex items-center gap-4 group">
                      <div className="relative z-10 w-12 h-12 rounded-full bg-[#3fb950]/10 border border-[#3fb950]/20 flex items-center justify-center shrink-0">
                        ✨
                      </div>
                      <div className="flex-1">
                        <div className="text-[0.65rem] font-bold text-[#3fb950] uppercase tracking-widest mb-0.5">Project Inception</div>
                        <div className="font-sora font-black text-[#e6edf3] text-[0.85rem]">Repository Created</div>
                        <div className="text-[0.7rem] text-[#8b949e] mt-0.5">{fmtDate(repo.created_at)}</div>
                      </div>
                    </div>

                    {[...releases].reverse().map((rel, idx) => (
                      <div key={rel.id} className="relative flex items-center gap-4 group">
                        <div className="relative z-10 w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0 group-hover:border-[#58a6ff]/40 transition-colors">
                          <span className="text-[10px] font-black text-[#58a6ff]">{rel.tag_name}</span>
                        </div>
                        <div className="flex-1 bg-white/[0.03] p-4 rounded-2xl border border-white/5 transition-all group-hover:bg-white/[0.06] group-hover:border-white/10">
                          <div className="flex justify-between items-start mb-1">
                            <span className="font-sora font-bold text-[#e6edf3] text-[0.9rem] truncate">{rel.name || rel.tag_name}</span>
                            <span className="text-[10px] text-[#8b949e] opacity-60 font-medium ml-2 shrink-0">{fmtDate(rel.published_at)}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => { setSelected(rel); setShowReleaseHistory(false); Native.vibrate(); }}
                              className="text-[10px] font-black uppercase tracking-widest text-[#58a6ff] hover:text-white transition-colors"
                            >
                              Explore →
                            </button>
                            {rel.assets?.length > 0 && (
                              <span className="text-[9px] font-bold text-[#8b949e] bg-white/5 px-1.5 py-0.5 rounded-md">
                                {rel.assets.length} Assets
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-6 shrink-0">
                <button
                  onClick={() => setShowReleaseHistory(false)}
                  className="w-full py-4 rounded-2xl bg-white/5 hover:bg-white/10 text-[#8b949e] font-sora font-bold text-sm transition-all active:scale-[0.98]"
                >
                  Close History
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="h-20" />

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
    </motion.div>
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
    className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200 border-none bg-transparent cursor-pointer ${active ? '' : 'text-[#8b949e] hover:text-white'}`}
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
          className="fixed inset-0 z-[2000] bg-[#0f141d]/60 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.div
          initial={{ y: '100dvh' }}
          animate={{ y: 0 }}
          exit={{ y: '100dvh' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed bottom-0 left-0 right-0 z-[2001] bg-[#121821] border-t border-white/10 rounded-t-[32px] max-h-[70vh] flex flex-col overflow-hidden"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 24px)' }}
        >
          <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto my-4 shrink-0" />

          <div className="px-6 pb-4 flex items-center justify-between">
            <div>
              <h3 className="font-sora font-bold text-xl text-white">Repository Shelves</h3>
              <p className="text-[10px] text-[#8b949e] uppercase font-bold tracking-widest mt-1">Organize your projects</p>
            </div>
            <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-[#8b949e]">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-2 space-y-3">
            {Object.keys(shelves).length === 0 ? (
              <div className="py-12 text-center opacity-40">
                <FolderIcon size={40} color="#8b949e" />
                <p className="font-sora text-sm mt-4 text-white">You have no shelves yet</p>
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
                    className="w-full flex items-center justify-between p-4 rounded-2xl border transition-all active:scale-[0.98] border-none bg-transparent"
                    style={{
                      background: active ? 'rgba(88,166,255,0.08)' : 'rgba(255,255,255,0.03)',
                      border: active ? '1px solid #58a6ff' : '1px solid rgba(255,255,255,0.05)',
                      cursor: 'pointer'
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${active ? 'bg-[#58a6ff]/20' : 'bg-white/5'}`}>
                        {folder ? (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={active ? '#58a6ff' : '#8b949e'} strokeWidth="3"><path d="M12 2v8m0 0l-3-3m3 3l3-3M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0z" /></svg>
                        ) : (
                          <FolderIcon size={18} color={active ? '#58a6ff' : '#8b949e'} />
                        )}
                      </div>
                      <div className="text-left">
                        <p className={`font-sora font-bold text-sm ${active ? 'text-[#58a6ff]' : 'text-[#e6edf3]'}`}>{name}</p>
                        <p className="text-[10px] text-[#8b949e] font-bold">{slugs.length} items</p>
                      </div>
                    </div>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${active ? 'bg-[#58a6ff] border-[#58a6ff]' : 'border-white/10'}`}>
                      {active && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="4"><polyline points="20 6 9 17 4 12" /></svg>}
                    </div>
                  </button>
                );
              })
            )}

            <div className="pt-4 pb-8">
              <p className="text-[10px] font-bold text-[#8b949e] uppercase tracking-widest ml-1 mb-3">Create New Shelf</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Shelf Name..."
                  value={newShelfName}
                  onChange={e => setNewShelfName(e.target.value)}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[#58a6ff]/50"
                  onKeyDown={e => e.key === 'Enter' && onCreate()}
                />
                <button
                  onClick={onCreate}
                  disabled={!newShelfName.trim()}
                  className="px-6 py-3 bg-[#58a6ff] rounded-xl text-white font-bold text-sm disabled:opacity-50 transition-all active:scale-95 border-none"
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

export default RepoOpener;
