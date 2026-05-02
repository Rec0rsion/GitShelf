import React, { useState, useEffect } from 'react';
import { Native } from '../utils/NativeBridge';
import { motion } from 'framer-motion';
import { StarIcon, EyeIcon, EyeOffIcon, ForkIcon } from './Icons';

interface GHUser {
  login: string;
  id: number;
  avatar_url: string;
  name?: string;
  bio?: string;
  followers?: number;
  public_repos?: number;
}

interface GHRepo {
  id: number;
  full_name: string;
  name: string;
  description: string;
  stargazers_count: number;
  forks_count: number;
  language: string;
}

interface UserDetailsPageProps {
  username: string;
  onClose: () => void;
  onRepoClick: (slug: string) => void;
}

const fmtNum = (n: number) => {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'k';
  return String(n);
};

const UserDetailsPage: React.FC<UserDetailsPageProps> = ({ username, onClose, onRepoClick }) => {
  const [userDetails, setUserDetails] = useState<GHUser | null>(null);
  const [userRepos, setUserRepos] = useState<GHRepo[]>([]);
  const [loading, setLoading] = useState(true);
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

  const toggleWatchUser = () => {
    if (!userDetails) return;
    Native.vibrate();
    const current = JSON.parse(localStorage.getItem('gitspace_watched_users') || '{}');
    if (current[userDetails.login]) delete current[userDetails.login];
    else current[userDetails.login] = { avatar: userDetails.avatar_url, subscribedAt: new Date().toISOString() };
    localStorage.setItem('gitspace_watched_users', JSON.stringify(current));
    setWatchedUsers(current);
    window.dispatchEvent(new Event('gitspace_notifications_updated'));
  };

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('gh_token');
        const headers: Record<string, string> = { 'Accept': 'application/vnd.github.v3+json' };
        if (token) headers['Authorization'] = `token ${token}`;

        const uRes = await fetch(`https://api.github.com/users/${username}`, { headers });
        const data = await uRes.json();
        setUserDetails(data);

        const rRes = await fetch(`https://api.github.com/users/${username}/repos?sort=updated&per_page=30`, { headers });
        const repos = await rRes.json();
        setUserRepos(repos || []);
      } catch (e) {
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [username]);

  return (
    <div
      className="fixed inset-0 z-[200] overflow-y-auto no-scrollbar gpu-accelerated"
      style={{
        background: 'var(--bg-primary)',
        height: '100dvh',
        width: '100%',
        overscrollBehavior: 'none'
      }}
    >
      {/* Header Bar */}
      <div className="sticky top-0 z-[250] flex items-center transition-all duration-300"
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
              <span className="text-[9px] text-[var(--accent-primary)] font-black uppercase tracking-widest opacity-60 leading-none mb-0.5">Developer</span>
              <span className="text-[14px] font-bold text-white leading-none">{username}</span>
            </div>
          </div>

          {userDetails && (
            <button onClick={toggleWatchUser} className={`w-9 h-9 rounded-xl transition-all flex items-center justify-center border active:scale-90 cursor-pointer ${watchedUsers[userDetails.login] ? 'bg-[#f78166]/10 border-[#f78166]/30 text-[#f78166]' : 'bg-white/5 border-white/10 text-[var(--accent-primary)]'}`}>
              {watchedUsers[userDetails.login] ? <EyeOffIcon size={18} color="currentColor" /> : <EyeIcon size={18} color="currentColor" />}
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="px-4 pt-6 pb-24 max-w-2xl mx-auto space-y-6">
          <style>{`
            @keyframes shimmer {
              0% { background-position: -400px 0; }
              100% { background-position: 400px 0; }
            }
            .skeleton {
              background: linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.10) 50%, rgba(255,255,255,0.04) 75%);
              background-size: 800px 100%;
              animation: shimmer 1.6s infinite linear;
              border-radius: 12px;
            }
          `}</style>

          {/* Profile card skeleton */}
          <div className="border border-[var(--glass-border)] rounded-[28px] p-6 space-y-5" style={{ background: 'var(--glass-bg)' }}>
            <div className="flex gap-5 items-center">
              {/* Avatar */}
              <div className="skeleton w-20 h-20 rounded-[22px] shrink-0" />
              <div className="flex-1 space-y-3">
                <div className="skeleton h-5 w-36 rounded-lg" />
                <div className="skeleton h-4 w-24 rounded-lg" />
              </div>
            </div>
            {/* Bio lines */}
            <div className="space-y-2">
              <div className="skeleton h-3 w-full rounded-lg" />
              <div className="skeleton h-3 w-4/5 rounded-lg" />
            </div>
            {/* Stats */}
            <div className="flex gap-8 pt-4 border-t border-[var(--glass-border)]">
              <div className="space-y-1.5">
                <div className="skeleton h-5 w-10 rounded-lg" />
                <div className="skeleton h-3 w-12 rounded-lg" />
              </div>
              <div className="space-y-1.5">
                <div className="skeleton h-5 w-10 rounded-lg" />
                <div className="skeleton h-3 w-16 rounded-lg" />
              </div>
            </div>
          </div>

          {/* Section label */}
          <div className="skeleton h-3 w-24 rounded-lg ml-2" />

          {/* Repo card skeletons */}
          {[1, 2, 3].map(i => (
            <div key={i} className="border border-[var(--glass-border)] rounded-[22px] p-5 space-y-3" style={{ background: 'var(--glass-bg)' }}>
              <div className="skeleton h-5 w-40 rounded-lg" />
              <div className="space-y-2">
                <div className="skeleton h-3 w-full rounded-lg" />
                <div className="skeleton h-3 w-3/5 rounded-lg" />
              </div>
              <div className="flex gap-5 pt-1">
                <div className="skeleton h-3 w-10 rounded-lg" />
                <div className="skeleton h-3 w-10 rounded-lg" />
                <div className="skeleton h-3 w-16 rounded-lg ml-auto" />
              </div>
            </div>
          ))}
        </div>
      ) : userDetails ? (
        <div className="pb-24 pt-6 max-w-2xl mx-auto space-y-6">
          {/* Profile Info Card */}
          <div className="bg-gradient-to-br from-white/[0.08] to-transparent border border-[var(--glass-border)] rounded-[28px] p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--accent-primary)]/10 rounded-full blur-[80px] pointer-events-none" />
            <div className="flex gap-5 relative z-10">
              <img src={userDetails.avatar_url} className="w-20 h-20 rounded-[22px] border-2 border-[var(--accent-primary)]/30 shadow-lg object-cover" alt="" />
              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <h2 className="font-sora font-black text-[hsl(var(--text-primary))] text-[1.4rem] leading-tight text-shadow-sm">{userDetails.name || userDetails.login}</h2>
                <p className="text-[var(--accent-primary)] font-bold font-mono text-[0.9rem] mt-1">@{userDetails.login}</p>
              </div>
            </div>
            {userDetails.bio && <p className="text-[0.95rem] text-[hsl(var(--text-muted))] font-medium leading-relaxed mt-5">{userDetails.bio}</p>}

            <div className="flex gap-8 border-t border-[var(--glass-border)] pt-5 mt-5 relative z-10">
              <div><p className="font-black text-[hsl(var(--text-primary))] text-[1.2rem]">{fmtNum(userDetails.public_repos || 0)}</p><p className="text-[0.65rem] font-black text-[hsl(var(--text-dim))] uppercase tracking-widest">Repos</p></div>
              <div><p className="font-black text-[hsl(var(--text-primary))] text-[1.2rem]">{fmtNum(userDetails.followers || 0)}</p><p className="text-[0.65rem] font-black text-[hsl(var(--text-dim))] uppercase tracking-widest">Followers</p></div>
            </div>
          </div>

          {/* Repositories */}
          <div className="pt-2">
            <p className="text-[0.7rem] font-black text-[hsl(var(--text-dim))] uppercase tracking-[0.2em] mb-4 ml-2">Repositories</p>
            <div className="space-y-4">
              {userRepos.map(r => (
                <div key={r.id} onClick={() => onRepoClick(r.full_name)} className="bg-white/[0.02] border border-[var(--glass-border)] p-5 rounded-[22px] hover:bg-white/[0.05] transition-all cursor-pointer active:scale-[0.98]">
                  <h4 className="font-sora font-extrabold text-[var(--accent-primary)] text-[1.1rem] truncate">{r.name}</h4>
                  {r.description && <p className="text-[0.85rem] text-[hsl(var(--text-muted))] mt-2 line-clamp-2 leading-relaxed">{r.description}</p>}
                  <div className="flex gap-5 mt-4 text-[0.75rem] font-bold text-[hsl(var(--text-muted))]">
                    <span className="flex items-center gap-1.5"><StarIcon size={14} color="#e3b341" /><span className="text-[hsl(var(--text-primary))]">{fmtNum(r.stargazers_count)}</span></span>
                    <span className="flex items-center gap-1.5"><ForkIcon size={14} color="hsl(var(--text-muted))" /><span className="text-[hsl(var(--text-primary))]">{fmtNum(r.forks_count)}</span></span>
                    {r.language && <span className="ml-auto text-[hsl(var(--text-dim))] bg-[var(--glass-bg)] px-2 py-0.5 rounded-md">{r.language}</span>}
                  </div>
                </div>
              ))}
              {userRepos.length === 0 && (
                <div className="text-center py-10 opacity-50">
                  <p className="font-sora font-semibold text-sm text-[hsl(var(--text-muted))]">No public repositories</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-32 opacity-50">
          <p className="font-sora font-semibold text-sm text-[hsl(var(--text-muted))]">User not found</p>
        </div>
      )}
    </div>
  );
};

export default UserDetailsPage;
