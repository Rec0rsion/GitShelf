import React, { useState, useEffect } from 'react';

interface PinLockProps {
  onUnlock: () => void;
}

const PinLock: React.FC<PinLockProps> = ({ onUnlock }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const correctPin = localStorage.getItem('gitspace_app_pin') || '0000';

  const handlePress = (num: string) => {
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
      if (newPin.length === 4) {
        if (newPin === correctPin) {
          onUnlock();
        } else {
          setError(true);
          setTimeout(() => {
            setPin('');
            setError(false);
          }, 600);
        }
      }
    }
  };

  const handleBackspace = () => {
    setPin(pin.slice(0, -1));
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-[var(--bg-primary)] flex flex-col items-center justify-center p-6 animate-fadeIn">
      {/* Header */}
      <div className="mb-12 text-center animate-fadeInUp">
        <div className="glass-static mx-auto flex items-center justify-center mb-6" style={{ width: 64, height: 64, borderRadius: 20 }}>
          <span style={{ fontSize: '2rem' }}>🔐</span>
        </div>
        <h2 className="font-sora font-bold text-xl text-[hsl(var(--text-primary))] mb-2">Application Locked</h2>
        <p className="text-sm text-[hsl(var(--text-muted))]">Enter your 4-digit PIN to continue</p>
      </div>

      {/* Dots */}
      <div className={`flex gap-4 mb-16 ${error ? 'animate-shake' : ''}`}>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="transition-all duration-200"
            style={{
              width: 16, height: 16, borderRadius: '50%',
              background: pin.length > i ? (error ? '#f78166' : 'var(--accent-primary)') : 'var(--glass-border)',
              boxShadow: pin.length > i ? `0 0 12px ${error ? '#f78166' : 'var(--accent-primary)'}` : 'none',
              transform: pin.length > i ? 'scale(1.2)' : 'scale(1)',
            }}
          />
        ))}
      </div>

      {/* Keypad */}
      <div className="grid grid-cols-3 gap-6 w-full max-w-[280px] animate-fadeInUp-2">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((n) => (
          <button
            key={n}
            onClick={() => handlePress(n)}
            className="glass-static flex items-center justify-center font-sora font-bold transition-all active:scale-90"
            style={{ width: 64, height: 64, borderRadius: '50%', fontSize: '1.4rem', color: 'hsl(var(--text-primary))', border: 'none', cursor: 'pointer' }}
          >
            {n}
          </button>
        ))}
        <div />
        <button
          onClick={() => handlePress('0')}
          className="glass-static flex items-center justify-center font-sora font-bold transition-all active:scale-90"
          style={{ width: 64, height: 64, borderRadius: '50%', fontSize: '1.4rem', color: 'hsl(var(--text-primary))', border: 'none', cursor: 'pointer' }}
        >
          0
        </button>
        <button
          onClick={handleBackspace}
          className="flex items-center justify-center transition-all active:scale-90"
          style={{ width: 64, height: 64, borderRadius: '50%', border: 'none', background: 'none', cursor: 'pointer' }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--text-dim))" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" /><line x1="18" y1="9" x2="12" y2="15" /><line x1="12" y1="9" x2="18" y2="15" />
          </svg>
        </button>
      </div>

      <button
        className="mt-12 text-[var(--accent-primary)] text-xs font-bold font-sora hover:underline cursor-pointer bg-transparent border-none"
        onClick={() => {
          if (confirm('Reset PIN? This will log you out and clear current session data.')) {
            localStorage.removeItem('gh_token');
            localStorage.removeItem('gitspace_app_pin');
            localStorage.removeItem('gitspace_lock_enabled');
            window.location.reload();
          }
        }}
      >
        FORGOT PIN?
      </button>
    </div>
  );
};

export default PinLock;
