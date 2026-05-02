import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Native } from '../utils/NativeBridge';

type Tab = 'home' | 'collection' | 'apps' | 'downloads' | 'profile' | 'notifications' | 'settings' | 'trending' | 'issues' | 'shorts';

interface BottomNavProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

import { useState, useEffect } from 'react';

const mainTabs: {
  id: Tab;
  label: string;
  Icon: React.FC<{ active?: boolean }>;
}[] = [
    { id: 'home', label: 'Home', Icon: ({ active }) => <HomeIcon active={active} /> },
    { id: 'apps', label: 'Apps', Icon: ({ active }) => <AppsIcon active={active} /> },
    { id: 'collection', label: 'Saved', Icon: ({ active }) => <CollectionIcon active={active} /> },
  ];

const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange }) => {
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  useEffect(() => {
    const initialHeight = window.innerHeight;
    const handleResize = () => {
      // If height shrinks by more than 150px, assume keyboard is open
      setIsKeyboardOpen(window.innerHeight < initialHeight - 150);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <AnimatePresence>
      {!isKeyboardOpen && (
        <motion.div
          className="fixed bottom-0 left-0 right-0 z-[100] pointer-events-auto"
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", damping: 30, stiffness: 200 }}
          style={{
            background: 'rgba(13, 17, 23, 0.7)',
            backdropFilter: 'blur(32px) saturate(180%)',
            WebkitBackdropFilter: 'blur(32px) saturate(180%)',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '32px 32px 0 0',
            paddingBottom: 'max(16px, env(safe-area-inset-bottom, 0px))',
          }}
        >
          <nav className="w-full h-[72px] mx-auto flex items-center justify-around px-6">
            {mainTabs.map(({ id, label, Icon }) => {
              const active = activeTab === id;

              return (
                <button
                  key={id}
                  onClick={() => { Native.hapticImpact('Selection'); onTabChange(id); }}
                  className="relative flex-1 flex flex-col items-center justify-center h-full transition-all duration-200 border-none bg-transparent cursor-pointer select-none"
                >
                  {/* Active Glow/Indicator */}
                  <AnimatePresence>
                    {active && (
                      <motion.div
                        layoutId="activeTabBackground"
                        className="absolute inset-x-2 inset-y-2.5 rounded-2xl"
                        style={{
                          background: 'rgba(88, 166, 255, 0.08)',
                          boxShadow: '0 0 20px rgba(88, 166, 255, 0.1)',
                        }}
                        transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                      />
                    )}
                  </AnimatePresence>

                  <div className="flex flex-col items-center gap-1.5 z-10">
                    <motion.div
                      animate={active ? { scale: 1.15, y: -2 } : { scale: 1, y: 0 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                    >
                      <Icon active={active} />
                    </motion.div>

                    <span className={`text-[0.62rem] font-black tracking-[0.08rem] uppercase transition-all duration-300 ${active ? 'text-[#58a6ff] opacity-100' : 'text-[#8b949e] opacity-40'}`}>
                      {label}
                    </span>

                    {/* Dot indicator */}
                    {active && (
                      <motion.div
                        layoutId="activeDot"
                        className="absolute -bottom-1.5 w-1 h-1 bg-[#58a6ff] rounded-full shadow-[0_0_8px_#58a6ff]"
                      />
                    )}
                  </div>
                </button>
              );
            })}
          </nav>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/* ─── Refined Icons ─── */

const HomeIcon = ({ active }: { active?: boolean }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? "rgba(88, 166, 255, 0.18)" : "none"} stroke={active ? '#58a6ff' : '#8b949e'} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

const AppsIcon = ({ active }: { active?: boolean }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? "rgba(88, 166, 255, 0.18)" : "none"} stroke={active ? '#58a6ff' : '#8b949e'} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1.5"></rect>
    <rect x="14" y="3" width="7" height="7" rx="1.5"></rect>
    <rect x="14" y="14" width="7" height="7" rx="1.5"></rect>
    <rect x="3" y="14" width="7" height="7" rx="1.5"></rect>
  </svg>
);

const CollectionIcon = ({ active }: { active?: boolean }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? "rgba(88, 166, 255, 0.18)" : "none"} stroke={active ? '#58a6ff' : '#8b949e'} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
  </svg>
);

export default BottomNav;

