import React from 'react';
import { motion } from 'framer-motion';

export const RepoCardSkeleton: React.FC = () => {
  return (
    <div className="glass-static p-4 sm:p-5 flex flex-col gap-3 relative overflow-hidden" style={{ borderRadius: 20 }}>
      {/* Shimmer Effect */}
      <motion.div 
        className="absolute inset-0 z-0 bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-12"
        initial={{ x: '-100%' }}
        animate={{ x: '200%' }}
        transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
      />
      
      <div className="flex items-center gap-3 relative z-10 w-full pr-10">
        <div className="w-8 h-8 rounded-full bg-[var(--glass-bg)] shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-2/3 bg-[var(--glass-hover-bg)] rounded-full" />
          <div className="h-2 w-1/3 bg-[var(--glass-bg)] rounded-full" />
        </div>
      </div>
      
      <div className="space-y-2 mt-2 relative z-10">
        <div className="h-2 w-full bg-[var(--glass-bg)] rounded-full" />
        <div className="h-2 w-4/5 bg-[var(--glass-bg)] rounded-full" />
      </div>
      
      <div className="flex items-center gap-4 mt-3 relative z-10">
        <div className="h-3 w-12 bg-[var(--glass-bg)] rounded-full" />
        <div className="h-3 w-12 bg-[var(--glass-bg)] rounded-full" />
        <div className="h-3 w-12 bg-[var(--glass-bg)] rounded-full" />
      </div>
    </div>
  );
};

export const AppCardSkeleton: React.FC = () => {
  return (
    <div className="glass-static rounded-3xl p-4 flex flex-col items-center justify-center relative overflow-hidden h-full min-h-[160px]">
      <motion.div 
        className="absolute inset-0 z-0 bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-12"
        initial={{ x: '-100%' }}
        animate={{ x: '200%' }}
        transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
      />
      
      <div className="w-16 h-16 rounded-[20px] bg-[var(--glass-hover-bg)] relative z-10 mb-3" />
      <div className="h-3 w-20 bg-[var(--glass-hover-bg)] rounded-full relative z-10 mb-2" />
      <div className="h-2 w-12 bg-[var(--glass-bg)] rounded-full relative z-10 mb-3" />
      
      <div className="w-full flex gap-2 relative z-10">
        <div className="h-8 flex-1 bg-[var(--glass-bg)] rounded-xl" />
        <div className="h-8 flex-1 bg-[var(--glass-bg)] rounded-xl" />
      </div>
    </div>
  );
};
