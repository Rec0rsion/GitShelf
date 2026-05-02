import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GitHubIcon, EyeIcon, EyeOffIcon, ShieldIcon, FlameIcon, ZapIcon, ClipboardIcon, GlobeIcon, GridIcon } from './Icons';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import { toast } from 'sonner';
import { AppLoader } from './AppLoader';

interface GetStartedPageProps {
  onConnect: () => void;
}

const GetStartedPage: React.FC<GetStartedPageProps> = ({ onConnect }) => {
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<'oauth' | 'pat'>('oauth');
  const [token, setToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [error, setError] = useState(false);
  const [deviceCodeData, setDeviceCodeData] = useState<{ device_code: string, user_code: string, verification_uri: string, interval: number } | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  useEffect(() => {
    if (localStorage.getItem('gh_token')) {
      onConnect();
    }
  }, []);

  const handleConnect = () => {
    if (!token.trim()) {
      setError(true);
      setTimeout(() => setError(false), 2000);
      return;
    }
    localStorage.setItem('gh_token', token.trim());
    localStorage.setItem('git_sync_visited', 'true');
    onConnect();
  };

  const startDeviceFlow = async () => {
    const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID;
    if (!clientId) {
      alert("Please add VITE_GITHUB_CLIENT_ID to your .env file.");
      setAuthMode('pat');
      return;
    }

    try {
      const baseUrl = Capacitor.isNativePlatform() ? 'https://github.com' : '/github-oauth';
      const res = await fetch(`${baseUrl}/login/device/code`, {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: clientId, scope: 'repo user gist notifications' })
      });
      const data = await res.json();
      if (data.device_code) {
        setDeviceCodeData(data);
        pollForToken(data.device_code, data.interval || 5, clientId);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const pollForToken = async (deviceCode: string, initialInterval: number, clientId: string) => {
    setIsPolling(true);
    let attempts = 0;
    let currentInterval = initialInterval || 5;

    const executePoll = async () => {
      attempts++;
      if (attempts > 100) {
        setIsPolling(false);
        setDeviceCodeData(null);
        return;
      }

      try {
        const baseUrl = Capacitor.isNativePlatform() ? 'https://github.com' : '/github-oauth';
        await new Promise(resolve => setTimeout(resolve, (currentInterval * 1000) + 500));

        const res = await fetch(`${baseUrl}/login/oauth/access_token`, {
          method: 'POST',
          headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client_id: clientId,
            device_code: deviceCode,
            grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
          })
        });
        const data = await res.json();

        if (data.access_token) {
          localStorage.setItem('gh_token', data.access_token);
          localStorage.setItem('git_sync_visited', 'true');
          onConnect();
        } else if (data.error === 'authorization_pending') {
          executePoll();
        } else if (data.error === 'slow_down') {
          currentInterval += 5;
          executePoll();
        } else {
          setIsPolling(false);
          setDeviceCodeData(null);
        }
      } catch (e) {
        executePoll();
      }
    };
    executePoll();
  };

  return (
    <div className="fixed inset-0 z-[10000] overflow-hidden font-sora bg-[#090a0d]">
      {/* ─── Physical Sandblasted Texture Background ─── */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Base Radial Gradient for deep lighting */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,#1c212b_0%,#050608_100%)]" />
        
        {/* High-visibility Grain/Asphalt Texture */}
        <div 
          className="absolute inset-0 opacity-[0.2] mix-blend-overlay" 
          style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'2\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")' }} 
        />
        
        {/* Intensive Dark Vignette to shadow the edges of the texture */}
        <div className="absolute inset-0 shadow-[inset_0_0_120px_rgba(0,0,0,0.95)]" />
      </div>

      <div className="relative h-full flex flex-col items-center justify-center px-8 text-center">
        <AnimatePresence mode="wait">
          {!showAuth ? (
            <motion.div
              key="hero"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, filter: 'blur(10px)' }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="max-w-lg w-full"
            >
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="w-32 h-32 rounded-[24px] overflow-hidden flex items-center justify-center mx-auto mb-12 relative"
              >
                <img src="/logo.png" alt="GitShelf" className="w-full h-full object-cover" />
              </motion.div>

              <h1 className="text-6xl font-black text-[hsl(var(--text-primary))] mb-6 tracking-tighter">
                GitShelf.
              </h1>

              <p className="text-xl text-[hsl(var(--text-muted))] mb-12 max-w-sm mx-auto leading-relaxed font-bold opacity-80">
                The high-performance shelf for GitHub developers. <br />
                Stay organized. Stay notified.
              </p>

              <div className="space-y-4">
                <button
                  onClick={() => setShowAuth(true)}
                  className="group relative w-full py-5 bg-white text-black font-extrabold rounded-2xl overflow-hidden transition-all active:scale-95 hover:bg-gray-200"
                >
                  <span className="relative z-10">Open the Shelf</span>
                </button>

              </div>
            </motion.div>
          ) : (
            <motion.div
              key="auth"
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="w-full max-w-md relative"
            >
              <button
                onClick={() => setShowAuth(false)}
                className="absolute -top-16 left-0 text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text-primary))] transition-all flex items-center gap-2 group"
              >
                <div className="w-10 h-10 rounded-full border border-[var(--glass-border)] flex items-center justify-center group-hover:border-[var(--glass-border)] transition-all">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M19 12H5M12 19l-7-7 7-7" />
                  </svg>
                </div>
                <span className="text-xs font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all">Back</span>
              </button>

              <div className="mb-12 text-center">
                <h2 className="text-4xl font-black text-[hsl(var(--text-primary))] mb-4 tracking-tighter">Login.</h2>
                <p className="text-sm text-[hsl(var(--text-muted))] font-medium opacity-60">Sign in to sync your GitHub profile.</p>
              </div>

              {authMode === 'oauth' ? (
                <div className="space-y-8">
                  {!deviceCodeData ? (
                    <div className="space-y-6">
                      <button
                        onClick={startDeviceFlow}
                        className="w-full py-6 bg-white text-black font-black rounded-[24px] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                      >
                        <GitHubIcon size={24} color="#000" />
                        Connect GitHub
                      </button>

                      <div className="flex items-center gap-4 py-2">
                        <div className="h-[1px] flex-1 bg-[var(--glass-bg)]"></div>
                        <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Alternate</span>
                        <div className="h-[1px] flex-1 bg-[var(--glass-bg)]"></div>
                      </div>

                      <button
                        onClick={() => setAuthMode('pat')}
                        className="w-full text-xs font-black text-[hsl(var(--text-muted))] hover:text-[var(--accent-primary)] transition-all uppercase tracking-[0.2em] py-2"
                      >
                        Access via Personal Token
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-8 animate-scaleIn w-full">
                      <div className="text-center w-full">
                        <p className="text-[10px] text-[hsl(var(--text-muted))] uppercase tracking-[0.3em] font-black mb-8">User Approval Required</p>

                        <div
                          onClick={() => {
                            navigator.clipboard.writeText(deviceCodeData.user_code);
                            toast.success("Code copied!");
                          }}
                          className="relative group cursor-pointer active:scale-[0.98] transition-all mx-auto max-w-[320px]"
                        >
                          <div className="relative glass-static p-6 rounded-[28px] border border-[var(--glass-border)] flex flex-col items-center gap-3 overflow-hidden">
                            <div className="text-4xl sm:text-5xl font-black tracking-wider text-[var(--accent-primary)]">
                              {deviceCodeData.user_code}
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-[hsl(var(--text-muted))] font-black uppercase tracking-widest opacity-60">
                              <ClipboardIcon size={12} color="hsl(var(--text-muted))" />
                              Tap to copy
                            </div>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => Browser.open({ url: deviceCodeData.verification_uri })}
                        className="w-full py-6 bg-[var(--accent-primary)] text-[hsl(var(--text-primary))] font-black rounded-[24px] hover:scale-[1.02] active:scale-[0.98] transition-all"
                      >
                        Verify Identity
                      </button>

                      <div className="flex flex-col items-center gap-4">
                        {isPolling && (
                          <div className="flex items-center justify-center gap-4 py-2">
                            <AppLoader className="w-5 h-5 text-[var(--accent-primary)] loader" />
                            <span className="text-xs text-[hsl(var(--text-muted))] font-black uppercase tracking-widest italic animate-pulse">Syncing...</span>
                          </div>
                        )}

                        <button
                          onClick={() => setDeviceCodeData(null)}
                          className="text-[10px] font-black text-[#f78166] hover:text-[#f78166]/80 uppercase tracking-[0.3em] transition-all border-b border-[#f78166]/20 pb-1"
                        >
                          Abort Connection
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-6 animate-fadeIn">
                  <div className="relative group">
                    <div className="absolute inset-0 bg-[var(--accent-primary)]/5 rounded-3xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity" />
                    <input
                      type={showToken ? 'text' : 'password'}
                      value={token}
                      onChange={e => setToken(e.target.value)}
                      placeholder="GitHub Access Token"
                      className={`relative w-full bg-[var(--glass-bg)] border-2 ${error ? 'border-[#f78166]' : 'border-[var(--glass-border)]'} rounded-[24px] py-6 px-8 text-[hsl(var(--text-primary))] focus:outline-none focus:border-[var(--accent-primary)]/40 transition-all font-mono text-center text-lg tracking-widest placeholder:text-[hsl(var(--text-muted))]/30`}
                    />
                    <button
                      onClick={() => setShowToken(!showToken)}
                      className="absolute right-6 top-1/2 -translate-y-1/2 text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text-primary))] p-2"
                    >
                      {showToken ? <EyeOffIcon size={20} /> : <EyeIcon size={20} />}
                    </button>
                  </div>

                  <button
                    onClick={handleConnect}
                    className="w-full py-6 bg-[var(--accent-primary)] text-[hsl(var(--text-primary))] font-black rounded-[24px] hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    Authenticate Node
                  </button>

                  <button
                    onClick={() => setAuthMode('oauth')}
                    className="w-full py-2 text-[10px] font-black text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text-primary))] transition-all uppercase tracking-[0.3em] mt-2"
                  >
                    ← Back to OAuth
                  </button>
                </div>
              )}

            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default GetStartedPage;
