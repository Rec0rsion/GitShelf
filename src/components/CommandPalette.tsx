import React, { useState, useEffect } from 'react';
import { Command } from 'cmdk';
import { HomeIcon, ExplorerIcon, ProfileIcon, FolderIcon, BellIcon, GearIcon } from './Icons';

interface CommandPaletteProps {
  onTabChange: (tab: string) => void;
  onRepoClick: (slug: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
}

const CommandPalette: React.FC<CommandPaletteProps> = ({ onTabChange, onRepoClick, open, setOpen }) => {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(!open);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, setOpen]);

  if (!open) return null;

  const collections = JSON.parse(localStorage.getItem('gitspace_notifications') || '{}');
  const recentViews: any[] = JSON.parse(localStorage.getItem('gitspace_recent_views') || '[]');
  const collectedRepos = Object.entries(collections).map(([slug, v]: any) => ({ slug, ...v }));

  const navigate = (tab: string) => { onTabChange(tab); setOpen(false); };
  const openRepo = (slug: string) => { onRepoClick(slug); setOpen(false); };

  return (
    <div
      className="fixed inset-0 z-[999] flex items-start justify-center pt-[15vh]"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
      onClick={() => setOpen(false)}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '90%', maxWidth: 480,
          background: 'var(--bg-secondary)',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: 16,
          boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
          overflow: 'hidden',
        }}
      >
        <Command label="Command palette" className="font-sora">
          <div style={{ padding: '0.85rem 1rem', borderBottom: '1px solid var(--glass-hover-bg)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--text-dim))" strokeWidth="2.5"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
            <Command.Input
              placeholder="Type a command or search..."
              className="bg-transparent border-none outline-none font-sora text-[hsl(var(--text-primary))] w-full"
              style={{ fontSize: '0.9rem' }}
              autoFocus
            />
            <kbd className="text-[10px] text-[hsl(var(--text-dim))] font-mono px-1.5 py-0.5 rounded border border-[var(--glass-border)] bg-[var(--glass-bg)]">ESC</kbd>
          </div>

          <Command.List style={{ maxHeight: 320, overflowY: 'auto', padding: '0.5rem' }}>
            <Command.Empty style={{ padding: '2rem', textAlign: 'center', color: 'hsl(var(--text-dim))', fontSize: '0.82rem' }}>
              No results found.
            </Command.Empty>

            {/* Navigation */}
            <Command.Group heading={<span style={{ fontSize: '0.62rem', color: 'hsl(var(--text-dim))', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '0.3rem 0.5rem', fontWeight: 700 }}>Navigation</span>}>
              {[
                { id: 'home', label: 'Home', icon: <HomeIcon size={16} color="hsl(var(--text-primary))" /> },
                { id: 'apps', label: 'Apps', icon: <ExplorerIcon size={16} color="hsl(var(--text-primary))" /> },
                { id: 'collection', label: 'Saved', icon: <BellIcon size={16} color="hsl(var(--text-primary))" /> },
                { id: 'profile', label: 'Profile', icon: <ProfileIcon size={16} color="hsl(var(--text-primary))" /> },
                { id: 'settings', label: 'Settings', icon: <GearIcon size={16} color="hsl(var(--text-primary))" /> },
              ].map(item => (
                <Command.Item
                  key={item.id}
                  value={item.label}
                  onSelect={() => navigate(item.id)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors"
                  style={{ fontSize: '0.82rem', color: 'hsl(var(--text-primary))' }}
                >
                  {item.icon}
                  {item.label}
                </Command.Item>
              ))}
            </Command.Group>

            {/* Recent Views */}
            {recentViews.length > 0 && (
              <Command.Group heading={<span style={{ fontSize: '0.62rem', color: 'hsl(var(--text-dim))', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '0.3rem 0.5rem', fontWeight: 700 }}>Recently Viewed</span>}>
                {recentViews.slice(0, 5).map((r: any) => (
                  <Command.Item
                    key={r.slug}
                    value={`${r.slug} ${r.name}`}
                    onSelect={() => openRepo(r.slug)}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors"
                    style={{ fontSize: '0.82rem', color: 'hsl(var(--text-primary))' }}
                  >
                    <img src={r.avatar} alt="" style={{ width: 20, height: 20, borderRadius: 5, border: '1px solid var(--glass-border)' }} />
                    <span className="font-mono" style={{ fontSize: '0.78rem' }}>{r.slug}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* Collections */}
            {collectedRepos.length > 0 && (
              <Command.Group heading={<span style={{ fontSize: '0.62rem', color: 'hsl(var(--text-dim))', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '0.3rem 0.5rem', fontWeight: 700 }}>Collections</span>}>
                {collectedRepos.slice(0, 8).map((r: any) => (
                  <Command.Item
                    key={r.slug}
                    value={`${r.slug} ${r.name} ${r.folder}`}
                    onSelect={() => openRepo(r.slug)}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors"
                    style={{ fontSize: '0.82rem', color: 'hsl(var(--text-primary))' }}
                  >
                    <img src={r.avatar} alt="" style={{ width: 20, height: 20, borderRadius: 5, border: '1px solid var(--glass-border)' }} />
                    <span className="font-mono flex-1" style={{ fontSize: '0.78rem' }}>{r.slug}</span>
                    <span style={{ fontSize: '0.6rem', color: 'hsl(var(--text-dim))', padding: '1px 6px', borderRadius: 6, background: 'var(--glass-border)', border: '1px solid var(--glass-hover-bg)' }}>{r.folder || 'General'}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}
          </Command.List>
        </Command>
      </div>
    </div>
  );
};

export default CommandPalette;
