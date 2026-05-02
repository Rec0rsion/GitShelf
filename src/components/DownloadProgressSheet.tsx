import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DownloadTask } from '../utils/DownloadManager';
import { DownloadIcon, ZapIcon, TrashIcon } from './Icons';
import { registerPlugin, Capacitor } from '@capacitor/core';

const GitSyncNative = registerPlugin<any>('GitSyncNative');

interface DownloadProgressSheetProps {
  downloads: DownloadTask[];
  onClear: () => void;
}

const DownloadProgressSheet: React.FC<DownloadProgressSheetProps> = ({ downloads, onClear }) => {
  if (downloads.length === 0) return null;

  const handleCancel = async (id: string) => {
    if (Capacitor.getPlatform() === 'android') {
      try {
        await GitSyncNative.cancelDownload({ downloadId: id });
      } catch (e) {}
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-[100px] left-3 right-3 z-[999] bg-[var(--bg-primary)]/95 backdrop-blur-xl border border-[var(--glass-border)] rounded-[28px] p-6 shadow-2xl"
        style={{
          boxShadow: '0 20px 50px -12px rgba(0, 0, 0, 0.5)'
        }}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[var(--accent-primary)]/10 flex items-center justify-center border border-[var(--accent-primary)]/20">
              <DownloadIcon size={16} color="var(--accent-primary)" />
            </div>
            <div>
              <h3 className="font-sora font-black text-[11px] uppercase tracking-widest text-[hsl(var(--text-primary))]">
                Downloads
              </h3>
              <p className="text-[9px] text-[hsl(var(--text-dim))] font-bold">Active Tasks</p>
            </div>
          </div>
          {downloads.some(t => t.status === 'done' || t.status === 'error') && (
            <button
              onClick={onClear}
              className="px-3 py-1.5 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[10px] font-black text-[hsl(var(--text-muted))] uppercase tracking-wider hover:text-[var(--accent-primary)] transition-all active:scale-95"
            >
              Clear Finished
            </button>
          )}
        </div>

        <div className="space-y-5 max-h-[350px] overflow-y-auto no-scrollbar">
          {downloads.map(task => (
            <div key={task.id} className="relative group">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0 pr-4">
                  <span className="text-[12px] font-bold text-[hsl(var(--text-primary))] truncate block">
                    {task.filename}
                  </span>
                  <p className="text-[10px] font-medium text-[hsl(var(--text-dim))] mt-0.5">
                    {task.status === 'downloading'
                      ? `${(task.downloadedBytes / 1024 / 1024).toFixed(1)}MB of ${(task.totalBytes / 1024 / 1024).toFixed(1)}MB`
                      : task.status === 'done'
                      ? 'Saved successfully'
                      : task.status === 'error'
                      ? 'Error occurred'
                      : 'Preparing...'}
                  </p>
                </div>
                
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`text-[11px] font-black tabular-nums ${
                    task.status === 'done' ? 'text-green-400' : 
                    task.status === 'error' ? 'text-red-400' : 'text-[var(--accent-primary)]'
                  }`}>
                    {task.status === 'done' ? '100%' : 
                     task.status === 'error' ? 'FAILED' : 
                     `${task.progress}%`}
                  </span>
                  
                  {task.status === 'downloading' && (
                    <button 
                      onClick={() => handleCancel(task.id)}
                      className="w-7 h-7 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 active:scale-90 transition-all"
                    >
                      <TrashIcon size={12} />
                    </button>
                  )}
                </div>
              </div>

              {/* Progress Bar Container */}
              <div className="h-2 w-full bg-[var(--glass-bg)] rounded-full overflow-hidden border border-[var(--glass-border)]">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${task.progress}%` }}
                  className={`h-full rounded-full relative ${
                    task.status === 'done' ? 'bg-green-500' : 
                    task.status === 'error' ? 'bg-red-500' : 'bg-[var(--accent-primary)]'
                  }`}
                  transition={{ type: "spring", damping: 20, stiffness: 80 }}
                >
                  {task.status === 'downloading' && (
                    <motion.div
                      animate={{ x: ['-100%', '200%'] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                    />
                  )}
                </motion.div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default DownloadProgressSheet;

