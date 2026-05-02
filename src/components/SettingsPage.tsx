import React, { useState, useEffect } from 'react';
import { TrashIcon } from './Icons';
import { Native } from '../utils/NativeBridge';
import { setImmersiveMode } from '../utils/ImmersiveMode';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { Capacitor } from '@capacitor/core';
import { StatusBar } from '@capacitor/status-bar';


interface SettingsPageProps {
  onDisconnect: () => void;
  onShowWrapped?: () => void;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ onDisconnect, onShowWrapped }) => {
  const [token, setToken] = useState(localStorage.getItem('gh_token') || '');
  const [newToken, setNewToken] = useState('');
  const [accounts, setAccounts] = useState<any[]>(() => JSON.parse(localStorage.getItem('gitspace_accounts') || '[]'));
  const [saveStatus, setSaveStatus] = useState('');
  const [userData, setUserData] = useState<any>(null);
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('gitspace_theme') || 'midnight';
    return saved === 'light' ? 'midnight' : saved;
  });
  const [accent, setAccent] = useState(localStorage.getItem('gitspace_accent') || 'blue');
  const [animations, setAnimations] = useState(localStorage.getItem('gitspace_animations') !== 'false');
  const [lang, setLang] = useState(localStorage.getItem('gitspace_lang') || 'en');
  const [sounds, setSounds] = useState(localStorage.getItem('gitspace_sounds') === 'true');
  const [lockEnabled, setLockEnabled] = useState(localStorage.getItem('gitspace_lock_enabled') === 'true');
  const [appPin, setAppPin] = useState(localStorage.getItem('gitspace_app_pin') || '0000');
  const [immersive, setImmersive] = useState(localStorage.getItem('is_immersive_mode') === 'true');
  const [notifEnabled, setNotifEnabled] = useState(localStorage.getItem('gitspace_notif_enabled') !== 'false');
  const [syncing, setSyncing] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);

  const ACCENT_COLORS = [
    { id: 'blue', color: '#58a6ff' },
    { id: 'green', color: '#3fb950' },
    { id: 'orange', color: '#f78166' },
    { id: 'purple', color: '#d2a8ff' },
    { id: 'pink', color: '#f778ba' }
  ];



  const DICT: Record<string, Record<string, string>> = {
    en: { settings: 'Settings', manage: 'Manage your preferences', appearance: 'Appearance', theme: 'Theme Mode', theme_sub: 'Choose your desired color scheme.', animations: 'Animations', anim_sub: 'Enable UI transitions.', lang: 'Language', lang_sub: 'Change application language.', sounds: 'Sound Effects', sounds_sub: 'Play audio on interaction.', system: 'System', auth: 'Authentication', immersive: 'Immersive Mode', immersive_sub: 'Hide Android navigation & status bars.' },
    es: { settings: 'Ajustes', manage: 'Gestiona tus preferencias', appearance: 'Apariencia', theme: 'Modo de tema', theme_sub: 'Elige tu esquema de color deseado.', animations: 'Animaciones', anim_sub: 'Habilitar transiciones.', lang: 'Idioma', lang_sub: 'Cambiar el idioma.', sounds: 'Efectos Sonoros', sounds_sub: 'Reproducir audio.', system: 'Sistema', auth: 'Autenticación', immersive: 'Modo Inmersivo', immersive_sub: 'Ocultar barras de navegación y estado.' },
    fr: { settings: 'Paramètres', manage: 'Gérez vos préférences', appearance: 'Apparence', theme: 'Thème', theme_sub: 'Choisissez votre schéma de couleurs.', animations: 'Animations', anim_sub: 'Activer les transitions.', lang: 'Langue', lang_sub: 'Changer la langue.', sounds: 'Effets Sonores', sounds_sub: 'Jouer du son.', system: 'Système', auth: 'Authentification', immersive: 'Mode Immersif', immersive_sub: 'Masquer les barres de navigation.' }

  };
  const t = (k: string) => DICT[lang]?.[k] || DICT.en[k] || k;

  const switchLang = (l: string) => {
    setLang(l);
    localStorage.setItem('gitspace_lang', l);
  };

  useEffect(() => {
    if (token) {
      fetch('https://api.github.com/user', {
        headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github.v3+json' }
      })
        .then(res => res.json())
        .then(data => {
          setUserData(data);
          if (data.login) {
            let accs = JSON.parse(localStorage.getItem('gitspace_accounts') || '[]');
            const existingIdx = accs.findIndex((a: any) => a.token === token);
            if (existingIdx === -1) {
              accs.push({ token, login: data.login, avatar: data.avatar_url, name: data.name });
              setAccounts(accs);
              localStorage.setItem('gitspace_accounts', JSON.stringify(accs));
            } else {
              accs[existingIdx] = { token, login: data.login, avatar: data.avatar_url, name: data.name };
              setAccounts(accs);
              localStorage.setItem('gitspace_accounts', JSON.stringify(accs));
            }
          }
        })
        .catch(() => setUserData(null));
    }
  }, [token]);

  const handleAddNewAccount = () => {
    if (!newToken.trim()) return;
    localStorage.setItem('gh_token', newToken.trim());
    window.location.reload();
  };

  const switchAccount = (accToken: string) => {
    localStorage.setItem('gh_token', accToken);
    window.location.reload();
  };

  const removeAccount = (accToken: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newAccs = accounts.filter(a => a.token !== accToken);
    setAccounts(newAccs);
    localStorage.setItem('gitspace_accounts', JSON.stringify(newAccs));

    if (token === accToken) {
      if (newAccs.length > 0) {
        switchAccount(newAccs[0].token);
      } else {
        localStorage.removeItem('gh_token');
        setToken('');
        setUserData(null);
        onDisconnect();
      }
    }
  };

  const handleClearToken = () => {
    localStorage.removeItem('gh_token');
    localStorage.removeItem('gitspace_accounts');
    setToken('');
    setAccounts([]);
    setUserData(null);
    onDisconnect();
  };

  const switchTheme = (t: string) => {
    setTheme(t);
    localStorage.setItem('gitspace_theme', t);
    const root = document.documentElement;
    root.setAttribute('data-theme', t);

    // System Theme Synchronization (Point 6)
    if (Capacitor.isNativePlatform()) {
      StatusBar.setBackgroundColor({ color: t === 'amoled' ? '#0f141d' : '#121821' }).catch(() => { });
    }
  };

  const switchAccent = (a: string, hex: string) => {
    setAccent(a);
    localStorage.setItem('gitspace_accent', a);
    document.documentElement.style.setProperty('--accent', hex);
    document.documentElement.style.setProperty('--accent-glow', `${hex}66`);
  };

  const toggleAnimations = () => {
    const next = !animations;
    setAnimations(next);
    localStorage.setItem('gitspace_animations', String(next));
    document.documentElement.style.setProperty('--anim-duration', next ? '0.3s' : '0s');
    if (sounds) playSound('click');
  };

  const playSound = (type: 'click' | 'success') => {
    try {
      const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextCtor) return;
      const ctx = new AudioContextCtor();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      if (type === 'success') {
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      } else {
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.05);
        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
      }
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } catch (e) { }
  };

  const toggleSounds = () => {
    const next = !sounds;
    setSounds(next);
    localStorage.setItem('gitspace_sounds', String(next));
    if (next) playSound('success');
  };


  const confirmClearAllData = () => {
    localStorage.removeItem('gitspace_notifications');
    localStorage.removeItem('gitspace_recent_views');
    localStorage.removeItem('gitspace_theme');
    localStorage.removeItem('gitspace_animations');
    localStorage.removeItem('gitspace_repo_cache');
    setSaveStatus('All local data cleared. Reloading...');
    setShowResetModal(false);
    setTimeout(() => window.location.reload(), 1500);
  };

  const clearReadmeCache = () => {
    localStorage.removeItem('gitspace_repo_cache');
    setSaveStatus('README cache cleared!');
    setTimeout(() => setSaveStatus(''), 2000);
  };

  const toggleLock = () => {
    const next = !lockEnabled;
    setLockEnabled(next);
    localStorage.setItem('gitspace_lock_enabled', String(next));
    if (sounds) playSound('success');
  };

  const toggleImmersive = () => {
    const next = !immersive;
    setImmersive(next);
    localStorage.setItem('is_immersive_mode', String(next));
    setImmersiveMode(next);
    if (sounds) playSound('success');
  };

  const toggleNotif = () => {
    const next = !notifEnabled;
    setNotifEnabled(next);
    localStorage.setItem('gitspace_notif_enabled', String(next));
    if (sounds) playSound('success');
    window.dispatchEvent(new Event('gitspace_notifications_updated'));
  };


  const exportBackup = async () => {
    try {
      const data = {
        notifications: localStorage.getItem('gitspace_notifications') || '{}',
        watched_users: localStorage.getItem('gitspace_watched_users') || '{}',
        recent_views: localStorage.getItem('gitspace_recent_views') || '[]',
      };

      const jsonString = JSON.stringify(data, null, 2);
      const filename = `gitshelf-backup-${new Date().toISOString().split('T')[0]}.json`;

      await Native.shareFile(filename, jsonString);

      toast.success("Export initiated!");
    } catch (e: any) {
      toast.error("Export failed: " + e.message);
    }
  };

  const importBackup = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const content = event.target?.result as string;
          const parsed = JSON.parse(content);

          if (parsed.notifications) localStorage.setItem('gitspace_notifications', parsed.notifications);
          if (parsed.watched_users) localStorage.setItem('gitspace_watched_users', parsed.watched_users);
          if (parsed.recent_views) localStorage.setItem('gitspace_recent_views', parsed.recent_views);

          toast.success("Successfully restored everything!");
          setTimeout(() => window.location.reload(), 1500);
        } catch (err: any) {
          toast.error("Invalid backup file: " + err.message);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  return (
    <div className="animate-fadeIn w-full space-y-4">
      <div className="mb-6">
        <h2 className="font-sora font-bold" style={{ fontSize: '1.4rem', letterSpacing: '-0.03em' }}>{t('settings')}</h2>
        <p style={{ fontSize: '0.82rem', color: '#8b949e' }}>{t('manage')}</p>
      </div>

      {/* ═══ Multi-Account Auth ═══ */}
      <div className="glass-static" style={{ borderRadius: 24, padding: '1.5rem', marginBottom: '1.5rem' }}>
        <h3 className="text-[#e6edf3] font-bold text-sm mb-4 flex items-center gap-2">
          <span className="text-[#58a6ff]">👥</span> GitHub Accounts
        </h3>

        {/* Existing Accounts List */}
        {accounts.length > 0 && (
          <div className="space-y-3 mb-6">
            {accounts.map(acc => {
              const isActive = acc.token === token;
              return (
                <div
                  key={acc.token}
                  onClick={() => !isActive && switchAccount(acc.token)}
                  className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${isActive ? 'bg-[#58a6ff]/10 border-[#58a6ff]/30 cursor-default' : 'bg-white/[0.02] border-white/10 hover:bg-white/5 cursor-pointer active:scale-[0.98]'}`}
                >
                  <img src={acc.avatar} style={{ width: 44, height: 44, borderRadius: 10 }} alt={acc.login} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-[#e6edf3] flex items-center gap-2">
                      {acc.name || acc.login}
                      {isActive && <span className="text-[9px] bg-[#58a6ff]/20 text-[#58a6ff] px-2 py-0.5 rounded-full uppercase tracking-wider">Active</span>}
                    </div>
                    <div className="text-[11px] text-[#8b949e]">@{acc.login}</div>
                  </div>
                  <button onClick={(e) => removeAccount(acc.token, e)} className="p-2 cursor-pointer hover:bg-[#f78166]/10 rounded-lg transition-colors group">
                    <TrashIcon size={16} color="#f78166" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <div className="space-y-4 pt-2">
          <div>
            <div className="flex items-center justify-between px-1 mb-3">
              <label className="block text-[11px] font-bold text-[#6e7681] uppercase tracking-[0.18em]">Add New Account (PAT)</label>
              <button
                onClick={() => window.open('https://github.com/settings/tokens/new?description=GitShelf%20Mobile&scopes=repo,user,gist,notifications', '_blank')}
                className="text-[10px] font-bold text-[#58a6ff] hover:underline bg-transparent border-none cursor-pointer"
              >
                Generate Token
              </button>
            </div>
            <input
              type="password"
              value={newToken}
              onChange={(e) => setNewToken(e.target.value)}
              placeholder="ghp_xxxxxxxxxxxx"
              className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 px-5 text-[#e6edf3] text-base focus:outline-none focus:border-[#58a6ff] transition-all"
              style={{ minHeight: 56 }}
            />
          </div>

          <div className="flex gap-4">
            <button
              onClick={handleAddNewAccount}
              disabled={!newToken}
              className="flex-1 font-sora font-bold rounded-2xl transition-all active:scale-95 disabled:opacity-50"
              style={{ height: 50, background: '#58a6ff', color: '#ffffff', fontSize: '0.9rem', boxShadow: '0 4px 15px rgba(88,166,255,0.3)', border: 'none', cursor: 'pointer' }}
            >
              Login
            </button>
            {accounts.length > 0 && (
              <button
                onClick={handleClearToken}
                className="px-8 font-sora font-bold rounded-2xl border border-[#f78166]/30 text-[#f78166] hover:bg-[#f78166]/10 transition-all active:scale-95"
                style={{ height: 50, fontSize: '0.9rem', background: 'none', cursor: 'pointer' }}
              >
                Logout All
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ═══ Data Backup ═══ */}
      <div className="glass-static" style={{ borderRadius: 24, padding: '1.5rem', marginBottom: '1.5rem' }}>
        <h3 className="text-[#e6edf3] font-bold text-sm mb-4 flex items-center gap-2">
          <span>💾</span> Data Backup & Restore
        </h3>
        <p className="text-xs text-[#8b949e] mb-4 leading-relaxed">Securely backup and restore all your data including collections, apps, notifications, and developers to a local file.</p>

        <div className="flex gap-3">
          <button
            onClick={exportBackup}
            className="flex-1 font-sora font-semibold py-3 rounded-xl transition-all cursor-pointer active:scale-95 text-[#58a6ff] border border-[#58a6ff]/30 bg-[#58a6ff]/10 hover:bg-[#58a6ff]/20"
          >
            ↑ Export Backup
          </button>
          <button
            onClick={importBackup}
            className="flex-1 font-sora font-semibold py-3 rounded-xl transition-all cursor-pointer active:scale-95 text-[#3fb950] border border-[#3fb950]/30 bg-[#3fb950]/10 hover:bg-[#3fb950]/20"
          >
            ↓ Import Backup
          </button>
        </div>
      </div>

      {/* ═══ GitSync Wrapped ═══ */}
      <div className="glass-static" style={{ borderRadius: 24, padding: '1.5rem', marginBottom: '1.5rem', border: '1px solid rgba(227,179,65,0.15)', background: 'linear-gradient(135deg, rgba(227,179,65,0.03), rgba(210,168,255,0.03))' }}>
        <h3 className="text-[#e6edf3] font-bold text-sm mb-3 flex items-center gap-2">
          <span>🎁</span> GitShelf Wrapped
        </h3>
        <p className="text-xs text-[#8b949e] mb-4 leading-relaxed">See your GitShelf year in review — discover stats about your tracked repos, favorite languages, and top developers.</p>
        <button
          onClick={() => onShowWrapped?.()}
          className="w-full font-sora font-bold py-3.5 rounded-xl transition-all cursor-pointer active:scale-95 text-[#e3b341] border border-[#e3b341]/30 bg-[#e3b341]/10 hover:bg-[#e3b341]/20 text-sm"
        >
          🎉 View My Wrapped
        </button>
      </div>

      {/* ═══ Appearance ═══ */}
      <div className="glass-static" style={{ borderRadius: 24, padding: '1.5rem', marginBottom: '1.5rem' }}>
        <h3 className="text-[#e6edf3] font-bold text-sm mb-4 flex items-center gap-2">
          <span>🎨</span> {t('appearance')}
        </h3>

        <p className="text-[10px] text-[#6e7681] uppercase tracking-[0.1em] font-bold mb-3">{t('theme')}</p>
        <div className="grid grid-cols-2 gap-2 mb-5">
          {[
            { id: 'midnight', label: 'Midnight', color: '#0a0e14', accent: '#0f1318' },
            { id: 'amoled', label: 'AMOLED', color: '#0f141d', accent: '#121821' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => switchTheme(t.id)}
              className="flex flex-col items-center gap-2 p-3 rounded-xl transition-all"
              style={{
                background: theme === t.id ? 'rgba(88,166,255,0.1)' : 'rgba(255,255,255,0.03)',
                border: `1.5px solid ${theme === t.id ? 'rgba(88,166,255,0.4)' : 'rgba(255,255,255,0.08)'}`,
                cursor: 'pointer',
              }}
            >
              <div className="flex gap-1">
                <div style={{ width: 16, height: 16, borderRadius: 4, background: t.color, border: '1px solid rgba(0,0,0,0.1)' }} />
                <div style={{ width: 16, height: 16, borderRadius: 4, background: t.accent, border: '1px solid rgba(0,0,0,0.1)' }} />
              </div>
              <span style={{ fontSize: '0.68rem', color: theme === t.id ? '#58a6ff' : '#8b949e', fontWeight: 600 }}>{t.label}</span>
            </button>
          ))}
        </div>

        {/* Notification Monitoring Toggle */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/5 mb-4">
          <div className="flex-1">
            <h4 className="text-sm font-bold text-[#e6edf3]">Background Monitoring</h4>
            <p className="text-[11px] text-[#8b949e]">Check for updates every 5 minutes.</p>
          </div>
          <button
            onClick={toggleNotif}
            className={`w-12 h-6 rounded-full transition-all relative ${notifEnabled ? 'bg-[#58a6ff]' : 'bg-gray-700'}`}
          >
            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${notifEnabled ? 'right-1' : 'left-1'}`} />
          </button>
        </div>


      </div>


      {/* ═══ Data Management ═══ */}
      <div className="glass-static" style={{ borderRadius: 24, padding: '1.5rem', marginBottom: '1.5rem' }}>
        <h3 className="text-[#e6edf3] font-bold text-sm mb-4 flex items-center gap-2">
          <span>🧹</span> {t('system')} & Clean Up
        </h3>

        <div className="flex gap-3">
          <button
            onClick={clearReadmeCache}
            className="flex-1 font-sora font-semibold py-3 rounded-xl transition-all active:scale-95"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#8b949e', fontSize: '0.8rem', cursor: 'pointer' }}
          >
            🧹 Clear Cache
          </button>
          <button
            onClick={() => setShowResetModal(true)}
            className="flex-1 font-sora font-semibold py-3 rounded-xl transition-all active:scale-95"
            style={{ background: 'rgba(247,129,102,0.08)', border: '1px solid rgba(247,129,102,0.2)', color: '#f78166', fontSize: '0.8rem', cursor: 'pointer' }}
          >
            <span className="flex items-center justify-center gap-2"><TrashIcon size={14} color="#f78166" /> Reset App</span>
          </button>
        </div>
      </div>


      {/* Custom Reset Modal */}
      <AnimatePresence>
        {showResetModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[5000] bg-[#0f141d]/80 backdrop-blur-md"
              onClick={() => setShowResetModal(false)}
            />
            <div className="fixed inset-0 z-[5001] flex items-center justify-center p-6 pointer-events-none">
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="w-full max-w-xs glass-static p-8 rounded-[32px] border border-white/10 shadow-2xl pointer-events-auto text-center"
              >
                <div className="w-16 h-16 rounded-2xl bg-[#f78166]/10 flex items-center justify-center mx-auto mb-6">
                  <TrashIcon size={32} color="#f78166" />
                </div>

                <h3 className="font-sora font-bold text-xl text-[#e6edf3] mb-2">Clear all data?</h3>
                <p className="text-sm text-[#8b949e] mb-8 leading-relaxed">This will permanently delete your collections, history, and settings. This cannot be undone.</p>

                <div className="space-y-3">
                  <button
                    onClick={confirmClearAllData}
                    className="w-full py-4 rounded-2xl bg-[#f78166] text-white font-sora font-bold text-sm active:scale-95 transition-all cursor-pointer shadow-lg shadow-[#f78166]/20 border-none"
                  >
                    Yes, Delete Everything
                  </button>
                  <button
                    onClick={() => setShowResetModal(false)}
                    className="w-full py-4 rounded-2xl bg-white/5 border border-white/10 text-[#8b949e] font-sora font-bold text-sm active:scale-95 transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>


      <div className="mt-10 mb-6 text-center">
        <div className="text-[9px] text-[#484f58]">Designed for high-performance GitHub discovery</div>
      </div>
    </div>
  );
};

export default SettingsPage;
