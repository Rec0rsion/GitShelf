import React, { useState, useEffect } from 'react';
import { Native } from '../utils/NativeBridge';
import { BellOffIcon, BellIcon, FolderIcon, SparklesIcon, ClockIcon, PackageIcon, UsersIcon, TrashIcon } from './Icons';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { AppLoader } from './AppLoader';

interface NotificationsPageProps {
  onTabChange: (tab: any) => void;
  onRepoClick: (slug: string) => void;
  onUserClick?: (username: string) => void;
}

type FilterMode = 'all' | 'repo' | 'apps' | 'users';

const NotificationsPage: React.FC<NotificationsPageProps> = ({ onRepoClick, onUserClick }) => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [allWatchedUsers, setAllWatchedUsers] = useState<any[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterMode>('all');
  const [lastChecked, setLastChecked] = useState<string | null>(null);
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);

  const loadNotifications = () => {
    const data = JSON.parse(localStorage.getItem('gitspace_notifications') || '{}');
    const list = Object.entries(data)
      .map(([slug, val]: any) => ({
        slug,
        ...val
      }))
      .filter((n: any) => n.isWatching === true)
      .sort((a, b) => {
        // Unread first, then by date
        if (a.hasUpdate && a.isWatching && !(b.hasUpdate && b.isWatching)) return -1;
        if (b.hasUpdate && b.isWatching && !(a.hasUpdate && a.isWatching)) return 1;
        // Then watching repos first
        if (a.isWatching && !b.isWatching) return -1;
        if (b.isWatching && !a.isWatching) return 1;
        return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime();
      });
    setNotifications(list);

    // Load ALL watched users (not just those with updates)
    const userData = JSON.parse(localStorage.getItem('gitspace_watched_users') || '{}');
    const userList = Object.entries(userData).map(([username, val]: any) => ({
      username,
      ...val
    })).sort((a, b) => (b.hasUpdate ? 1 : 0) - (a.hasUpdate ? 1 : 0));
    setAllWatchedUsers(userList);

    // Load last checked time
    const lc = localStorage.getItem('gitspace_last_check_time');
    setLastChecked(lc);
  };

  useEffect(() => {
    loadNotifications();
    const handleUpdate = () => {
      loadNotifications();
      setIsRefreshing(false);
    };
    window.addEventListener('gitspace_notifications_updated', handleUpdate);
    return () => window.removeEventListener('gitspace_notifications_updated', handleUpdate);
  }, []);



  const clearNotification = (slug: string) => {
    const data = JSON.parse(localStorage.getItem('gitspace_notifications') || '{}');
    if (data[slug]) {
      data[slug].hasUpdate = false;
      localStorage.setItem('gitspace_notifications', JSON.stringify(data));
      loadNotifications();
      window.dispatchEvent(new Event('gitspace_notifications_updated'));
    }
  };

  const markAllRead = () => {
    const data = JSON.parse(localStorage.getItem('gitspace_notifications') || '{}');
    let changed = false;
    Object.keys(data).forEach(slug => {
      if (data[slug].hasUpdate) {
        data[slug].hasUpdate = false;
        changed = true;
      }
    });
    if (changed) {
      localStorage.setItem('gitspace_notifications', JSON.stringify(data));
      loadNotifications();
      window.dispatchEvent(new Event('gitspace_notifications_updated'));
    }
    // Also clear user notifications
    const userData = JSON.parse(localStorage.getItem('gitspace_watched_users') || '{}');
    let userChanged = false;
    Object.keys(userData).forEach(u => {
      if (userData[u].hasUpdate) { userData[u].hasUpdate = false; userChanged = true; }
    });
    if (userChanged) {
      localStorage.setItem('gitspace_watched_users', JSON.stringify(userData));
      loadNotifications();
      window.dispatchEvent(new Event('gitspace_notifications_updated'));
    }
  };

  const clearUserNotification = (username: string) => {
    const data = JSON.parse(localStorage.getItem('gitspace_watched_users') || '{}');
    if (data[username]) {
      data[username].hasUpdate = false;
      localStorage.setItem('gitspace_watched_users', JSON.stringify(data));
      loadNotifications();
      window.dispatchEvent(new Event('gitspace_notifications_updated'));
    }
  };

  const removeSubscription = (slug: string) => {
    const data = JSON.parse(localStorage.getItem('gitspace_notifications') || '{}');
    if (data[slug]) {
      data[slug].isWatching = false;
      if (data[slug].isCollected === false) {
        delete data[slug];
      }
    }
    localStorage.setItem('gitspace_notifications', JSON.stringify(data));
    loadNotifications();
    window.dispatchEvent(new Event('gitspace_notifications_updated'));
  };

  const unwatchUser = (username: string) => {
    const data = JSON.parse(localStorage.getItem('gitspace_watched_users') || '{}');
    delete data[username];
    localStorage.setItem('gitspace_watched_users', JSON.stringify(data));
    loadNotifications();
    window.dispatchEvent(new Event('gitspace_notifications_updated'));
  };
  const toggleSelect = (id: string) => {
    setSelectedItems(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = (items: any[]) => {
    if (selectedItems.size === items.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(items.map(i => i.slug || i.username)));
    }
  };

  const bulkDelete = () => {
    if (selectedItems.size === 0) return;
    setShowBulkConfirm(true);
  };

  const confirmBulkDelete = () => {
    const notifData = JSON.parse(localStorage.getItem('gitspace_notifications') || '{}');
    const userData = JSON.parse(localStorage.getItem('gitspace_watched_users') || '{}');
    let notifChanged = false;
    let userChanged = false;

    selectedItems.forEach(id => {
      if (notifData[id]) {
        notifData[id].isWatching = false;
        if (notifData[id].isCollected === false) delete notifData[id];
        notifChanged = true;
      }
      if (userData[id]) {
        delete userData[id];
        userChanged = true;
      }
    });

    if (notifChanged) localStorage.setItem('gitspace_notifications', JSON.stringify(notifData));
    if (userChanged) localStorage.setItem('gitspace_watched_users', JSON.stringify(userData));

    setSelectedItems(new Set());
    setBulkMode(false);
    setShowBulkConfirm(false);
    loadNotifications();
    window.dispatchEvent(new Event('gitspace_notifications_updated'));
    toast.success('Successfully removed selected subscriptions');
  };

  const timeAgo = (d: string) => {
    if (!d) return '';
    const diff = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  // Stats
  const repoCount = notifications.filter(n => !n.isApp).length;
  const unreadCount = notifications.filter(n => n.hasUpdate && n.isWatching).length;
  const userUpdatesCount = allWatchedUsers.filter(u => u.hasUpdate).length;
  const totalAlerts = unreadCount + userUpdatesCount;

  // Filtered lists
  const getCombinedItems = () => {
    const base: any[] = [];
    if (filter === 'all') {
      base.push(...notifications);
      base.push(...allWatchedUsers.map(u => ({ ...u, isUser: true })));
    }
    if (filter === 'repo') {
      base.push(...notifications.filter(n => !n.isApp));
    }
    if (filter === 'apps') {
      base.push(...notifications.filter(n => n.isApp));
    }
    if (filter === 'users') {
      base.push(...allWatchedUsers.map(u => ({ ...u, isUser: true })));
    }
    return base;
  };

  const combinedItems = getCombinedItems();

  const groupByCategory = (items: any[]) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const groups: { [key: string]: any[] } = { Today: [], Yesterday: [], Earlier: [] };

    items.forEach(n => {
      const timestamp = n.isUser
        ? (n.lastChecked || 0)
        : (n.latestPublishedAt || n.updatedAt || 0);

      const d = new Date(timestamp);
      d.setHours(0, 0, 0, 0);

      if (d.getTime() === today.getTime()) groups.Today.push(n);
      else if (d.getTime() === yesterday.getTime()) groups.Yesterday.push(n);
      else groups.Earlier.push(n);
    });

    // Sort within groups by timestamp descending
    Object.keys(groups).forEach(key => {
      groups[key].sort((a, b) => {
        const timeA = new Date(a.isUser ? (a.lastChecked || 0) : (a.latestPublishedAt || a.updatedAt || 0)).getTime();
        const timeB = new Date(b.isUser ? (b.lastChecked || 0) : (b.latestPublishedAt || b.updatedAt || 0)).getTime();
        return timeB - timeA;
      });
    });

    return groups;
  };

  return (
    <div className="animate-fadeIn w-full flex-1 flex flex-col min-h-full space-y-4 pb-20">
      {/* Bulk Delete Confirmation Dialog */}
      <AnimatePresence>
        {showBulkConfirm && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center px-6"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-[320px] bg-[#1a1f26] border border-red-500/30 rounded-[28px] p-8 flex flex-col items-center text-center shadow-2xl shadow-red-500/10"
            >
              <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-4xl mb-6 alert-shimmer">🗑️</div>
              <h2 className="font-sora font-extrabold text-[1.4rem] text-[hsl(var(--text-primary))] mb-3">
                Bulk Cleanup
              </h2>
              <p className="text-[0.9rem] text-[hsl(var(--text-muted))] mb-8 leading-relaxed font-medium">
                Are you sure you want to remove <span className="text-red-400 font-bold">{selectedItems.size} selected items</span> from your notifications?
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
      </AnimatePresence>

      {/* ═══ Header ═══ */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-sora font-bold" style={{ fontSize: '1.4rem', letterSpacing: '-0.03em' }}>Notifications</h2>
          <p style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }} className="flex items-center gap-1.5 mt-0.5">
            <ClockIcon size={10} color="hsl(var(--text-dim))" />
            {localStorage.getItem('gitspace_notif_enabled') === 'false' 
              ? <span className="text-red-400/80 font-bold">Monitoring: Disabled</span>
              : (lastChecked ? `Checked ${timeAgo(lastChecked)}` : 'Auto-checks every 5 min')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {totalAlerts > 0 && !bulkMode && (
            <button
              onClick={markAllRead}
              className="font-sora font-bold text-[10px] uppercase tracking-wider transition-all active:scale-95 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] px-3 py-2 rounded-xl border border-[var(--accent-primary)]/20 hover:bg-[var(--accent-primary)]/20"
              style={{ cursor: 'pointer' }}
            >
              Clear Updates
            </button>
          )}
          <button
            onClick={() => { setBulkMode(!bulkMode); setSelectedItems(new Set()); }}
            className="flex items-center justify-center p-2.5 rounded-xl transition-all active:scale-90"
            style={{
              background: bulkMode ? 'rgba(235, 77, 75, 0.15)' : 'var(--glass-border)',
              border: `1px solid ${bulkMode ? 'rgba(235, 77, 75, 0.3)' : 'var(--glass-border)'}`,
              color: bulkMode ? '#eb4d4b' : 'hsl(var(--text-muted))',
            }}
          >
            {bulkMode ? <span className="text-[10px] font-bold uppercase px-1">Done</span> : <TrashIcon size={18} />}
          </button>
        </div>
      </div>

      {/* ═══ Stats ═══ */}
      <div className="grid grid-cols-3 gap-2 mb-5">
        {[
          { id: 'updates', icon: <BellIcon size={16} color={unreadCount > 0 ? '#f78166' : 'hsl(var(--text-dim))'} />, val: unreadCount, label: 'Updates', color: unreadCount > 0 ? '#f78166' : 'hsl(var(--text-dim))', action: () => setFilter('all') },
          { id: 'all', icon: <PackageIcon size={16} color="var(--accent-primary)" />, val: notifications.length + allWatchedUsers.length, label: 'Watching', color: 'var(--accent-primary)', action: () => setFilter('all') },
          { id: 'users', icon: <UsersIcon size={16} color="#d2a8ff" />, val: allWatchedUsers.length, label: 'Users', color: '#d2a8ff', action: () => setFilter('users') },
        ].map((s, i) => (
          <div 
            key={i} 
            onClick={() => { Native.vibrate(); s.action(); }}
            className={`glass-static text-center transition-all active:scale-95 cursor-pointer ${filter === s.id ? 'ring-2 ring-[var(--accent-primary)]/50' : ''}`} 
            style={{ borderRadius: 14, padding: '0.85rem 0.5rem' }}
          >
            <div style={{ marginBottom: 2, display: 'flex', justifyContent: 'center' }}>{s.icon}</div>
            <div className="font-sora font-bold" style={{ fontSize: '1.3rem', color: s.color, letterSpacing: '-0.03em' }}>{s.val}</div>
            <div style={{ fontSize: '0.6rem', color: 'hsl(var(--text-dim))', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ═══ Bulk Actions Bar ═══ */}
      {bulkMode && (
        <div className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.03] border border-[var(--glass-border)] animate-fadeIn">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                toggleSelectAll(combinedItems);
              }}
              className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent-primary)] bg-[var(--accent-primary)]/10 px-3 py-1.5 rounded-lg border border-[var(--accent-primary)]/20 active:scale-95 transition-all cursor-pointer"
            >
              {selectedItems.size === combinedItems.length ? 'Deselect All' : 'Select All'}
            </button>
            <span className="text-[10px] text-[hsl(var(--text-muted))] font-bold">{selectedItems.size} selected</span>
          </div>
          <button
            onClick={bulkDelete}
            disabled={selectedItems.size === 0}
            className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all active:scale-95 cursor-pointer 
              ${selectedItems.size > 0 ? 'bg-red-500/20 border border-red-500/40 text-red-400' : 'bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[#484f58] opacity-50'}`}
          >
            Delete
          </button>
        </div>
      )}

      {/* ═══ Filter Tabs (Unified Bar) ═══ */}
      <div className="glass-static flex items-center justify-between rounded-[20px] border border-[var(--glass-border)] px-1 py-1 mb-6 overflow-hidden select-none bg-white/[0.02]">
        {([
          { id: 'all' as FilterMode, label: 'All', count: notifications.length + allWatchedUsers.length },
          { id: 'repo' as FilterMode, label: 'Repo', count: repoCount },
          { id: 'apps' as FilterMode, label: 'Apps', count: notifications.filter(n => n.isApp).length },
          { id: 'users' as FilterMode, label: 'Users', count: allWatchedUsers.length },
        ]).map(tab => (
          <button
            key={tab.id}
            onClick={() => { Native.vibrate(); setFilter(tab.id); }}
            className={`flex-1 py-2.5 rounded-2xl text-[0.7rem] font-bold transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer
              ${filter === tab.id ? 'bg-[var(--accent-primary)] text-[hsl(var(--text-primary))] shadow-lg' : 'text-[hsl(var(--text-muted))]'}
            `}
            style={{ border: 'none' }}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${filter === tab.id ? 'bg-white/20 text-[hsl(var(--text-primary))]' : 'bg-[var(--glass-bg)] text-[hsl(var(--text-dim))]'}`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ═══ Refreshing Banner ═══ */}
      {isRefreshing && (
        <div className="flex items-center gap-3 mb-4 p-3 rounded-xl bg-[var(--accent-primary)]/5 border border-[var(--accent-primary)]/15 animate-fadeIn">
          <AppLoader className="w-4 h-4 text-[hsl(var(--text-primary))] loader" />
          <span className="text-[11px] text-[var(--accent-primary)] font-sora font-bold">Checking GitHub for updates...</span>
        </div>
      )}

      {/* ═══ Timeline Feed ═══ */}
      <div className="space-y-8">
        {['Today', 'Yesterday', 'Earlier'].map(groupKey => {
          const groups = groupByCategory(combinedItems);
          const items = groups[groupKey] || [];

          if (items.length === 0) return null;

          return (
            <div key={groupKey} className="space-y-4">
              <div className="flex items-center gap-3 px-1">
                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-[#484f58] shrink-0">{groupKey}</span>
                <div className="h-[1px] w-full bg-gradient-to-r from-white/5 to-transparent" />
              </div>

              <div className="grid gap-4">
                {items.map((n: any) => {
                  const isUser = n.isUser;
                  const id = isUser ? n.username : n.slug;
                  const isSelected = selectedItems.has(id);
                  const hasUpdate = n.hasUpdate && (isUser || n.isWatching);

                  return (
                    <motion.div
                      layout
                      key={id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`relative group flex flex-col p-5 rounded-[24px] border transition-all ${isSelected
                        ? 'bg-[var(--accent-primary)]/10 border-[var(--accent-primary)]/30 ring-1 ring-[var(--accent-primary)]/20'
                        : hasUpdate
                          ? 'bg-gradient-to-br from-[#3fb950]/5 to-transparent border-[#3fb950]/20'
                          : 'bg-white/[0.02] border-white/[0.05] hover:border-[var(--glass-border)] hover:bg-white/[0.04]'
                        }`}
                      style={{ cursor: 'pointer' }}
                      onClick={() => {
                        if (bulkMode) {
                          toggleSelect(id);
                        } else {
                          if (isUser) onUserClick && onUserClick(n.username);
                          else {
                            onRepoClick(n.slug);
                            if (n.hasUpdate) clearNotification(n.slug);
                          }
                        }
                      }}
                    >
                      {/* Selection Overlay */}
                      {bulkMode && (
                        <div className="absolute top-4 left-4 z-10">
                          <div className={`w-5 h-5 rounded-md flex items-center justify-center border-2 transition-all ${isSelected ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)]' : 'border-[var(--glass-border)] bg-[#121821]/20'}`}>
                            {isSelected && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
                          </div>
                        </div>
                      )}

                      <div className="flex gap-4">
                        <div className="relative shrink-0">
                          <img
                            src={isUser ? n.avatar : n.avatar}
                            className={`w-12 h-12 object-cover border border-[var(--glass-border)] shadow-xl ${isUser ? 'rounded-full' : 'rounded-2xl'}`}
                            alt=""
                          />
                          {hasUpdate && (
                            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-[#3fb950] rounded-full border-2 border-[var(--bg-primary)] ring-4 ring-[#3fb950]/10 animate-pulse" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 mb-0.5">
                                {isUser && <UsersIcon size={12} color="#d2a8ff" />}
                                {n.isApp && <PackageIcon size={12} color="var(--accent-primary)" />}
                                <h3 className="font-sora font-extrabold text-[hsl(var(--text-primary))] text-[0.98rem] truncate leading-tight">
                                  {isUser ? `@${n.username}` : n.name}
                                </h3>
                              </div>
                              <p className="text-[0.7rem] text-[hsl(var(--text-muted))] font-medium tracking-tight">
                                {isUser ? 'Watched Developer' : `@${n.owner}`}
                                <span className="mx-1.5 opacity-30">·</span>
                                {timeAgo(isUser ? n.lastChecked : (n.latestPublishedAt || n.updatedAt))}
                              </p>
                            </div>

                            {!bulkMode && (
                              <div className="flex items-center gap-1">
                                {hasUpdate && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      isUser ? clearUserNotification(n.username) : clearNotification(n.slug);
                                    }}
                                    className="p-1 px-2.5 rounded-lg text-[10px] font-black uppercase text-[#3fb950] border border-[#3fb950]/20 bg-[#3fb950]/5 active:scale-95 transition-all"
                                  >
                                    Read
                                  </button>
                                )}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    isUser ? unwatchUser(n.username) : removeSubscription(n.slug);
                                  }}
                                  className="p-2 rounded-xl text-[#484f58] hover:text-red-400 hover:bg-red-400/10 active:scale-95 transition-all"
                                >
                                  <TrashIcon size={16} />
                                </button>
                              </div>
                            )}
                          </div>

                          {hasUpdate && (
                            <div className="mt-3.5 p-3.5 rounded-2xl bg-[#3fb950]/5 border border-[#3fb950]/15 relative overflow-hidden">
                              <div className="flex items-center gap-2.5 mb-2">
                                <SparklesIcon size={14} color="#3fb950" />
                                <span className="text-[0.8rem] font-black text-[hsl(var(--text-primary))]">
                                  {isUser ? `New Project: ${n.lastRepoName}` : (n.latestTagName || 'New Release Available')}
                                </span>
                              </div>
                              {!isUser && n.latestBody && (
                                <p className="text-[0.78rem] text-[hsl(var(--text-muted))] line-clamp-2 leading-relaxed opacity-80 pl-6 border-l border-[#3fb950]/20 ml-2">
                                  {n.latestBody.replace(/[#*`_\[\]]/g, '')}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {notifications.length === 0 && allWatchedUsers.length === 0 && (
          <div className="text-center py-24 opacity-50">
            <div className="w-20 h-20 bg-[var(--glass-bg)] rounded-full flex items-center justify-center mx-auto mb-6">
              <BellOffIcon size={40} color="hsl(var(--text-dim))" />
            </div>
            <h3 className="font-sora font-bold text-[hsl(var(--text-primary))]">Inbox Zero</h3>
            <p className="text-xs text-[hsl(var(--text-dim))] mt-2">Subscribe to repos or watch users to see updates here.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
