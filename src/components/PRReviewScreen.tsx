import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Native } from '../utils/NativeBridge';
import { AppLoader } from './AppLoader';
import { toast } from 'sonner';

interface PRFile {
  sha: string;
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  changes: number;
  blob_url: string;
  raw_url: string;
  contents_url: string;
  patch?: string;
}

interface PRReviewScreenProps {
  repoSlug: string;
  prNumber: number;
  onClose: () => void;
}

const PRReviewScreen: React.FC<PRReviewScreenProps> = ({ repoSlug, prNumber, onClose }) => {
  const [files, setFiles] = useState<PRFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedFile, setSelectedFile] = useState<PRFile | null>(null);

  const ghToken = localStorage.getItem('gh_token') || '';

  useEffect(() => {
    const fetchFiles = async () => {
      setLoading(true);
      setError('');
      try {
        const headers: Record<string, string> = { 'Accept': 'application/vnd.github.v3+json' };
        if (ghToken) headers['Authorization'] = `token ${ghToken}`;

        const res = await fetch(`https://api.github.com/repos/${repoSlug}/pulls/${prNumber}/files`, { headers });
        if (!res.ok) throw new Error('Failed to fetch PR files');
        const data = await res.json();
        setFiles(data);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    fetchFiles();
  }, [repoSlug, prNumber]);

  const renderDiff = (patch?: string) => {
    if (!patch) return <div className="p-10 text-center text-[hsl(var(--text-dim))] text-xs uppercase tracking-widest font-bold opacity-50">No diff available for this file</div>;

    const lines = patch.split('\n');
    return (
      <div className="bg-[var(--bg-primary)] rounded-2xl overflow-hidden border border-[var(--glass-border)] font-mono text-[11px] leading-relaxed">
        {lines.map((line, i) => {
          let bgColor = 'transparent';
          let textColor = 'hsl(var(--text-muted))';
          let prefix = ' ';

          if (line.startsWith('+')) {
            bgColor = 'rgba(63,185,80,0.1)';
            textColor = '#3fb950';
          } else if (line.startsWith('-')) {
            bgColor = 'rgba(247,129,102,0.1)';
            textColor = '#f78166';
          } else if (line.startsWith('@@')) {
            bgColor = 'rgba(88,166,255,0.05)';
            textColor = 'var(--accent-primary)';
            prefix = '';
          }

          return (
            <div key={i} className="flex min-w-0" style={{ backgroundColor: bgColor }}>
              <div className="w-4 flex-shrink-0 text-center opacity-30 select-none px-1" style={{ borderRight: '1px solid var(--glass-border)' }}>
                {line.startsWith('@@') ? '' : i + 1}
              </div>
              <div className="px-2 py-0.5 whitespace-pre-wrap break-all flex-1" style={{ color: textColor }}>
                {line}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed inset-0 z-[500] bg-[var(--bg-primary)] flex flex-col pt-[env(safe-area-inset-top)]"
    >
      {/* Header */}
      <div className="sticky top-0 z-[300] flex items-center px-4 transition-all duration-300"
        style={{
          height: '68px',
        }}
      >
        <div className="flex items-center justify-between w-full h-[54px] px-3 bg-white/[0.04] backdrop-blur-3xl border border-white/5 rounded-2xl shadow-2xl">
          <div className="flex items-center gap-3">
            <button onClick={() => selectedFile ? setSelectedFile(null) : onClose()}
              className="group flex items-center justify-center w-9 h-9 rounded-xl bg-white/5 border border-white/10 text-[hsl(var(--text-primary))] cursor-pointer active:scale-90 transition-all hover:bg-white/10">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:-translate-x-0.5 transition-transform">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <div className="flex flex-col">
              <span className="text-[9px] text-[var(--accent-primary)] font-black uppercase tracking-widest opacity-60 leading-none mb-0.5">Pull Request</span>
              <span className="text-[13px] font-bold text-white leading-none truncate max-w-[120px]">#{prNumber} • {repoSlug.split('/')[1]}</span>
            </div>
          </div>

          {!selectedFile && (
            <div className="flex items-center gap-2 p-1 bg-white/5 rounded-xl border border-white/5">
              <div className="px-2 py-1 rounded-lg bg-[#3fb950]/10 flex items-center gap-1">
                <span className="text-[10px] font-bold text-[#3fb950]">+{files.reduce((a, b) => a + b.additions, 0)}</span>
              </div>
              <div className="px-2 py-1 rounded-lg bg-[#f78166]/10 flex items-center gap-1">
                <span className="text-[10px] font-bold text-[#f78166]">-{files.reduce((a, b) => a + b.deletions, 0)}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar p-5">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 opacity-40">
            <AppLoader className="w-8 h-8 text-[var(--accent-primary)]" />
            <p className="text-[10px] font-black uppercase tracking-widest">Fetching Changes...</p>
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <p className="text-[#f78166] text-sm mb-4">❌ {error}</p>
            <button onClick={onClose} className="px-5 py-2 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[hsl(var(--text-primary))] text-xs font-bold">Go Back</button>
          </div>
        ) : selectedFile ? (
          <div className="space-y-4 animate-fadeIn">
            <div className="flex flex-col gap-1 mb-6">
              <h4 className="font-mono text-[13px] font-bold text-[hsl(var(--text-primary))] break-all">{selectedFile.filename}</h4>
              <div className="flex items-center gap-3 text-[10px] font-bold opacity-60">
                 <span className="text-[#3fb950]">+{selectedFile.additions}</span>
                 <span className="text-[#f78166]">-{selectedFile.deletions}</span>
                 <span className="text-[hsl(var(--text-muted))] uppercase tracking-widest">{selectedFile.status}</span>
              </div>
            </div>
            {renderDiff(selectedFile.patch)}
          </div>
        ) : (
          <div className="space-y-3">
             <p className="text-[10px] font-black text-[hsl(var(--text-dim))] uppercase tracking-[0.2em] mb-4">Files Changed ({files.length})</p>
             {files.map((file, idx) => (
               <button
                 key={idx}
                 onClick={() => { Native.vibrate(); setSelectedFile(file); }}
                 className="w-full glass-static p-4 rounded-2xl border border-[var(--glass-border)] flex items-center justify-between text-left active:scale-[0.98] transition-all"
               >
                 <div className="flex-1 min-w-0 mr-4">
                   <p className="font-mono text-[11px] font-bold text-[hsl(var(--text-primary))] truncate">{file.filename}</p>
                   <p className="text-[10px] text-[hsl(var(--text-dim))] mt-0.5 uppercase tracking-tighter">{file.status}</p>
                 </div>
                 <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[10px] font-bold text-[#3fb950]">+{file.additions}</span>
                    <span className="text-[10px] font-bold text-[#f78166]">-{file.deletions}</span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--text-dim))" strokeWidth="3"><polyline points="9 18 15 12 9 6"/></svg>
                 </div>
               </button>
             ))}
          </div>
        )}
      </div>

      {/* Action Footer */}
      {!loading && !error && !selectedFile && (
        <div className="p-5 border-t border-[var(--glass-border)] bg-[var(--bg-primary)]/80 backdrop-blur-xl shrink-0 pb-[calc(env(safe-area-inset-bottom)+12px)]">
           <button 
             onClick={() => { Native.vibrate(); toast.success('PR Review feature coming soon!'); }}
             className="w-full py-4 rounded-2xl bg-[var(--accent-primary)] text-[hsl(var(--text-primary))] font-sora font-black text-sm shadow-xl shadow-[var(--accent-primary)]/20 active:scale-95 transition-all"
           >
             SUBMIT REVIEW
           </button>
        </div>
      )}
    </motion.div>
  );
};

export default PRReviewScreen;
