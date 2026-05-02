import { AppLoader } from './AppLoader';
import React, { useState, useEffect } from 'react';

interface FeedTabProps {
  onRepoClick: (slug: string) => void;
}

const FeedTab: React.FC<FeedTabProps> = ({ onRepoClick }) => {
  const [feed, setFeed] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchFeed = async () => {
      setLoading(true);
      setError('');
      try {
        const token = localStorage.getItem('gh_token');
        if (!token) throw new Error('Valid GitHub token required for customized feed.');

        const notifications = JSON.parse(localStorage.getItem('gitspace_notifications') || '{}');
        const repos = Object.keys(notifications);
        if (repos.length === 0) {
          setFeed([]);
          setLoading(false);
          return;
        }

        // GitHub search API allows limited repo: qualifiers. Let's slice the first 10.
        const queryRepos = repos.slice(0, 10).map(r => `repo:${r}`).join('+');
        const q = `is:open+is:pr+${queryRepos}`;
        
        const res = await fetch(`https://api.github.com/search/issues?q=${q}&sort=created&order=desc&per_page=15`, {
          headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github.v3+json' }
        });

        if (!res.ok) throw new Error('Failed to fetch pull requests.');
        const data = await res.json();
        setFeed(data.items || []);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    fetchFeed();
  }, []);

  const timeAgo = (d: string) => {
    const diff = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
  };

  return (
    <div className="animate-fadeInUp pt-4 px-2">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="font-sora font-bold" style={{ fontSize: '1.4rem', letterSpacing: '-0.03em' }}>PR Feed</h2>
          <p style={{ fontSize: '0.82rem', color: 'hsl(var(--text-muted))' }}>Latest pull requests from your tracked repos</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><AppLoader className="w-6 h-6 text-[hsl(var(--text-primary))] loader" /></div>
      ) : error ? (
        <div className="glass-static text-[#f78166] p-4 rounded-2xl text-sm">{error}</div>
      ) : feed.length === 0 ? (
        <div className="glass-static text-center p-8 rounded-2xl">
          <p className="text-[hsl(var(--text-muted))] text-sm">No recent pull requests found.</p>
          <p className="text-[10px] mt-2 text-[hsl(var(--text-dim))]">Track more active repositories to populate your feed.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {feed.map(item => {
            // repository_url is like https://api.github.com/repos/owner/repo
            const slug = item.repository_url.split('/repos/')[1];
            return (
              <a 
                key={item.id} 
                href={item.html_url}
                target="_blank"
                rel="noopener noreferrer"
                className="glass p-4 rounded-2xl no-underline block transition-all hover:border-[var(--accent-primary)]/30"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="font-sora font-bold text-[hsl(var(--text-primary))] text-[0.85rem] leading-snug">{item.title}</span>
                  <span className="text-[10px] text-[hsl(var(--text-muted))] whitespace-nowrap">{timeAgo(item.created_at)}</span>
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[10px] font-mono text-[#3fb950] bg-[#3fb950]/10 px-2 py-0.5 rounded border border-[#3fb950]/20">#{item.number}</span>
                  <span className="text-[10px] text-[var(--accent-primary)] hover:underline" onClick={(e) => { e.preventDefault(); onRepoClick(slug); }}>{slug}</span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <img src={item.user.avatar_url} style={{ width: 16, height: 16, borderRadius: '50%' }} alt="" />
                  <span className="text-[10px] text-[hsl(var(--text-muted))]">opened by <span className="font-bold text-[#c9d1d9]">{item.user.login}</span></span>
                </div>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default FeedTab;
