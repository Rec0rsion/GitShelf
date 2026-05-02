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
  'src/components/ActivityFeed.tsx',
  'src/components/UserDetailsPage.tsx'
];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, 'utf-8');
  
  if (content.includes('loader" />') || content.includes('loader shadow')) {
    // replace div with AppLoader
    content = content.replace(/<div(\s+className="[^"]+?loader(?:[^"]*?)")\s*\/>/g, '<AppLoader$1 />');
    
    // add import if not there
    if (!content.includes('import { AppLoader }')) {
      // Find the last import
      const importRegex = /import\s+.*?;?\n/g;
      let lastIndex = 0;
      let match;
      while ((match = importRegex.exec(content)) !== null) {
        lastIndex = importRegex.lastIndex;
      }
      
      if (lastIndex > 0) {
        content = content.slice(0, lastIndex) + "import { AppLoader } from './AppLoader';\n" + content.slice(lastIndex);
      } else {
        content = "import { AppLoader } from './AppLoader';\n" + content;
      }
    }
    
    fs.writeFileSync(file, content, 'utf-8');
    console.log('Updated ' + file);
  }
}
