import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SearchIcon, BellIcon, GearIcon, ClockIcon } from './Icons';
import { Native } from '../utils/NativeBridge';

interface TopBarProps {
  onTabChange: (tab: any) => void;
  activeTab?: string;
  onOpenRecentlyViewed?: () => void;
}

const TopBar: React.FC<TopBarProps> = ({ onTabChange, activeTab, onOpenRecentlyViewed }) => {
  const [notificationsCount, setNotificationsCount] = useState(0);
  const [userAvatar, setUserAvatar] = useState<string>('');
  const [userLogin, setUserLogin] = useState<string>('');
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('gh_token');
    if (token) {
      fetch('https://api.github.com/user', { headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github.v3+json' } })
        .then(r => r.ok ? r.json() : null)
        .then(u => { if (u) { setUserAvatar(u.avatar_url); setUserLogin(u.login); } })
        .catch(() => { });
    }
  }, []);

  const loadNotificationsCount = () => {
    const data = JSON.parse(localStorage.getItem('gitspace_notifications') || '{}');
    const repoUpdates = Object.entries(data).filter(([_, val]: any) => val.hasUpdate && val.isCollected !== true).length;
    const userData = JSON.parse(localStorage.getItem('gitspace_watched_users') || '{}');
    const userUpdates = Object.values(userData).filter((val: any) => val.hasUpdate).length;
    setNotificationsCount(repoUpdates + userUpdates);
  };

  useEffect(() => {
    loadNotificationsCount();
    window.addEventListener('gitspace_notifications_updated', loadNotificationsCount);
    return () => window.removeEventListener('gitspace_notifications_updated', loadNotificationsCount);
  }, []);

  return (
    <div className="fixed top-0 left-0 right-0 z-50 pointer-events-none">
      <motion.div
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="w-full pointer-events-auto transition-all duration-200 rounded-b-[20px] relative overflow-hidden"
        style={{
          paddingTop: 'env(safe-area-inset-top)',
          background: 'var(--glass-bg)',
          backdropFilter: 'blur(32px) saturate(180%)',
          WebkitBackdropFilter: 'blur(32px) saturate(180%)',
          boxShadow: isScrolled ? '0 4px 20px rgba(0, 0, 0, 0.4)' : 'none',
          borderBottom: '1px solid var(--glass-border)',
        }}
      >

        <div className="flex items-center justify-between page-px h-[72px] max-w-7xl mx-auto">
          {/* Logo Section */}
          <motion.div
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-4 cursor-pointer"
            onClick={() => { Native.vibrate(); onTabChange('home'); }}
          >
            <div className="relative w-[48px] h-[48px] sm:w-[54px] sm:h-[54px] rounded-[14px] sm:rounded-[18px] overflow-hidden bg-transparent flex items-center justify-center shrink-0 shadow-2xl">
              <img src="/logo.png" alt="GitShelf" className="w-full h-full object-cover" />
            </div>
            <span className="font-sora font-black text-white text-[1.25rem] sm:text-[1.6rem] leading-none tracking-tighter drop-shadow-md">GitShelf</span>
          </motion.div>

          {/* Action Icons */}
          <div className="flex items-center gap-1 sm:gap-2">





            <TopBarButton
              onClick={() => { Native.vibrate(); onTabChange('notifications'); }}
              icon={<BellIcon size={21} color="currentColor" />}
              active={activeTab === 'notifications'}
              badge={notificationsCount}
              activeColor="#f78166"
            />

            <TopBarButton
              onClick={() => { Native.vibrate(); onTabChange('settings'); }}
              icon={<GearIcon size={21} color="currentColor" />}
              active={activeTab === 'settings'}
              activeColor="#ffffff"
            />

            <motion.div
              whileTap={{ scale: 0.9 }}
              onClick={() => { Native.vibrate(); onTabChange('profile'); }}
              className="relative ml-0.5 sm:ml-1 cursor-pointer"
            >
              <div className={`relative w-8 h-8 sm:w-10 sm:h-10 rounded-full overflow-hidden border-2 p-0.5 transition-all duration-200 ${activeTab === 'profile' ? 'border-[#58a6ff] scale-110' : 'border-white/10'}`}>
                {userAvatar ? (
                  <img src={userAvatar} className="w-full h-full rounded-full object-cover" alt="" />
                ) : (
                  <div className="w-full h-full rounded-full bg-white/5 flex items-center justify-center text-[0.85rem] font-black text-[#58a6ff]">
                    {userLogin ? userLogin.slice(0, 2).toUpperCase() : 'U'}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const TopBarButton: React.FC<{
  icon: React.ReactNode,
  onClick: () => void,
  active?: boolean,
  badge?: number,
  tooltip?: string,
  activeColor?: string
}> = ({ icon, onClick, active, badge, activeColor = "#58a6ff" }) => (
  <motion.button
    whileTap={{ scale: 0.9 }}
    onClick={onClick}
    className={`relative flex items-center justify-center w-[38px] h-[38px] sm:w-[44px] sm:h-[44px] rounded-[14px] sm:rounded-[18px] transition-all duration-200 overflow-hidden ${active ? '' : 'bg-white/5 border border-white/8 text-[#8b949e]'}`}
    style={{
      background: active ? `linear-gradient(135deg, ${activeColor}25, ${activeColor}10)` : undefined,
      borderColor: active ? `${activeColor}40` : undefined,
      color: active ? activeColor : undefined,
    }}
  >
    <div className="relative z-10">
      {icon}
    </div>
    {badge !== undefined && badge > 0 && (
      <motion.span
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 bg-[#f78166] rounded-full border-[2px] border-[#121821] flex items-center justify-center z-20"
      >
        <span className="text-[9px] font-black text-white">{badge > 9 ? '9+' : badge}</span>
      </motion.span>
    )}
  </motion.button>
);



export default TopBar;
