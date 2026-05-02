import { StatusBar } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';

export const setImmersiveMode = async (enabled: boolean) => {
  if (Capacitor.getPlatform() !== 'android') return;

  try {
    if (enabled) {
      // Hide status bar for a "cleaner" look
      // Note: Full system navigation bar hide is usually handled in capacitor.config.ts 
      // or custom native code in Android Studio.
      await StatusBar.hide();
    } else {
      await StatusBar.show();
    }
  } catch (e) {
    console.error('StatusBar error:', e);
  }
};

export const initImmersiveMode = () => {
  const isEnabled = localStorage.getItem('is_immersive_mode') === 'true';
  setImmersiveMode(isEnabled);
};
