import React, { useState, useEffect, useRef } from 'react';
import { repoCache } from '../utils/repoCache';
import GetStartedPage from '@/components/GetStartedPage';
import TopBar from '@/components/TopBar';
import BottomNav from '@/components/BottomNav';
import HomeTab from '@/components/HomeTab';
import ProfileTab from '../components/ProfileTab';
import NotificationsPage from '../components/NotificationsPage';
import SettingsPage from '../components/SettingsPage';
import RepoOpener from '../components/RepoOpener';
import AppsTab from '@/components/AppsTab';
import AppDetailPage from '@/components/AppDetailPage';
import RecentlyViewedPage from '@/components/RecentlyViewedPage';
import CommandPalette from '@/components/CommandPalette';
import UserDetailsPage from '@/components/UserDetailsPage';
import IssuesPRTab from '@/components/IssuesPRTab';
import CollectionTab from '@/components/CollectionTab';
import DownloadsTab from '@/components/DownloadsTab';

import TrendingTab from '@/components/TrendingTab';
import ActivityFeed from '@/components/ActivityFeed';
import GitHubWrapped from '@/components/GitHubWrapped';
import DownloadResultPopup from '@/components/DownloadResultPopup';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { StatusBar } from '@capacitor/status-bar';
import { useDownloadManager } from '../hooks/useDownloadManager';
import { Native } from '../utils/NativeBridge';
import { initImmersiveMode } from '../utils/ImmersiveMode';
import { motion, AnimatePresence } from 'framer-motion';
import { SortIcon } from '@/components/Icons';
import { toast } from 'sonner';

type Page = 'getstarted' | 'home';
type Tab = 'home' | 'collection' | 'apps' | 'downloads' | 'profile' | 'notifications' | 'settings' | 'trending' | 'issues' | 'shorts';

const Index: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>(
    (localStorage.getItem('gh_token') && localStorage.getItem('git_sync_visited')) ? 'home' : 'getstarted'
  );
  const [activeTab, setActiveTab] = useState<Tab>(() => repoCache.get<Tab>('active_tab') ?? 'home');
  const lastMainTabRef = useRef<Tab>(
    (() => {
      const tab = repoCache.get<Tab>('active_tab') ?? 'home';
      return (['home', 'collection', 'apps', 'profile', 'notifications', 'settings'].includes(tab) ? tab : 'home') as Tab;
    })()
  );

  useEffect(() => {
    if (['home', 'collection', 'apps', 'profile', 'notifications', 'settings'].includes(activeTab)) {
      lastMainTabRef.current = activeTab;
    }
  }, [activeTab]);
  const [openRepo, setOpenRepo] = useState<string | null>(() => repoCache.get<string | null>('open_repo_slug') ?? null);
  const [openAppSlug, setOpenAppSlug] = useState<string | null>(() => repoCache.get<string | null>('open_app_slug') ?? null);
  const [openUserSlug, setOpenUserSlug] = useState<string | null>(() => repoCache.get<string | null>('open_user_slug') ?? null);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isRecentlyViewedOpen, setIsRecentlyViewedOpen] = useState(false);
  const [explorerInitialUser, setExplorerInitialUser] = useState<string | null>(null);
  const [explorerSelectedUser, setExplorerSelectedUser] = useState<string | null>(() => repoCache.get<string | null>('explorer_selected_username') ?? null);
  const [collectionSortMode, setCollectionSortMode] = useState<'recent' | 'alpha' | 'updates'>(() => repoCache.get<'recent' | 'alpha' | 'updates'>('collection_sort_mode') ?? 'recent');
  const [showCollectionSortModal, setShowCollectionSortModal] = useState(false);
  const [homeSortMode, setHomeSortMode] = useState<'stars' | 'forks' | 'updated' | 'best-match'>(() => repoCache.get<'stars' | 'forks' | 'updated' | 'best-match'>('home_sort_mode') ?? 'stars');
  const [showHomeSortModal, setShowHomeSortModal] = useState(false);
  const [homeLang, setHomeLang] = useState<string>(() => repoCache.get<string>('home_lang') ?? 'All');
  const [showHomeLangModal, setShowHomeLangModal] = useState(false);
  const [showAppsSortModal, setShowAppsSortModal] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [showWrapped, setShowWrapped] = useState(false);
  const [showReleaseHistory, setShowReleaseHistory] = useState(false);
  const [downloadResult, setDownloadResult] = useState<{ isOpen: boolean; filename: string }>({ isOpen: false, filename: '' });
  const { downloads, startDownload, clearCompleted, removeDownload } = useDownloadManager();

  const commandPaletteOpenRef = useRef(false);
  const showReleaseHistoryRef = useRef(false);

  useEffect(() => {
    showReleaseHistoryRef.current = showReleaseHistory;
  }, [showReleaseHistory]);

  useEffect(() => {
    commandPaletteOpenRef.current = isCommandPaletteOpen;
  }, [isCommandPaletteOpen]);

  const showWrappedRef = useRef(false);
  const openRepoRef = useRef<string | null>(null);
  const openAppSlugRef = useRef<string | null>(null);
  const openUserSlugRef = useRef<string | null>(null);
  const isRecentlyViewedOpenRef = useRef(false);
  const activeTabRef = useRef<Tab>('home');
  const explorerSelectedUserRef = useRef<string | null>(null);
  const showCollectionSortModalRef = useRef(false);
  const showHomeSortModalRef = useRef(false);
  const showHomeLangModalRef = useRef(false);
  const showAppsSortModalRef = useRef(false);
  const showWelcomeModalRef = useRef(false);

  useEffect(() => {
    showWrappedRef.current = showWrapped;
  }, [showWrapped]);

  useEffect(() => {
    openRepoRef.current = openRepo;
    repoCache.set('open_repo_slug', openRepo);
  }, [openRepo]);

  useEffect(() => {
    openAppSlugRef.current = openAppSlug;
    repoCache.set('open_app_slug', openAppSlug);
  }, [openAppSlug]);

  useEffect(() => {
    openUserSlugRef.current = openUserSlug;
    repoCache.set('open_user_slug', openUserSlug);
  }, [openUserSlug]);

  useEffect(() => {
    activeTabRef.current = activeTab;
    repoCache.set('active_tab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    isRecentlyViewedOpenRef.current = isRecentlyViewedOpen;
  }, [isRecentlyViewedOpen]);

  useEffect(() => {
    explorerSelectedUserRef.current = explorerSelectedUser;
    repoCache.set('explorer_selected_username', explorerSelectedUser);
  }, [explorerSelectedUser]);

  useEffect(() => {
    showCollectionSortModalRef.current = showCollectionSortModal;
    repoCache.set('collection_sort_mode', collectionSortMode);
  }, [showCollectionSortModal, collectionSortMode]);

  useEffect(() => {
    showHomeSortModalRef.current = showHomeSortModal;
    repoCache.set('home_sort_mode', homeSortMode);
  }, [showHomeSortModal, homeSortMode]);

  useEffect(() => {
    showHomeLangModalRef.current = showHomeLangModal;
    repoCache.set('home_lang', homeLang);
  }, [showHomeLangModal, homeLang]);

  useEffect(() => {
    showAppsSortModalRef.current = showAppsSortModal;
  }, [showAppsSortModal]);

  useEffect(() => {
    showWelcomeModalRef.current = showWelcomeModal;
  }, [showWelcomeModal]);

  useEffect(() => {
    initImmersiveMode();
    if (Capacitor.isNativePlatform()) {
      StatusBar.setOverlaysWebView({ overlay: true });
      StatusBar.setBackgroundColor({ color: '#00000000' });
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const importData = params.get('import');
    if (importData) {
      try {
        const decoded = JSON.parse(atob(importData));
        const current = JSON.parse(localStorage.getItem('gitspace_notifications') || '{}');
        const merged = { ...current, ...decoded };
        localStorage.setItem('gitspace_notifications', JSON.stringify(merged));
        window.history.replaceState({}, document.title, window.location.pathname);
        setCurrentPage('home');
        setActiveTab('collection');
        toast.success(`Successfully imported ${Object.keys(decoded).length} items!`);
      } catch (err) {
        console.error("Failed to parse import string", err);
      }
    }
  }, []);

  useEffect(() => {
    const savedTheme = localStorage.getItem('gitspace_theme') || 'midnight';
    const root = document.documentElement;
    root.setAttribute('data-theme', savedTheme);

    const savedAccent = localStorage.getItem('gitspace_accent') || 'blue';
    const accentHexMap: Record<string, string> = {
      blue: '#58a6ff', green: '#3fb950', orange: '#f78166', purple: '#d2a8ff', pink: '#f778ba',
    };
    root.style.setProperty('--accent', accentHexMap[savedAccent] || '#58a6ff');
    root.style.setProperty('--accent-glow', `${accentHexMap[savedAccent] || '#58a6ff'}66`);
  }, []);

  useEffect(() => {
    const hasSeen = localStorage.getItem('gitspace_welcome_v1');
    if (!hasSeen) {
      setShowWelcomeModal(true);
      localStorage.setItem('gitspace_welcome_v1', 'true');
    }
  }, []);

  useEffect(() => {
    const handleBackButton = async () => {
      if (showWrappedRef.current) {
        setShowWrapped(false);
      } else if (showWelcomeModalRef.current) {
        setShowWelcomeModal(false);
      } else if (showReleaseHistoryRef.current) {
        setShowReleaseHistory(false);
      } else if (commandPaletteOpenRef.current) {
        setIsCommandPaletteOpen(false);
      } else if (openRepoRef.current) {
        setOpenRepo(null);
      } else if (openAppSlugRef.current) {
        setOpenAppSlug(null);
      } else if (openUserSlugRef.current) {
        setOpenUserSlug(null);
      } else if (isRecentlyViewedOpenRef.current) {
        setIsRecentlyViewedOpen(false);
      } else if (showCollectionSortModalRef.current) {
        setShowCollectionSortModal(false);
      } else if (showHomeSortModalRef.current) {
        setShowHomeSortModal(false);
      } else if (showHomeLangModalRef.current) {
        setShowHomeLangModal(false);
      } else if (showAppsSortModalRef.current) {
        setShowAppsSortModal(false);
      } else if (activeTabRef.current !== 'home') {
        setActiveTab('home');
      } else {
        App.exitApp();
      }
    };

    if (!Capacitor.isNativePlatform()) return;

    const backListener = App.addListener('backButton', handleBackButton);

    const notifyListener = LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
      const slug = action.notification.extra?.slug;
      if (slug) {
        setOpenRepo(slug);
        Native.vibrate();
      }
    });

    const appStateListener = App.addListener('appStateChange', (state) => {
      if (state.isActive) {
        window.dispatchEvent(new Event('gitspace_check_updates'));
      }
    });

    const appUrlOpenListener = App.addListener('appUrlOpen', (event) => {
      try {
        const urlObj = new URL(event.url);
        if (urlObj.hostname === 'github.com') {
          const parts = urlObj.pathname.split('/').filter(Boolean);
          if (parts.length >= 2) {
            setOpenRepo(`${parts[0]}/${parts[1]}`);
          } else if (parts.length === 1) {
            setOpenUserSlug(parts[0]);
          }
        }
      } catch (e) { }
    });

    LocalNotifications.requestPermissions();

    return () => {
      backListener.then(l => l.remove());
      notifyListener.then(l => l.remove());
      appStateListener.then(l => l.remove());
      appUrlOpenListener.then(l => l.remove());
    };
  }, []);

  useEffect(() => {
    if (currentPage === 'getstarted') return;

    const checkUpdates = async () => {
      if (localStorage.getItem('gitspace_notif_enabled') === 'false') return;
      const data = localStorage.getItem('gitspace_notifications');
      if (data) {
        const notifications = JSON.parse(data);
        const slugs = Object.keys(notifications);
        const token = localStorage.getItem('gh_token');
        const headers: Record<string, string> = { 'Accept': 'application/vnd.github.v3+json' };
        if (token) headers['Authorization'] = `token ${token}`;

        for (const slug of slugs) {
          try {
            const current = notifications[slug];
            if (!current.isWatching) continue;
            const relRes = await fetch(`https://api.github.com/repos/${slug}/releases/latest`, { headers });
            if (relRes.ok) {
              const rel = await relRes.json();
              const latestData = { id: rel.id, tag_name: rel.tag_name, published_at: rel.published_at, assets: rel.assets, body: rel.body };
              if (!current.lastSeenId || current.lastSeenId === 0) {
                notifications[slug].lastSeenId = latestData.id;
                notifications[slug].lastPublishedAt = latestData.published_at;
                notifications[slug].hasUpdate = false;
              } else if (String(latestData.id) !== String(current.lastSeenId) && latestData.published_at > (current.lastPublishedAt || '')) {
                notifications[slug].hasUpdate = true;
                notifications[slug].lastSeenId = latestData.id;
                notifications[slug].lastPublishedAt = latestData.published_at;
                Native.notify(notifications[slug].name || slug, `New release: ${latestData.tag_name}`, Math.floor(Math.random() * 10000), { slug });
              }
            }
          } catch (e) { }
        }
        localStorage.setItem('gitspace_notifications', JSON.stringify(notifications));
      }
      window.dispatchEvent(new Event('gitspace_notifications_updated'));
    };

    const handleManualRefresh = () => checkUpdates();
    window.addEventListener('gitspace_check_updates', handleManualRefresh);
    checkUpdates();
    const interval = setInterval(checkUpdates, 5 * 60 * 1000);
    return () => {
      clearInterval(interval);
      window.removeEventListener('gitspace_check_updates', handleManualRefresh);
    };
  }, [currentPage]);

  useEffect(() => {
    const handleDownloadComplete = (e: any) => { setDownloadResult({ isOpen: true, filename: e.detail.filename }); };
    window.addEventListener('gitspace_download_complete', handleDownloadComplete);
    return () => window.removeEventListener('gitspace_download_complete', handleDownloadComplete);
  }, []);

  useEffect(() => {
    const handleToastRequest = (e: any) => {
      const { message, type } = e.detail;
      if (type === 'error') toast.error(message);
      else if (type === 'success') toast.success(message);
      else toast(message);
    };
    window.addEventListener('gitspace_toast', handleToastRequest);
    return () => window.removeEventListener('gitspace_toast', handleToastRequest);
  }, []);

  if (currentPage === 'getstarted') return <GetStartedPage onConnect={() => setCurrentPage('home')} />;

  return (
    <>
      <div className="app-bg h-screen w-full flex flex-col overflow-hidden" style={{ position: 'relative', zIndex: 2 }}>
        {!openRepo && !openAppSlug && !openUserSlug && !['trending', 'issues', 'shorts', 'downloads'].includes(activeTab) && (
          <TopBar onTabChange={setActiveTab} activeTab={activeTab} onOpenRecentlyViewed={() => setIsRecentlyViewedOpen(true)} downloadsCount={downloads.length} />
        )}

        <AnimatePresence mode="wait">
          {openRepo || openAppSlug || openUserSlug ? (
            <motion.main key="details-page" initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.94 }} className="fixed inset-0 z-[100] bg-[var(--bg-primary)] overflow-hidden">
              <div className="w-full h-full overflow-y-auto page-px">
                {openUserSlug ? <UserDetailsPage username={openUserSlug} onClose={() => setOpenUserSlug(null)} onRepoClick={setOpenRepo} /> :
                  openRepo ? <RepoOpener repoSlug={openRepo} onClose={() => setOpenRepo(null)} onOpenUser={setOpenUserSlug} showReleaseHistory={showReleaseHistory} setShowReleaseHistory={setShowReleaseHistory} downloads={downloads} startDownload={startDownload} /> :
                    <AppDetailPage repoSlug={openAppSlug!} onClose={() => setOpenAppSlug(null)} startDownload={startDownload} downloads={downloads} />}
              </div>
            </motion.main>
          ) : (
            <motion.main key="main-tabs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 overflow-hidden relative">
              <div className={`absolute inset-0 overflow-y-auto page-px ${activeTab === 'home' ? '' : 'hidden'}`} style={{ paddingTop: 88, paddingBottom: 160 }}>
                <HomeTab onTabChange={setActiveTab} onRepoClick={setOpenRepo} onAppClick={setOpenAppSlug} onUserClick={setOpenUserSlug} sortMode={homeSortMode} setSortMode={setHomeSortMode} onOpenSort={() => setShowHomeSortModal(true)} lang={homeLang} setLang={setHomeLang} onOpenLang={() => setShowHomeLangModal(true)} onOpenRecentlyViewed={() => setIsRecentlyViewedOpen(true)} />
              </div>
              <div className={`absolute inset-0 overflow-y-auto page-px ${activeTab === 'collection' ? '' : 'hidden'}`} style={{ paddingTop: 88, paddingBottom: 160 }}>
                <CollectionTab onRepoClick={setOpenRepo} onAppClick={setOpenAppSlug} onUserClick={setOpenUserSlug} sortMode={collectionSortMode} onOpenSort={() => setShowCollectionSortModal(true)} />
              </div>
              <div className={`absolute inset-0 overflow-y-auto page-px ${activeTab === 'profile' ? '' : 'hidden'}`} style={{ paddingTop: 88, paddingBottom: 160 }}>
                <ProfileTab onDisconnect={() => { setCurrentPage('getstarted'); setActiveTab('home'); }} onRepoClick={setOpenRepo} onTabChange={setActiveTab as any} />
              </div>
              <div className={`absolute inset-0 overflow-y-auto page-px ${activeTab === 'apps' ? '' : 'hidden'}`} style={{ paddingTop: 88, paddingBottom: 160 }}>
                <AppsTab onRepoClick={setOpenAppSlug} showSortModal={showAppsSortModal} setShowSortModal={setShowAppsSortModal} startDownload={startDownload} downloads={downloads} />
              </div>
              <div className={`absolute inset-0 overflow-y-auto page-px ${activeTab === 'downloads' ? '' : 'hidden'}`} style={{ paddingTop: 20, paddingBottom: 160 }}>
                <DownloadsTab downloads={downloads} onClearAll={clearCompleted} onRemove={removeDownload} />
              </div>
              <div className={`absolute inset-0 overflow-y-auto page-px ${activeTab === 'notifications' ? '' : 'hidden'}`} style={{ paddingTop: 88, paddingBottom: 160 }}>
                <NotificationsPage onTabChange={setActiveTab} onRepoClick={setOpenRepo} onUserClick={setOpenUserSlug} />
              </div>
              <div className={`absolute inset-0 overflow-y-auto page-px ${activeTab === 'settings' ? '' : 'hidden'}`} style={{ paddingTop: 88, paddingBottom: 160 }}>
                <SettingsPage onDisconnect={() => { setCurrentPage('getstarted'); setActiveTab('home'); }} onShowWrapped={() => setShowWrapped(true)} />
              </div>
              <div className={`absolute inset-0 overflow-y-auto page-px ${activeTab === 'trending' ? '' : 'hidden'}`}>
                <TrendingTab onRepoClick={setOpenRepo} onBack={() => setActiveTab(lastMainTabRef.current)} />
              </div>
              <div className={`absolute inset-0 overflow-y-auto page-px ${activeTab === 'issues' ? '' : 'hidden'}`}>
                <IssuesPRTab onRepoClick={setOpenRepo} onBack={() => setActiveTab(lastMainTabRef.current)} />
              </div>
            </motion.main>
          )}
        </AnimatePresence>

        {!openRepo && !openAppSlug && !openUserSlug && !['trending', 'issues'].includes(activeTab) && <BottomNav activeTab={activeTab as any} onTabChange={setActiveTab as any} />}

        <AnimatePresence>
          {showCollectionSortModal && (
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} className="fixed bottom-0 left-0 right-0 z-[2001] bg-[var(--bg-primary)] p-6 rounded-t-3xl">
              <h3 className="text-xl font-bold mb-4 text-white">Sort Collection</h3>
              <div className="space-y-2">
                {['recent', 'alpha', 'updates'].map(k => <button key={k} onClick={() => { setCollectionSortMode(k as any); setShowCollectionSortModal(false); }} className="w-full p-4 rounded-xl bg-white/5 text-white capitalize">{k}</button>)}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <CommandPalette onTabChange={setActiveTab as any} onRepoClick={setOpenRepo} open={isCommandPaletteOpen} setOpen={setIsCommandPaletteOpen} />
        <GitHubWrapped isOpen={showWrapped} onClose={() => setShowWrapped(false)} />
        <DownloadResultPopup isOpen={downloadResult.isOpen} filename={downloadResult.filename} onClose={() => setDownloadResult({ ...downloadResult, isOpen: false })} />
      </div>
    </>
  );
};

export default Index;
