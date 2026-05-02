import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Share } from '@capacitor/share';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor, registerPlugin } from '@capacitor/core';

// Static Registration: Ensures the plugin is recognized immediately on Android
const GitSyncNative = registerPlugin<any>('GitSyncNative');

/**
 * GitSync Native Bridge
 * Provides a unified, safe API for Capacitor native features
 * with graceful degradation in web environments.
 */
export const Native = {
  /**
   * Verify Bridge Connectivity
   */
  ping: async () => {
    if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
      try {
        const res = await GitSyncNative.ping();
        return true;
      } catch (e) {
        // Silently fail, it just means we are in a non-native or dev environment
        return false;
      }
    }
    return true; // Web is always 'connected'
  },

  /**
   * Share JSON or Text Data as a File
   */
  shareFile: async (filename: string, text: string) => {
    if (Capacitor.isNativePlatform()) {
      try {
        await Share.share({
          title: filename,
          text: text,
          dialogTitle: 'Export Backup'
        });
      } catch (e) {
         console.error('File share failed', e);
      }
    } else {
      const blob = new Blob([text], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
    }
  },

  /**
   * Trigger a tactile vibration (Haptic Feedback)
   */
  vibrate: async (style: 'Light' | 'Medium' | 'Heavy' | 'Success' | 'Warning' | 'Error' | 'Selection' = 'Light') => {
    if (!Capacitor.isNativePlatform()) return;
    try {
      const { NotificationType } = await import('@capacitor/haptics');
      if (style === 'Success') await Haptics.notification({ type: NotificationType.Success });
      else if (style === 'Warning') await Haptics.notification({ type: NotificationType.Warning });
      else if (style === 'Error') await Haptics.notification({ type: NotificationType.Error });
      else if (style === 'Selection') await Haptics.selectionStart();
      else if (style === 'Heavy') await Haptics.impact({ style: ImpactStyle.Heavy });
      else if (style === 'Medium') await Haptics.impact({ style: ImpactStyle.Medium });
      else await Haptics.impact({ style: ImpactStyle.Light });
    } catch (e) {}
  },

  hapticSuccess: () => Native.vibrate('Success'),
  hapticError: () => Native.vibrate('Error'),
  hapticSelection: () => Native.vibrate('Selection'),
  hapticImpact: (style: 'Light' | 'Medium' | 'Heavy' = 'Light') => Native.vibrate(style),
  
  /**
   * Open the native Android share sheet
   */
  shareRepo: async (title: string, text: string, url: string) => {
    if (Capacitor.isNativePlatform()) {
      try {
        await Share.share({
          title,
          text,
          url,
          dialogTitle: 'Share Repository'
        });
      } catch (e) {
        console.error('Native sharing failed', e);
      }
    } else {
      // Web fallback
      if (typeof navigator !== 'undefined' && navigator.share) {
        try {
          await navigator.share({ title, text, url });
        } catch (e) {
          console.warn('Web Share API aborted or failed', e);
        }
      } else {
        // Ultimate fallback: Copy to clipboard
        try {
          await navigator.clipboard.writeText(url);
          window.dispatchEvent(new CustomEvent('gitspace_toast', { 
            detail: { message: 'Link copied to clipboard!', type: 'success' } 
          }));
        } catch (e) {}
      }
    }
  },

  /**
   * Schedule or trigger a local Android notification
   */
  notify: async (title: string, body: string, id: number = Math.floor(Math.random() * 10000), extra: any = null) => {
    if (Capacitor.isNativePlatform()) {
      try {
        let perm = await LocalNotifications.checkPermissions();
        if (perm.display !== 'granted') {
          perm = await LocalNotifications.requestPermissions();
        }

        if (perm.display === 'granted') {
          try {
            await LocalNotifications.registerActionTypes({
              types: [
                {
                  id: 'NEW_RELEASE',
                  actions: [
                    { id: 'view', title: 'View Update' }
                  ]
                }
              ]
            });
          } catch (registerError) {
            console.warn('Could not register action types', registerError);
          }

          const largeBody = extra?.body ? extra.body.substring(0, 150).replace(/[#*`_\[\]]/g, '') + '...' : undefined;

          await LocalNotifications.schedule({
            notifications: [
              {
                title,
                body,
                largeBody: largeBody || body,
                summaryText: 'Release Update',
                id,
                schedule: { at: new Date(Date.now() + 200) },
                sound: 'default',
                actionTypeId: 'NEW_RELEASE',
                extra: extra,
                smallIcon: 'ic_stat_name', // Ensure these exist in Android resources
                iconColor: 'var(--accent-primary)'
              }
            ]
          });
        }
      } catch (e) {
        console.error('Failed to trigger native notification', e);
      }
    } else {
      // Web Browser notifications fallback
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        new Notification(title, { body });
      } else if (typeof Notification !== 'undefined' && Notification.permission !== 'denied') {
        const perm = await Notification.requestPermission();
        if (perm === 'granted') {
          new Notification(title, { body });
        }
      }
    }
  },

  /**
   * Request storage permissions from the user
   */
  requestStoragePermission: async () => {
    if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
      try {
        const res = await GitSyncNative.requestStoragePermission();
        return !!res.granted;
      } catch (e) {
        console.error('Failed to request storage permission:', e);
        return false;
      }
    }
    return true; 
  },

  downloadAsset: async (url: string, filename: string) => {
    if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
      try {
        if (GitSyncNative?.downloadFile) {
          // Priority: Native background download
          const result = await GitSyncNative.downloadFile({ url, filename });
          if (result && result.started) return true;
        }
      } catch (e) {
        console.warn('Native download plugin error', e);
      }
      
      // Secondary fallback (External Browser)
      try {
        const { Browser } = await import('@capacitor/browser');
        await Browser.open({ url });
        return true;
      } catch (e2) {
        window.open(url, '_system');
        return true;
      }
    } else {
      try {
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        link.setAttribute('target', '_blank');
        document.body.appendChild(link);
        link.click();
        setTimeout(() => document.body.removeChild(link), 100);
        return true;
      } catch (e) {
        window.open(url, '_blank');
        return true;
      }
    }
  },

  /**
   * Open a downloaded file from the native filesystem
   * On Android: uses native FileProvider to open apps or files
   */
  openFile: async (path: string) => {
    if (!path) return false;
    
    if (Capacitor.getPlatform() === 'android' && GitSyncNative?.openFile) {
      try {
        await GitSyncNative.openFile({ path });
        return true;
      } catch (e) {
        console.error('Native openFile failed', e);
      }
    }
    
    // Fallback: if it's a URL, open in browser
    if (path.startsWith('http')) {
      window.open(path, '_blank');
      return true;
    }

    window.dispatchEvent(new CustomEvent('gitspace_toast', {
      detail: { message: `Opening: ${path.split('/').pop()}`, type: 'success' }
    }));
    return true;
  },

  installApk: async (path: string) => {
    if (!path) return false;
    
    if (Capacitor.getPlatform() === 'android' && GitSyncNative?.installApk) {
      try {
        await GitSyncNative.installApk({ path });
        return true;
      } catch (e) {
        console.error('Native installApk failed', e);
      }
    }
    return false;
  },

  /**
   * Open the Android Storage Access Framework (SAF) folder picker
   */
  pickFolder: async () => {
    if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
      try {
        const res = await GitSyncNative.pickFolder();
        return res; // { path: string, uri: string }
      } catch (e) {
        console.error('Pick folder failed', e);
        return null;
      }
    }
    return null;
  },
};
