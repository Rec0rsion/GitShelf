import { useState, useCallback, useEffect } from 'react';
import { downloadFile, DownloadTask } from '../utils/DownloadManager';
import { registerPlugin, Capacitor } from '@capacitor/core';

const GitSyncNative = registerPlugin<any>('GitSyncNative');

export const useDownloadManager = () => {
  const [downloads, setDownloads] = useState<DownloadTask[]>([]);

  // Sync with native downloads on mount
  useEffect(() => {
    if (Capacitor.getPlatform() !== 'android') return;

    const syncDownloads = async () => {
      try {
        const res = await GitSyncNative.getActiveDownloads();
        if (res && res.downloads) {
          setDownloads(res.downloads.map((d: any) => ({
            id: d.downloadId,
            filename: d.filename,
            url: '',
            progress: d.totalBytes > 0 ? Math.round((d.bytesDownloaded / d.totalBytes) * 100) : 0,
            downloadedBytes: d.bytesDownloaded,
            totalBytes: d.totalBytes,
            status: d.status === 'RUNNING' ? 'downloading' : 'waiting'
          })));
        }
      } catch (e) {}
    };

    const progressSub = GitSyncNative.addListener('downloadProgress', (data: any) => {
      setDownloads(prev => {
        const existing = prev.find(t => t.id === data.downloadId || t.filename === data.filename);
        if (existing) {
          return prev.map(t => (t.id === data.downloadId || t.filename === data.filename) ? {
            ...t,
            id: data.downloadId,
            progress: data.progress,
            downloadedBytes: data.bytesDownloaded,
            totalBytes: data.totalBytes,
            status: data.status === 'SUCCESS' ? 'done' : 
                    data.status === 'FAILED' ? 'error' : 'downloading'
          } : t);
        } else {
          // New task detected from native side
          return [...prev, {
            id: data.downloadId,
            filename: data.filename,
            url: '',
            progress: data.progress,
            downloadedBytes: data.bytesDownloaded,
            totalBytes: data.totalBytes,
            status: 'downloading'
          }];
        }
      });
    });

    const completeSub = GitSyncNative.addListener('downloadComplete', (data: any) => {
      setDownloads(prev => prev.map(t => (t.id === data.downloadId || t.filename === data.filename) ? {
        ...t,
        progress: 100,
        status: 'done',
        localUri: data.path
      } : t));
    });

    syncDownloads();
    return () => {
      progressSub.remove();
      completeSub.remove();
    };
  }, []);

  const startDownload = useCallback((url: string, filename: string) => {
    const taskId = Date.now().toString();

    const initialTask: DownloadTask = {
      id: taskId,
      filename,
      url,
      progress: 0,
      status: 'waiting',
      totalBytes: 0,
      downloadedBytes: 0,
    };

    setDownloads(prev => [...prev, initialTask]);

    downloadFile(
      url,
      filename,
      (updatedTask) => {
        setDownloads(prev => {
          const exists = prev.some(t => t.id === updatedTask.id || t.filename === updatedTask.filename);
          if (exists) {
            return prev.map(t => (t.id === updatedTask.id || t.filename === updatedTask.filename) ? updatedTask : t);
          }
          return [...prev, updatedTask];
        });
      },
      taskId,
    );
  }, []);

  const clearCompleted = useCallback(() => {
    setDownloads(prev =>
      prev.filter(t => t.status !== 'done' && t.status !== 'error')
    );
  }, []);

  const removeDownload = useCallback((filename: string) => {
    setDownloads(prev => prev.filter(t => t.filename !== filename));
  }, []);

  return { downloads, startDownload, clearCompleted, removeDownload };
};

