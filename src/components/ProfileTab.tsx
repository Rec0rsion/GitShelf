import React, { useState, useEffect } from 'react';
import { StarIcon, ForkIcon, FolderIcon, UsersIcon, CoffeeIcon, PackageIcon, BookmarkIcon } from './Icons';
import { Native } from '../utils/NativeBridge';
import RepoOpener from './RepoOpener';

interface GHUser {
  login: string;
  name: string;
  avatar_url: string;
  bio: string;
  public_repos: number;
  followers: number;
  following: number;
  html_url: string;
}

interface GHRepo {
  name: string;
  full_name: string;
  description: string;
  stargazers_count: number;
  forks_count: number;
  language: string;
  visibility: string;
}

interface ProfileTabProps {
  onDisconnect: () => void;
  onRepoClick: (slug: string) => void;
  onTabChange: (tab: 'home' | 'explorer' | 'collection' | 'profile') => void;
}

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

// ─── Starred Repos Sub-Component ───
const StarredRepos: React.FC<{ onRepoClick: (slug: string) => void }> = ({ onRepoClick }) => {
  const [starred, setStarred] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('gh_token');
    if (!token) { setLoading(false); return; }
    fetch('https://api.github.com/user/starred?per_page=20&sort=updated', {
      headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github.v3+json' }
    })
      .then(r => r.ok ? r.json() : [])
      .then(data => setStarred(data))
      .catch(() => { })
      .finally(() => setLoading(false));

    const handleUpdate = () => {
      // Just force a re-render to update the 'inCollection' status from localStorage
      setStarred(prev => [...prev]);
    };
    window.addEventListener('gitspace_notifications_updated', handleUpdate);
    return () => window.removeEventListener('gitspace_notifications_updated', handleUpdate);
  }, []);

  const addToCollection = (repo: any) => {
    const slug = repo.full_name;
    const data = JSON.parse(localStorage.getItem('gitspace_notifications') || '{}');
    if (data[slug]) return;
    data[slug] = { lastSeenId: 0, name: repo.name, owner: repo.owner.login, avatar: repo.owner.avatar_url, hasUpdate: false, isCollected: true, isWatching: false, updatedAt: new Date().toISOString(), folder: 'Starred' };
    localStorage.setItem('gitspace_notifications', JSON.stringify(data));
    Native.vibrate();
    window.dispatchEvent(new Event('gitspace_notifications_updated'));
  };

  if (loading) return <div className="animate-pulse mb-6"><div className="h-20 bg-[var(--glass-bg)] rounded-xl" /></div>;
  if (starred.length === 0) return null;

  const shown = expanded ? starred : starred.slice(0, 6);

  return (
    <div className="animate-fadeInUp-2 mb-6">
      <div className="flex items-center justify-between mb-2 px-1">
        <p className="flex items-center gap-1.5" style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#e3b341', fontWeight: 700 }}><StarIcon size={13} color="#e3b341" /> Your Starred Repos</p>
        <span style={{ fontSize: '0.62rem', color: 'hsl(var(--text-dim))' }}>{starred.length} repos</span>
      </div>
      <div className="flex flex-col gap-2">
        {shown.map((repo: any) => {
          const item = JSON.parse(localStorage.getItem('gitspace_notifications') || '{}')[repo.full_name];
          const inCollection = !!item && item.isCollected !== false;
          return (
            <button
              key={repo.full_name}
              onClick={() => onRepoClick(repo.full_name)}
              className="glass-static flex items-center gap-4 text-left transition-all hover:border-[#e3b341]/30 active:scale-[0.98]"
              style={{ borderRadius: 'var(--btn-radius)', padding: '0.9rem 1.1rem', border: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer', background: 'var(--glass-bg)' }}
            >
              <div style={{ width: 40, height: 40, borderRadius: 10, overflow: 'hidden', border: '1px solid var(--glass-border)', flexShrink: 0 }}>
                <img src={repo.owner.avatar_url} alt="" className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-sora font-bold text-[hsl(var(--text-primary))] truncate" style={{ fontSize: '0.95rem' }}>{repo.name}</div>
                <div className="flex items-center gap-1" style={{ fontSize: '0.72rem', color: 'hsl(var(--text-dim))', marginTop: 2 }}><StarIcon size={11} color="hsl(var(--text-dim))" /> {fmtNum(repo.stargazers_count)} · {repo.language || 'N/A'}</div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); addToCollection(repo); }}
                className="flex items-center justify-center rounded-xl hover:bg-[var(--glass-bg)] transition-all active:scale-90"
                style={{ background: 'none', border: 'none', cursor: 'pointer', width: 44, height: 44 }}
                title={inCollection ? 'In collection' : 'Add to collection'}
              >
                <span style={{ display: 'flex' }}>{inCollection ? <BookmarkIcon size={18} fill="var(--accent-primary)" color="var(--accent-primary)" /> : <BookmarkIcon size={18} />}</span>
              </button>
            </button>
          );
        })}
      </div>
      {starred.length > 6 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full mt-2 py-2 font-sora font-bold text-[#e3b341] hover:bg-[var(--glass-bg)] rounded-lg transition-colors text-xs"
          style={{ background: 'none', border: 'none', cursor: 'pointer' }}
        >
          {expanded ? 'Show less ↑' : `Show ${starred.length - 6} more ↓`}
        </button>
      )}
    </div>
  );
};



const ProfileTab: React.FC<ProfileTabProps> = ({ onDisconnect, onRepoClick, onTabChange }) => {
  const [user, setUser] = useState<GHUser | null>(null);
  const [repos, setRepos] = useState<GHRepo[]>([]);
  const [totalStars, setTotalStars] = useState(0);
  const [totalForks, setTotalForks] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      const token = localStorage.getItem('gh_token');
      if (!token) {
        setError('No GitHub token found. Please reconnect.');
        setLoading(false);
        return;
      }

      try {
        const headers = { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github.v3+json' };

        const uRes = await fetch('https://api.github.com/user', { headers });
        if (!uRes.ok) throw new Error('Failed to fetch profile. Is your token valid?');
        const uData = await uRes.json();
        setUser(uData);

        // Fetch ALL repos (paginated) to compute totals
        let allRepos: GHRepo[] = [];
        let page = 1;
        let hasMore = true;
        while (hasMore) {
          const rRes = await fetch(`https://api.github.com/user/repos?sort=updated&per_page=100&page=${page}`, { headers });
          if (!rRes.ok) break;
          const batch: GHRepo[] = await rRes.json();
          allRepos = [...allRepos, ...batch];
          hasMore = batch.length === 100;
          page++;
        }

        setRepos(allRepos);

        // Compute total stars & forks
        let stars = 0;
        let forks = 0;
        for (const r of allRepos) {
          stars += r.stargazers_count || 0;
          forks += r.forks_count || 0;
        }
        setTotalStars(stars);
        setTotalForks(forks);

      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();

    const handleUpdate = () => {
      // Just force a re-render to update the dashboard stats from localStorage
      setUser(prev => (prev ? { ...prev } : null));
    };
    window.addEventListener('gitspace_notifications_updated', handleUpdate);
    return () => window.removeEventListener('gitspace_notifications_updated', handleUpdate);
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 animate-pulse">
        <div className="w-16 h-16 rounded-full bg-[var(--glass-bg)] border border-[var(--glass-border)]" />
        <div className="w-32 h-4 bg-[var(--glass-bg)] rounded" />
        <div className="w-24 h-3 bg-[var(--glass-bg)] rounded" />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="glass-static text-center" style={{ borderRadius: 16, padding: '2rem' }}>
        <p style={{ color: '#f78166', marginBottom: '1rem' }}>❌ {error || 'Could not load profile'}</p>
        <button onClick={onDisconnect} className="font-sora font-semibold" style={{
          padding: '0.6rem 1.2rem', borderRadius: 8, background: 'var(--glass-border)', border: '1px solid var(--glass-border)', color: 'hsl(var(--text-muted))', cursor: 'pointer'
        }}>Return to Login</button>
      </div>
    );
  }

  const stats = [
    { icon: <StarIcon size={20} color="#e3b341" />, value: fmtNum(totalStars), label: 'Total Stars', color: '#e3b341' },
    { icon: <ForkIcon size={20} color="#3fb950" />, value: fmtNum(totalForks), label: 'Total Forks', color: '#3fb950' },
    { icon: <PackageIcon size={20} color="var(--accent-primary)" />, value: fmtNum(user.public_repos), label: 'Public Repos', color: 'var(--accent-primary)' },
    { icon: <UsersIcon size={20} color="#d2a8ff" />, value: fmtNum(user.followers), label: 'Followers', color: '#d2a8ff' },
  ];


  return (
    <div className="animate-fadeIn w-full space-y-4">
      {/* Hero */}
      <div className="glass-static text-center animate-fadeInUp" style={{ borderRadius: 24, padding: '2rem 1.5rem', marginBottom: '1.5rem' }}>
        <div className="mx-auto flex items-center justify-center p-1" style={{
          width: 100, height: 100, borderRadius: '50%',
          border: '3px solid rgba(88,166,255,0.45)', overflow: 'hidden', background: 'rgba(88,166,255,0.1)'
        }}>
          <img src={user.avatar_url} alt={user.login} className="w-full h-full rounded-full object-cover shadow-2xl" />
        </div>
        <h2 className="font-sora font-bold mt-4" style={{ fontSize: '1.6rem', letterSpacing: '-0.04em', color: 'hsl(var(--text-primary))' }}>{user.name || user.login}</h2>
        <p className="font-mono" style={{ fontSize: '0.95rem', color: 'var(--accent-primary)', marginBottom: '0.75rem', fontWeight: 600 }}>@{user.login}</p>
        {user.bio && <p className="font-sora" style={{ fontSize: '0.88rem', color: 'hsl(var(--text-muted))', lineHeight: 1.6, maxWidth: '90%', margin: '0.75rem auto' }}>{user.bio}</p>}

        <div className="flex justify-center mt-5">
          {[
            { val: user.public_repos, label: 'Repos' },
            { val: user.followers, label: 'Followers' },
            { val: user.following, label: 'Following' },
          ].map((s, i) => (
            <div key={i} className="flex flex-col items-center" style={{
              padding: '0.5rem 1.5rem',
              borderRight: i < 2 ? '1px solid var(--glass-border)' : 'none',
            }}>
              <span className="font-sora font-bold" style={{ color: 'hsl(var(--text-primary))', fontSize: '1.1rem' }}>{s.val}</span>
              <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-dim))' }}>{s.label}</span>
            </div>
          ))}
        </div>

        <div className="flex justify-center gap-4 mt-6">
          <a href={user.html_url} target="_blank" rel="noopener noreferrer" className="font-sora font-bold no-underline active:scale-95" style={{
            padding: '0.8rem 1.5rem', borderRadius: 14, fontSize: '0.9rem', cursor: 'pointer',
            background: 'rgba(88,166,255,0.15)', border: '1px solid rgba(88,166,255,0.3)', color: 'var(--accent-primary)'
          }}>
            GitHub Profile
          </a>
          <button onClick={() => onTabChange('settings' as any)} className="font-sora font-bold active:scale-95" style={{
            padding: '0.8rem 1.5rem', borderRadius: 14, fontSize: '0.9rem', cursor: 'pointer',
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'hsl(var(--text-primary))'
          }}>
            Settings
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-8 animate-fadeInUp-1">
        {stats.map((s, i) => (
          <div key={i} className="glass" style={{ borderRadius: 16, padding: '1rem', cursor: 'default' }}>
            <div style={{ marginBottom: 4 }}>{s.icon}</div>
            <div className="font-sora font-bold" style={{ fontSize: '1.5rem', letterSpacing: '-0.04em', color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>{s.label}</div>
          </div>
        ))}
      </div>


      {/* ═══ Weekly Digest ═══ */}
      <div className="animate-fadeInUp-2 mb-8">
        <p style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'hsl(var(--text-dim))', marginBottom: '0.85rem', fontWeight: 700 }}>Weekly Digest</p>
        <div className="glass-static" style={{ borderRadius: 16, padding: '1.25rem' }}>
          {(() => {
            const data = JSON.parse(localStorage.getItem('gitspace_notifications') || '{}');
            const updates = Object.values(data).filter((r: any) => r.hasUpdate && r.isWatching).slice(0, 3);
            if (updates.length === 0) {
              return (
                <div className="text-center py-2">
                  <div style={{ marginBottom: 4 }}><CoffeeIcon size={24} color="hsl(var(--text-muted))" /></div>
                  <p className="font-sora text-[hsl(var(--text-muted))] text-sm">All caught up! No recent releases.</p>
                </div>
              );
            }
            return (
              <div className="flex flex-col gap-3">
                {updates.map((u: any, i) => (
                  <div key={i} className="flex items-center gap-3 bg-[var(--glass-bg)] rounded-xl p-2.5">
                    <img src={u.avatar} alt="avatar" className="w-8 h-8 rounded-lg object-cover" />
                    <div className="flex-1 min-w-0">
                      <div className="font-sora font-semibold text-[hsl(var(--text-primary))] text-[0.85rem] truncate">{u.name}</div>
                      <div className="text-[0.65rem] text-[#f78166] font-bold uppercase tracking-wider">New Release</div>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      </div>




      {/* ═══ Starred Repos ═══ */}
      <StarredRepos onRepoClick={onRepoClick} />




    </div>
  );
};

export default ProfileTab;
