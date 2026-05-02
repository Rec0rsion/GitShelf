import { AppLoader } from './AppLoader';
import React, { useState, useEffect } from 'react';

interface CalendarTabProps {
  onRepoClick: (slug: string) => void;
}

const CalendarTab: React.FC<CalendarTabProps> = ({ onRepoClick }) => {
  const [releases, setReleases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReleases = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('gh_token');
        const headers: Record<string, string> = { 'Accept': 'application/vnd.github.v3+json' };
        if (token) headers['Authorization'] = `token ${token}`;

        const notifications = JSON.parse(localStorage.getItem('gitspace_notifications') || '{}');
        const repos = Object.keys(notifications).slice(0, 10); // Rate limit protection
        
        let allReleases: any[] = [];
        
        await Promise.all(
          repos.map(async (slug) => {
             const res = await fetch(`https://api.github.com/repos/${slug}/releases?per_page=3`, { headers }).catch(() => null);
             if (res && res.ok) {
                const data = await res.json();
                data.forEach((r: any) => allReleases.push({...r, repoSlug: slug}));
             }
          })
        );

        allReleases.sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());
        setReleases(allReleases);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchReleases();
  }, []);

  const groupByDate = (rels: any[]) => {
    const groups: Record<string, any[]> = {};
    rels.forEach(r => {
      const date = new Date(r.published_at).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
      if (!groups[date]) groups[date] = [];
      groups[date].push(r);
    });
    return groups;
  };

  const grouped = groupByDate(releases);

  return (
    <div className="animate-fadeInUp pt-4 px-2 pb-24">
      <div className="mb-6">
        <h2 className="font-sora font-bold" style={{ fontSize: '1.4rem', letterSpacing: '-0.03em' }}>Release Calendar</h2>
        <p style={{ fontSize: '0.82rem', color: 'hsl(var(--text-muted))' }}>Recent drops from your collections</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><AppLoader className="w-6 h-6 text-[hsl(var(--text-primary))] loader" /></div>
      ) : releases.length === 0 ? (
        <div className="glass-static text-center p-8 rounded-2xl">
          <p className="text-[hsl(var(--text-muted))] text-sm">No recent releases found.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {Object.entries(grouped).map(([date, dateReleases]) => (
            <div key={date}>
              <div className="sticky top-0 z-10 py-2 backdrop-blur-md mb-2">
                <h3 className="font-sora font-bold text-[hsl(var(--text-primary))] text-sm flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[var(--accent-primary)]" /> {date}
                </h3>
              </div>
              <div className="flex flex-col gap-3 pl-4 border-l-2 border-[var(--accent-primary)]/20">
                {dateReleases.map(release => (
                  <div key={release.id} className="glass p-3 rounded-xl cursor-pointer hover:border-[var(--accent-primary)]/40 transition-all" onClick={() => onRepoClick(release.repoSlug)}>
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-sora font-semibold text-[var(--accent-primary)] text-xs">{release.repoSlug}</span>
                      <span className="text-[10px] bg-[#3fb950]/10 text-[#3fb950] px-1.5 py-0.5 rounded border border-[#3fb950]/30 font-mono">{release.tag_name}</span>
                    </div>
                    <div className="text-[11px] text-[hsl(var(--text-muted))] truncate">{release.name || "No release title"}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CalendarTab;
