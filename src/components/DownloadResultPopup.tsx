import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Icons from './Icons';
import { Native } from '../utils/NativeBridge';

interface DownloadResultPopupProps {
  isOpen: boolean;
  filename: string;
  onClose: () => void;
}

const DownloadResultPopup: React.FC<DownloadResultPopupProps> = ({ isOpen, filename, onClose }) => {
  const handleOpen = () => {
    if (!filename) return;
    Native.vibrate();
    Native.openFile(filename);
    onClose();
  };

  const handleShare = () => {
    if (!filename) return;
    Native.vibrate();
    Native.shareRepo(filename, `Sharing ${filename}`, '');
    onClose();
  };

  const handleView = () => {
    if (!filename) return;
    Native.vibrate();
    Native.openFile(filename);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence mode="wait">
      <div className="fixed inset-0 z-[10000] flex items-center justify-center pointer-events-none">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-[#0f141d]/80 backdrop-blur-sm pointer-events-auto"
          onClick={onClose}
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 30 }}
          transition={{ type: "spring", damping: 25, stiffness: 400 }}
          className="w-[85%] max-w-[320px] bg-[var(--bg-primary)] border border-[var(--glass-border)] rounded-[40px] p-8 pointer-events-auto text-center shadow-2xl relative z-20"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-16 h-16 rounded-3xl bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/20 flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_var(--accent-primary)11]">
            <Icons.DownloadIcon size={28} color="var(--accent-primary)" />
          </div>
          
          <h2 className="font-sora font-black text-xl text-[hsl(var(--text-primary))] mb-1">DONE!</h2>
          <p className="text-[10px] text-[hsl(var(--text-dim))] font-bold uppercase tracking-[0.2em] mb-4">Download Ready</p>
          <p className="text-[11px] text-[hsl(var(--text-muted))] font-medium truncate px-4 py-2 bg-[var(--glass-bg)] rounded-xl mb-8 border border-[var(--glass-border)]">
            {filename || 'File Downloaded'}
          </p>

          <div className="grid gap-3">
            <button
              onClick={handleOpen}
              className="w-full py-4 rounded-2xl bg-[var(--accent-primary)] text-[hsl(var(--text-primary))] font-sora font-black text-xs uppercase tracking-widest shadow-lg shadow-[var(--accent-primary)]/20 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <Icons.ZapIcon size={14} color="white" /> Open Now
            </button>
            
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleShare}
                className="py-4 rounded-2xl bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[hsl(var(--text-muted))] font-sora font-bold text-[10px] uppercase tracking-wider active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Icons.ShareIcon size={12} color="hsl(var(--text-muted))" /> Share
              </button>
              <button
                onClick={handleView}
                className="py-4 rounded-2xl bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[hsl(var(--text-muted))] font-sora font-bold text-[10px] uppercase tracking-wider active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Icons.FolderIcon size={12} color="hsl(var(--text-muted))" /> View
              </button>
            </div>
          </div>

          <button
            onClick={onClose}
            className="mt-6 text-[10px] font-black text-gray-600 uppercase tracking-[0.3em] hover:text-[hsl(var(--text-muted))] transition-colors"
          >
            Dismiss
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default DownloadResultPopup;
