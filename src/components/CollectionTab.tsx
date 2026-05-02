import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Native } from '../utils/NativeBridge';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { FolderIcon, PackageIcon, BellIcon, SearchIcon, ClockIcon, StarIcon, TrashIcon } from './Icons';

interface CollectionTabProps {
  onRepoClick: (slug: string) => void;
  onAppClick?: (slug: string) => void;
  onUserClick?: (username: string) => void;
  sortMode: 'recent' | 'alpha' | 'updates';
  onOpenSort: () => void;
}

type FilterMode = 'Repo' | 'Apps' | 'Users' | 'Shelves';

const CollectionTab: React.FC<CollectionTabProps> = ({ onRepoClick, onAppClick, onUserClick, sortMode, onOpenSort }) => {
  const [search, setSearch] = useState('');
  const [selectedRepos, setSelectedRepos] = useState<Set<string>>(new Set());
  const [bulkMode, setBulkMode] = useState(false);
  const [deleteData, setDeleteData] = useState<{ type: 'repo' | 'user' | 'app', target: string } | null>(null);
  const [filterMode, setFilterMode] = useState<FilterMode>('Repo');
  const [showUpdatesOnly, setShowUpdatesOnly] = useState(false);
  const [trackedReposArr, setTrackedReposArr] = useState<any[]>([]);
  const [trackedAppsArr, setTrackedAppsArr] = useState<any[]>([]);
  const [trackedUsersArr, setTrackedUsersArr] = useState<any[]>([]);
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);
  const [shelves, setShelves] = useState<Record<string, { slugs: string[], folder?: { path: string, uri: string } }>>({});
  const [selectedShelf, setSelectedShelf] = useState<string | null>(null);
  const [showCreateShelf, setShowCreateShelf] = useState(false);
  const [newShelfName, setNewShelfName] = useState('');
  const [newShelfFolder, setNewShelfFolder] = useState<{ path: string, uri: string } | null>(null);

  const reload = () => {
    const data = JSON.parse(localStorage.getItem('gitspace_notifications') || '{}');
    const tRepos: any[] = [];
    const tApps: any[] = [];

    Object.entries(data).forEach(([slug, repo]: [string, any]) => {
      if (repo.isCollected === false) return;
      if (repo.isApp) {
        tApps.push({ ...repo, slug });
        return;
      }
      tRepos.push({ ...repo, slug, tags: repo.tags || [] });
    });

    setTrackedReposArr(tRepos);
    setTrackedAppsArr(tApps);

    const usersData = JSON.parse(localStorage.getItem('gitspace_watched_users') || '{}');
    setTrackedUsersArr(Object.entries(usersData).map(([login, v]: any) => ({ ...v, slug: login, name: login })));

    const shelfData = JSON.parse(localStorage.getItem('gitspace_shelves') || '{}');
    setShelves(shelfData);
  };

  useEffect(() => {
    reload();
    const handleUpdate = () => reload();
    window.addEventListener('gitspace_notifications_updated', handleUpdate);
    return () => window.removeEventListener('gitspace_notifications_updated', handleUpdate);
  }, []);

  const totalItems = trackedReposArr.length + trackedAppsArr.length + trackedUsersArr.length;
  const totalUpdates = [...trackedReposArr, ...trackedAppsArr].filter(r => r.hasUpdate).length;

  const deleteItem = (slug: string, type: 'repo' | 'user' | 'app') => {
    Native.vibrate();
    setDeleteData({ type, target: slug });
  };

  const confirmDeleteAction = () => {
    if (!deleteData) return;
    if (deleteData.type === 'repo' || deleteData.type === 'app') {
      const data = JSON.parse(localStorage.getItem('gitspace_notifications') || '{}');
      const key = deleteData.target;
      if (data[key]) {
        data[key].isCollected = false;
        if (!data[key].isWatching) delete data[key];
      }
      localStorage.setItem('gitspace_notifications', JSON.stringify(data));
      toast.info(`Removed ${deleteData.target} from collection`);
    } else {
      const data = JSON.parse(localStorage.getItem('gitspace_watched_users') || '{}');
      delete data[deleteData.target];
      localStorage.setItem('gitspace_watched_users', JSON.stringify(data));
      toast.info(`Removed developer @${deleteData.target}`);
    }
    setDeleteData(null);
    reload();
    window.dispatchEvent(new Event('gitspace_notifications_updated'));
  };

  const sortRepos = (repos: any[]) => {
    const sorted = [...repos];
    if (sortMode === 'alpha') sorted.sort((a, b) => (a.name || a.slug).localeCompare(b.name || b.slug));
    else if (sortMode === 'updates') sorted.sort((a, b) => (b.hasUpdate ? 1 : 0) - (a.hasUpdate ? 1 : 0));
    else sorted.sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
    return sorted;
  };

  const toggleSelect = (slug: string) => {
    setSelectedRepos(prev => {
      const next = new Set(prev);
      next.has(slug) ? next.delete(slug) : next.add(slug);
      return next;
    });
  };

  const toggleSelectAll = (items: any[]) => {
    if (selectedRepos.size === items.length) {
      setSelectedRepos(new Set());
    } else {
      setSelectedRepos(new Set(items.map(i => i.slug)));
    }
  };

  const bulkDelete = () => {
    if (selectedRepos.size === 0) return;
    setShowBulkConfirm(true);
  };

  const confirmBulkDelete = () => {
    const notifData = JSON.parse(localStorage.getItem('gitspace_notifications') || '{}');
    const userData = JSON.parse(localStorage.getItem('gitspace_watched_users') || '{}');
    let notifChanged = false;
    let userChanged = false;

    selectedRepos.forEach(slug => {
      // Check in notifications (repos/apps)
      if (notifData[slug]) {
        notifData[slug].isCollected = false;
        if (!notifData[slug].isWatching) delete notifData[slug];
        notifChanged = true;
      }
      // Check in watched users
      if (userData[slug]) {
        delete userData[slug];
        userChanged = true;
      }
    });

    if (notifChanged) localStorage.setItem('gitspace_notifications', JSON.stringify(notifData));
    if (userChanged) localStorage.setItem('gitspace_watched_users', JSON.stringify(userData));

    setSelectedRepos(new Set());
    setBulkMode(false);
    setShowBulkConfirm(false);
    reload();
    window.dispatchEvent(new Event('gitspace_notifications_updated'));
    toast.success('Selected items removed');
  };

  const handlePickFolder = async () => {
    const folder = await Native.pickFolder();
    if (folder) {
      setNewShelfFolder(folder);
      toast.success('Folder access granted!');
    }
  };

  const createShelf = () => {
    if (!newShelfName.trim()) return;
    const next = { 
      ...shelves, 
      [newShelfName.trim()]: { 
        slugs: [], 
        folder: newShelfFolder || undefined 
      } 
    };
    setShelves(next);
    localStorage.setItem('gitspace_shelves', JSON.stringify(next));
    setNewShelfName('');
    setNewShelfFolder(null);
    setShowCreateShelf(false);
    toast.success(`Shelf "${newShelfName}" created!`);
  };

  const deleteShelf = (name: string) => {
    const next = { ...shelves };
    delete next[name];
    setShelves(next);
    localStorage.setItem('gitspace_shelves', JSON.stringify(next));
    if (selectedShelf === name) setSelectedShelf(null);
    toast.info(`Shelf "${name}" deleted`);
  };

  const addToShelf = (shelfName: string, slug: string) => {
    const shelf = shelves[shelfName];
    // Backward compatibility for old shelf format (string[])
    const shelfItems = Array.isArray(shelf) ? shelf : (shelf?.slugs || []);
    
    if (shelfItems.includes(slug)) {
      toast.error('Repository already in this shelf');
      return;
    }

    const next = { ...shelves };
    if (Array.isArray(shelf)) {
      next[shelfName] = [...shelf, slug] as any;
    } else {
      next[shelfName] = { ...shelf, slugs: [...shelfItems, slug] };
    }

    setShelves(next);
    localStorage.setItem('gitspace_shelves', JSON.stringify(next));
    toast.success(`Added to ${shelfName}`);

    // Ensure it shows up in main saved view
    const notifs = JSON.parse(localStorage.getItem('gitspace_notifications') || '{}');
    if (notifs[slug]) {
        notifs[slug].isCollected = true;
        localStorage.setItem('gitspace_notifications', JSON.stringify(notifs));
        window.dispatchEvent(new Event('gitspace_notifications_updated'));
    }
  };

  const timeAgo = (d: string) => {
    const diff = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <div className="animate-fadeIn relative w-full flex-1 min-h-full flex flex-col space-y-4">
      {/* Delete Confirmation Dialog */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {deleteData && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center px-6"
              style={{ background: 'rgba(0,0,0,0.5)' }}>
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
                className="w-full max-w-[320px] bg-[#161b22] border border-orange-500/30 rounded-[24px] p-6 flex flex-col items-center text-center shadow-2xl shadow-orange-500/10"
              >
                <div className="w-16 h-16 rounded-full bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-3xl mb-4">🗑️</div>
                <h2 className="font-bold text-[1.2rem] text-[hsl(var(--text-primary))] mb-2 font-sora">
                  Remove Item?
                </h2>
                <p className="text-[0.88rem] text-[hsl(var(--text-muted))] mb-6 leading-relaxed px-2">
                  Are you sure you want to remove
                  <span className="text-orange-400 font-bold block mt-1 truncate max-w-full px-2">
                    @{deleteData.target}
                  </span>
                  from your collection?
                </p>
                <div className="flex gap-3 w-full">
                  <button onClick={() => setDeleteData(null)}
                    className="flex-1 py-3.5 bg-white/[0.05] border border-[var(--glass-border)] rounded-[14px] text-[hsl(var(--text-muted))] font-bold text-[0.85rem] cursor-pointer transition-all active:scale-95">
                    Cancel
                  </button>
                  <button onClick={confirmDeleteAction}
                    className="flex-1 py-3.5 bg-orange-500/20 border border-orange-500/40 rounded-[14px] text-orange-400 font-bold text-[0.85rem] cursor-pointer transition-all active:scale-95">
                    Remove
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Bulk Delete Confirmation Dialog */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {showBulkConfirm && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center px-6"
              style={{ background: 'rgba(0,0,0,0.5)' }}>
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
                className="w-full max-w-[320px] bg-[#1a1f26] border border-red-500/30 rounded-[28px] p-8 flex flex-col items-center text-center shadow-2xl shadow-red-500/10"
              >
                <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-4xl mb-6 alert-shimmer">🗑️</div>
                <h2 className="font-sora font-extrabold text-[1.4rem] text-[hsl(var(--text-primary))] mb-3">
                  Bulk Removal
                </h2>
                <p className="text-[0.9rem] text-[hsl(var(--text-muted))] mb-8 leading-relaxed font-medium">
                  Are you sure you want to remove <span className="text-red-400 font-bold">{selectedRepos.size} selected items</span> from your collection?
                </p>
                <div className="flex flex-col gap-3 w-full">
                  <button onClick={confirmBulkDelete}
                    className="w-full py-4 bg-red-500/20 border border-red-500/40 rounded-[16px] text-red-400 font-bold text-[0.9rem] cursor-pointer transition-all active:scale-95">
                    Confirm Delete
                  </button>
                  <button onClick={() => setShowBulkConfirm(false)}
                    className="w-full py-4 bg-white/[0.05] border border-[var(--glass-border)] rounded-[16px] text-[hsl(var(--text-muted))] font-bold text-[0.9rem] cursor-pointer transition-all active:scale-95">
                    Cancel
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Stats Header */}
      <div className="grid grid-cols-2 gap-2 mb-5 animate-fadeInUp-2">
        {[
          {
            icon: <PackageIcon size={16} color="var(--accent-primary)" />,
            val: totalItems,
            label: 'Library',
            color: 'var(--accent-primary)',
            action: () => {
              setFilterMode('Repo');
              setShowUpdatesOnly(false);
            }
          },
          {
            icon: <BellIcon size={16} color={totalUpdates > 0 ? '#f78166' : 'hsl(var(--text-dim))'} />,
            val: totalUpdates,
            label: 'Updates',
            color: totalUpdates > 0 ? '#f78166' : 'hsl(var(--text-dim))',
            action: () => {
              setFilterMode('Repo');
              setShowUpdatesOnly(true);
            }
          },
        ].map((s, i) => (
          <button
            key={i}
            onClick={() => { Native.vibrate(); s.action(); }}
            className="glass-static text-center transition-all active:scale-95 border-none cursor-pointer hover:bg-white/[0.05]"
            style={{ borderRadius: 14, padding: '1rem 0.5rem' }}
          >
            <div style={{ marginBottom: 4 }}>{s.icon}</div>
            <div className="font-sora font-bold" style={{ fontSize: '1.4rem', color: s.color, letterSpacing: '-0.03em' }}>{s.val}</div>
            <div style={{ fontSize: '0.65rem', color: 'hsl(var(--text-dim))', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>{s.label}</div>
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-4 animate-fadeInUp-1">
        <div className="glass-static flex-1 flex items-center gap-2" style={{ borderRadius: 12, padding: '0.65rem 1rem' }}>
          <SearchIcon size={14} color="hsl(var(--text-muted))" />
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent border-none outline-none w-full text-[hsl(var(--text-primary))] font-sora"
            style={{ fontSize: '0.82rem' }}
          />
        </div>

        <button
          onClick={() => { onOpenSort(); Native.vibrate(); }}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.05] border border-[var(--glass-border)] text-[hsl(var(--text-muted))] active:scale-95 transition-all cursor-pointer"
          style={{ fontSize: '0.72rem', height: 40 }}
        >
          <span className="font-sora font-medium capitalize">{sortMode === 'updates' ? 'Updates First' : sortMode}</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="6 9 12 15 18 9" /></svg>
        </button>

        <button
          onClick={() => { setBulkMode(!bulkMode); setSelectedRepos(new Set()); }}
          className="transition-all"
          style={{
            padding: '0.5rem 0.7rem', borderRadius: 10, cursor: 'pointer', fontSize: '0.7rem', fontWeight: 700,
            background: bulkMode ? 'rgba(88,166,255,0.15)' : 'var(--glass-border)',
            border: `1px solid ${bulkMode ? 'rgba(88,166,255,0.3)' : 'var(--glass-border)'}`,
            color: bulkMode ? 'var(--accent-primary)' : 'hsl(var(--text-muted))',
          }}
        >
          ☑
        </button>
      </div>

      {bulkMode && (
        <div className="flex items-center justify-between mb-4 px-1 animate-fadeInUp-1 bg-white/[0.03] p-3 rounded-2xl border border-[var(--glass-border)]">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                let items: any[] = [];
                if (filterMode === 'Repo') items = trackedReposArr;
                else if (filterMode === 'Apps') items = trackedAppsArr;
                else if (filterMode === 'Users') items = trackedUsersArr;
                toggleSelectAll(items);
              }}
              className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent-primary)] bg-[var(--accent-primary)]/10 px-3 py-1.5 rounded-lg border border-[var(--accent-primary)]/20 active:scale-95 transition-all cursor-pointer"
            >
              {selectedRepos.size === (
                (filterMode === 'Repo' ? trackedReposArr.length :
                  filterMode === 'Apps' ? trackedAppsArr.length : trackedUsersArr.length)
              ) ? 'Deselect All' : 'Select All'}
            </button>
            <span className="text-[10px] text-[hsl(var(--text-muted))] font-bold">{selectedRepos.size} selected</span>
          </div>

          <button
            onClick={bulkDelete}
            disabled={selectedRepos.size === 0}
            className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all active:scale-95 cursor-pointer 
              ${selectedRepos.size > 0 ? 'bg-red-500/20 border border-red-500/40 text-red-400' : 'bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[#484f58] opacity-50'}`}
          >
            Delete
          </button>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="glass-static flex items-center justify-between rounded-[20px] border border-[var(--glass-border)] px-1 py-1 mb-6 overflow-hidden select-none bg-white/[0.02] animate-fadeInUp-2">
        {([
          { id: 'Repo', label: 'Repo', count: trackedReposArr.length },
          { id: 'Apps', label: 'Apps', count: trackedAppsArr.length },
          { id: 'Users', label: 'Users', count: trackedUsersArr.length },
          { id: 'Shelves', label: 'Shelves', count: Object.keys(shelves).length },
        ] as { id: FilterMode; label: string; count: number }[]).map(f => (
          <button
            key={f.id}
            onClick={() => { Native.vibrate(); setFilterMode(f.id as any); setSelectedRepos(new Set()); setShowUpdatesOnly(false); setSelectedShelf(null); }}
            className={`flex-1 py-1.5 rounded-2xl text-[0.7rem] font-bold transition-all flex items-center justify-center gap-1 active:scale-95 cursor-pointer
              ${filterMode === f.id ? 'bg-[var(--accent-primary)] text-[hsl(var(--text-primary))] shadow-lg' : 'text-[hsl(var(--text-muted))]'}
            `}
            style={{ border: 'none' }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filterMode === 'Shelves' && !selectedShelf && (
        <div className="space-y-4 animate-fadeIn">
          <button
            onClick={() => setShowCreateShelf(true)}
            className="w-full py-4 rounded-2xl border border-dashed border-[var(--glass-border)] text-[hsl(var(--text-muted))] font-sora font-bold text-sm hover:border-[var(--accent-primary)]/40 hover:text-[var(--accent-primary)] transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            + Create New Shelf
          </button>
          
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(shelves).map(([name, data]) => {
              const slugs = Array.isArray(data) ? data : data.slugs;
              const folder = Array.isArray(data) ? null : data.folder;
              return (
                <div
                  key={name}
                  onClick={() => setSelectedShelf(name)}
                  className="glass-static p-4 rounded-2xl border border-[var(--glass-border)] relative group active:scale-95 transition-all cursor-pointer overflow-hidden"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-2xl">📁</div>
                    {folder && (
                      <div className="bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] p-1 rounded-md" title="Has Folder Access">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 2v8m0 0l-3-3m3 3l3-3M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0z"/></svg>
                      </div>
                    )}
                  </div>
                  <div className="font-sora font-bold text-[hsl(var(--text-primary))] text-sm truncate">{name}</div>
                  <div className="text-[10px] text-[hsl(var(--text-dim))] uppercase tracking-widest font-bold mt-1">{slugs.length} Repos</div>
                  {folder && <div className="text-[9px] text-[var(--accent-primary)] font-bold mt-1 truncate opacity-70">SAF: {folder.path.split('/').pop()}</div>}
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteShelf(name); }}
                    className="absolute top-2 right-2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 bg-red-500/10 text-red-400 transition-all"
                  >
                    <TrashIcon size={12} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Shelf Repository View */}
      {filterMode === 'Shelves' && selectedShelf && (
        <div className="space-y-4 animate-fadeIn">
          <div className="flex items-center gap-3 mb-2">
            <button onClick={() => setSelectedShelf(null)} className="p-2 rounded-xl bg-[var(--glass-bg)] text-[hsl(var(--text-muted))] active:scale-95 transition-all">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <div className="flex-1">
              <h3 className="font-sora font-extrabold text-[hsl(var(--text-primary))] text-lg leading-tight">{selectedShelf}</h3>
              <p className="text-[10px] text-[hsl(var(--text-dim))] uppercase tracking-widest font-bold">
                {Array.isArray(shelves[selectedShelf]) ? shelves[selectedShelf].length : (shelves[selectedShelf]?.slugs?.length || 0)} Repositories
              </p>
              {!Array.isArray(shelves[selectedShelf]) && shelves[selectedShelf]?.folder && (
                <p className="text-[9px] text-[var(--accent-primary)] font-bold mt-1 opacity-70">Folder: {shelves[selectedShelf].folder?.path}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Shelf Modal */}
      <AnimatePresence>
        {showCreateShelf && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center px-6 bg-[#0f141d]/80 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-xs glass-static p-6 rounded-[28px] border border-[var(--glass-border)]">
              <div className="flex flex-col gap-2 mb-4">
                <button 
                  onClick={handlePickFolder}
                  className={`w-full py-3 rounded-xl border border-dashed transition-all flex items-center justify-center gap-2 font-bold text-xs
                    ${newShelfFolder ? 'bg-[var(--accent-primary)]/10 border-[var(--accent-primary)] text-[var(--accent-primary)]' : 'bg-white/5 border-white/10 text-[hsl(var(--text-muted))]'}
                  `}
                >
                  📁 {newShelfFolder ? newShelfFolder.path.split('/').pop() : 'Pick Local Folder Access'}
                </button>
                <input
                  autoFocus
                  type="text"
                  placeholder="Shelf Name..."
                  value={newShelfName}
                  onChange={e => setNewShelfName(e.target.value)}
                  className="w-full bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl p-3 text-[hsl(var(--text-primary))] outline-none focus:border-[var(--accent-primary)]/50 text-sm"
                />
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setShowCreateShelf(false); setNewShelfFolder(null); }} className="flex-1 py-3 bg-[var(--glass-bg)] rounded-xl text-[hsl(var(--text-muted))] font-bold text-sm">Cancel</button>
                <button onClick={createShelf} className="flex-1 py-3 bg-[var(--accent-primary)] rounded-xl text-[hsl(var(--text-primary))] font-bold text-sm">Create</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex flex-col gap-2">
        {(() => {
          let savedItems: any[] = [];
          if (filterMode === 'Repo') {
            savedItems = trackedReposArr.map(r => ({ ...r, type: 'repo' }));
          } else if (filterMode === 'Apps') {
            savedItems = trackedAppsArr.map(a => ({ ...a, type: 'app' }));
          } else if (filterMode === 'Users') {
            savedItems = trackedUsersArr.map(u => ({ ...u, type: 'user' }));
          } else if (filterMode === 'Shelves' && selectedShelf) {
            const shelf = shelves[selectedShelf];
            const shelfSlugs = Array.isArray(shelf) ? shelf : (shelf?.slugs || []);
            savedItems = trackedReposArr
              .filter(r => shelfSlugs.includes(r.slug))
              .map(r => ({ ...r, type: 'repo' }));
          } else if (filterMode === 'Shelves') {
            return null; // Handled above
          }

          if (showUpdatesOnly) {
            savedItems = savedItems.filter(item => item.hasUpdate);
          }

          if (search) {
            const q = search.toLowerCase();
            savedItems = savedItems.filter(r => (r.name || r.login || r.slug || '').toLowerCase().includes(q));
          }

          if (filterMode !== 'Users') {
            savedItems = sortRepos(savedItems);
          }

          if (savedItems.length === 0) {
            return (
              <div className="flex flex-col items-center justify-center py-20 opacity-40">
                <div style={{ marginBottom: '1rem' }}><FolderIcon size={40} color="hsl(var(--text-muted))" /></div>
                <p className="font-sora font-medium text-sm">No {filterMode} items yet</p>
                <p className="text-[11px] text-[hsl(var(--text-dim))] mt-1">Items you collect will appear here</p>
              </div>
            );
          }

          return (
            <div className="space-y-2">
              {savedItems.map((item, idx) => {
                const isSelected = selectedRepos.has(item.slug);
                return (
                  <div key={`${item.slug}-${idx}`} className="relative mb-2 w-full max-w-full" style={{ borderRadius: 14 }}>
                    {!bulkMode && (
                      <div className="absolute inset-y-0 right-0 w-[120px] bg-red-500/20 flex flex-col items-end justify-center pr-6" style={{ borderRadius: 14 }}>
                        <TrashIcon size={20} color="#f87171" />
                        <span className="text-[10px] font-bold text-red-400 mt-1 uppercase tracking-wider">Delete</span>
                      </div>
                    )}
                    <motion.div
                      drag={bulkMode ? false : "x"}
                      dragConstraints={{ left: -100, right: 0 }}
                      dragElastic={0.2}
                      onDragEnd={(e, info) => {
                        if (info.offset.x < -60) {
                          deleteItem(item.slug, item.type as any);
                        }
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        Native.vibrate();
                        if (bulkMode) {
                          toggleSelect(item.slug);
                          return;
                        }
                        if (item.type === 'repo') onRepoClick(item.slug);
                        else if (item.type === 'app' && onAppClick) onAppClick(item.slug);
                        else if (item.type === 'user' && onUserClick) onUserClick(item.slug);
                      }}
                      className="flex flex-row items-center gap-3 p-3 text-left w-full relative z-10"
                      style={{
                        borderRadius: 14,
                        border: `1px solid ${isSelected ? 'rgba(88,166,255,0.4)' : 'var(--glass-hover-bg)'}`,
                        background: isSelected ? 'rgba(88,166,255,0.08)' : 'var(--bg-primary)',
                        cursor: 'pointer',
                        transition: 'background 0.15s ease, border-color 0.15s ease'
                      }}
                    >
                      {bulkMode && (
                        <div style={{
                          width: 20, height: 20, borderRadius: 6, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          border: `1.5px solid ${isSelected ? 'var(--accent-primary)' : 'rgba(255,255,255,0.2)'}`,
                          background: isSelected ? 'var(--accent-primary)' : 'transparent',
                          transition: 'all 0.2s'
                        }}>
                          {isSelected && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
                        </div>
                      )}

                      <div className={`flex-shrink-0 w-10 h-10 overflow-hidden border border-[var(--glass-border)] ${item.type === 'user' ? 'rounded-full' : 'rounded-[10px]'}`}>
                        <img src={item.avatar || item.avatar_url} alt="" className="w-full h-full object-cover" />
                      </div>

                      <div className="flex-1 min-w-0 pr-10">
                        <h4 className="font-sora font-bold text-[hsl(var(--text-primary))] truncate text-[0.85rem]">{item.name || item.slug}</h4>
                        <p className="truncate text-[hsl(var(--text-dim))] text-[0.72rem] mt-0.5">
                          @{item.owner?.login || item.owner || item.slug.split('/')[0]} · {item.type.toUpperCase()}{item.type !== 'user' && item.updatedAt ? ` · ${timeAgo(item.updatedAt)}` : ''}
                        </p>
                      </div>

                      {!bulkMode && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteItem(item.slug, item.type as any);
                          }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center hover:bg-red-500/15 rounded-lg transition-all active:scale-90 group"
                          style={{ width: 34, height: 34, background: 'none', border: 'none', cursor: 'pointer', zIndex: 10 }}
                        >
                          <TrashIcon size={16} color="hsl(var(--text-muted))" />
                        </button>
                      )}
                    </motion.div>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>
    </div>
  );
};

export default CollectionTab;
