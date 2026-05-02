const fs = require('fs');
const files = [
  'src/components/TrendingTab.tsx',
  'src/components/RepoInsights.tsx',
  'src/components/RepoOpener.tsx',
  'src/components/NotificationsPage.tsx',
  'src/components/IssuesPRTab.tsx',
  'src/components/HomeTab.tsx',
  'src/components/GetStartedPage.tsx',
  'src/components/FeedTab.tsx',
  'src/components/ExplorerTab.tsx',
  'src/components/CalendarTab.tsx',
  'src/components/AppsTab.tsx',
  'src/components/AppDetailPage.tsx',
  'src/components/ActivityFeed.tsx'
];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, 'utf-8');
  let madeChanges = false;
  content = content.replace(/<div className="([^"]*animate-spin[^"]*)"\s*\/>/g, (match, classes) => {
    // skip anything that shouldn't be replaced
    if (match.includes('isRefreshing ?')) return match; 
    
    const sizeMatch = classes.match(/(w-\d+|h-\d+|absolute|inset-0|flex|justify-center|py-\d+)/g);
    let sizeClasses = sizeMatch ? sizeMatch.join(' ') : 'w-8 h-8';
    
    // filter duplicates
    sizeClasses = [...new Set(sizeClasses.split(' '))].join(' ');
    
    const colorMatch = classes.match(/\[#([A-Fa-f0-9]+)\]/);
    let colorClass = colorMatch ? `text-[#${colorMatch[1]}]` : 'text-white';
    if (classes.includes('border-t-white') || classes.includes('border-white')) {
      colorClass = 'text-white';
    }

    let extraClasses = '';
    if (classes.includes('shadow')) {
      const shadowMatch = classes.match(/(shadow-\[[^\]]*\])/);
      if (shadowMatch) extraClasses = ' ' + shadowMatch[1];
    }
    
    madeChanges = true;
    return `<div className="${sizeClasses} ${colorClass} loader${extraClasses}" />`;
  });
  
  if (madeChanges) {
    fs.writeFileSync(file, content);
    console.log('Updated ' + file);
  }
}
