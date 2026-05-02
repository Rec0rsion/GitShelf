import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Native } from '../utils/NativeBridge';
import { TrashIcon, DownloadIcon, ZapIcon } from './Icons';

interface Download {
  filename: string;
  url: string;
  status: 'downloading' | 'done' | 'error';
  progress: number;
  localUri?: string;
}

interface DownloadsTabProps {
  downloads: Download[];
  onClearAll: () => void;
  onRemove: (filename: string) => void;
}

const DownloadsTab: React.FC<DownloadsTabProps> = ({ downloads, onClearAll, onRemove }) => {
  const activeDownloads = downloads.filter(d => d.status === 'downloading');
  const completedDownloads = downloads.filter(d => d.status === 'done');

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', bounce: 0.4 } },
    exit: { opacity: 0, scale: 0.9, transition: { duration: 0.2 } }
  };

  return (
    <div className="w-full flex-1 flex flex-col pb-24 relative">
      {/* Background ambient lighting */}
      <div className="absolute top-[-50px] left-1/2 -translate-x-1/2 w-[300px] h-[300px] bg-[var(--accent-primary)]/10 blur-[100px] rounded-full pointer-events-none" />

      {/* Header */}
      <div className="sticky top-0 z-[100] flex items-center justify-between pt-6 pb-4 mb-4 -mx-4 px-6 bg-[rgba(18,24,33,0.8)] backdrop-blur-xl border-b border-[var(--glass-border)] shadow-2xl">
        <div>
          <h2 className="font-sora font-black text-3xl text-transparent bg-clip-text bg-gradient-to-r from-white via-[hsl(var(--text-primary))] to-[hsl(var(--text-muted))] tracking-tight drop-shadow-sm">
            Downloads
          </h2>
          <motion.div 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2 mt-1.5"
          >
            <div className={`w-2 h-2 rounded-full ${activeDownloads.length > 0 ? 'bg-[var(--accent-primary)] animate-pulse shadow-[0_0_8px_var(--accent-primary)]' : 'bg-[#3fb950] shadow-[0_0_8px_#3fb950]'}`} />
            <p className="text-[11px] text-[hsl(var(--text-muted))] font-bold uppercase tracking-widest">
              {downloads.length} Assets in Queue
            </p>
          </motion.div>
        </div>
        
        {downloads.length > 0 && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => { Native.vibrate(); onClearAll(); }}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-[#ff4a4a]/10 hover:bg-[#ff4a4a]/20 border border-[#ff4a4a]/20 hover:border-[#ff4a4a]/40 text-[#ff4a4a] text-[11px] font-black uppercase tracking-[0.2em] transition-colors shadow-lg shadow-[#ff4a4a]/5"
          >
            Clear
          </motion.button>
        )}
      </div>

      {downloads.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center flex-1 py-32 relative z-10"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[var(--accent-primary)]/5 to-transparent blur-3xl rounded-full" />
          <motion.div 
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="mb-6 w-24 h-24 rounded-[32px] bg-gradient-to-br from-white/10 to-white/5 border border-[var(--glass-border)] shadow-2xl flex items-center justify-center glass backdrop-blur-md"
          >
             <DownloadIcon size={40} color="rgba(255,255,255,0.4)" />
          </motion.div>
          <p className="font-sora font-black text-xl text-[hsl(var(--text-primary))] drop-shadow-md">No active transfers</p>
          <p className="text-xs text-[hsl(var(--text-muted))] mt-2 font-medium max-w-[200px] text-center leading-relaxed">
            Files you download from repositories will magically appear here.
          </p>
        </motion.div>
      ) : (
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="space-y-8 relative z-10 px-2 mt-4"
        >
          {/* Active Downloads */}
          <AnimatePresence>
            {activeDownloads.length > 0 && (
              <motion.div variants={itemVariants} className="space-y-4">
                <div className="flex items-center gap-2 px-1">
                  <div className="w-1 h-3 rounded-full bg-[var(--accent-primary)]" />
                  <p className="text-[11px] font-black text-[var(--accent-primary)] uppercase tracking-[0.2em]">Downloading</p>
                </div>
                
                {activeDownloads.map((dl, idx) => (
                  <motion.div 
                    layoutId={`dl-${dl.filename}`}
                    key={dl.filename} 
                    className="relative overflow-hidden p-5 rounded-[28px] border border-[var(--glass-border)] bg-white/[0.02] backdrop-blur-xl shadow-2xl"
                  >
                    {/* Progress Glow Background */}
                    <div 
                       className="absolute inset-y-0 left-0 bg-gradient-to-r from-[var(--accent-primary)]/20 to-transparent transition-all duration-300"
                       style={{ width: `${dl.progress}%` }}
                    />
                    
                    <div className="relative z-10 flex justify-between items-center mb-4">
                      <div className="flex items-center gap-3 min-w-0 pr-4">
                        <div className="w-10 h-10 rounded-2xl bg-[var(--accent-primary)]/20 flex items-center justify-center shrink-0 border border-[var(--accent-primary)]/30">
                           <DownloadIcon size={18} color="var(--accent-primary)" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-mono text-xs font-bold text-[hsl(var(--text-primary))] truncate max-w-[150px]">{dl.filename}</p>
                          <p className="text-[10px] text-[hsl(var(--text-muted))] font-medium mt-0.5">Fetching magic bits...</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-[var(--accent-primary)]">
                          {dl.progress}%
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar Container */}
                    <div className="relative z-10 h-1.5 w-full bg-white/[0.05] rounded-full overflow-hidden border border-white/10 inset-shadow">
                      <motion.div
                        className="h-full bg-gradient-to-r from-[var(--accent-primary)] to-[#79c0ff] relative"
                        initial={{ width: 0 }}
                        animate={{ width: `${dl.progress}%` }}
                        transition={{ ease: "linear", duration: 0.5 }}
                      >
                         <div className="absolute top-0 right-0 bottom-0 w-8 bg-gradient-to-r from-transparent to-white/50 animate-pulse" />
                      </motion.div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Completed */}
          <AnimatePresence>
            {completedDownloads.length > 0 && (
              <motion.div variants={itemVariants} className="space-y-4">
                <div className="flex items-center gap-2 px-1">
                  <div className="w-1 h-3 rounded-full bg-[#3fb950]" />
                  <p className="text-[11px] font-black text-[#3fb950] uppercase tracking-[0.2em]">Ready to Use</p>
                </div>
                
                {completedDownloads.map((dl, idx) => (
                  <motion.div 
                    layoutId={`dl-${dl.filename}`}
                    key={dl.filename} 
                    variants={itemVariants}
                    exit="exit"
                    className="group relative p-1 rounded-[24px] bg-gradient-to-b from-white/10 to-white/5 backdrop-blur-xl hover:bg-[var(--glass-hover-bg)] transition-all shadow-lg"
                  >
                    <div className="absolute inset-0 bg-gradient-to-b from-[#3fb950]/0 to-[#3fb950]/5 rounded-[24px] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    
                    <div className="relative flex items-center justify-between p-3 rounded-[20px] bg-white/[0.03] border border-[var(--glass-border)] shadow-inner">
                      <div 
                        className="flex-1 flex items-center gap-4 min-w-0 pr-4 cursor-pointer" 
                        onClick={() => { Native.vibrate(); Native.openFile(dl.localUri || dl.filename); }}
                      >
                        <div className="w-12 h-12 rounded-[18px] bg-[#3fb950]/10 flex items-center justify-center shrink-0 border border-[#3fb950]/20 group-hover:scale-105 transition-transform">
                          <ZapIcon size={20} color="#3fb950" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-mono text-sm font-bold text-[hsl(var(--text-primary))] truncate transition-colors group-hover:text-[hsl(var(--text-primary))]">
                            {dl.filename}
                          </p>
                          <p className="text-[10px] text-[#3fb950] font-bold uppercase tracking-widest mt-1 opacity-80">
                            Available locally
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 pr-1">
                        <motion.button
                          whileHover={{ scale: 1.1, backgroundColor: 'rgba(255, 74, 74, 0.15)' }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => { Native.vibrate(); onRemove(dl.filename); }}
                          className="w-10 h-10 flex items-center justify-center rounded-2xl bg-[var(--glass-bg)] text-[hsl(var(--text-muted))] hover:text-[#ff4a4a] transition-colors"
                        >
                          <TrashIcon size={16} />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => { Native.vibrate(); Native.openFile(dl.localUri || dl.filename); }}
                          className="w-12 h-12 flex items-center justify-center rounded-2xl bg-[#3fb950] hover:bg-[#46cc58] text-[hsl(var(--text-primary))] shadow-lg shadow-[#3fb950]/25 transition-colors"
                        >
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
};

export default DownloadsTab;
