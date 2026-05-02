import { RecentViewItem } from '../components/RecentlyViewedPage';

const MAX_RECENT_ITEMS = 30;

export const trackRecentView = (item: Omit<RecentViewItem, 'timestamp'>) => {
  try {
    const recent: RecentViewItem[] = JSON.parse(localStorage.getItem('gitspace_recent_views') || '[]');
    
    // Remove if already exists (to move it to top)
    const filtered = recent.filter(r => !(r.id === item.id && r.type === item.type));
    
    const newEntry: RecentViewItem = {
      ...item,
      timestamp: Date.now()
    };
    
    filtered.unshift(newEntry);
    
    // Keep only the most recent N items
    const limited = filtered.slice(0, MAX_RECENT_ITEMS);
    
    localStorage.setItem('gitspace_recent_views', JSON.stringify(limited));
    // Dispatch event so the UI can update if it's already open
    window.dispatchEvent(new Event('gitspace_recent_views_updated'));
  } catch (e) {
    console.error('Failed to track recent view', e);
  }
};
