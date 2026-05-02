// ──────────────────────────────────────────────────────
//  fetchGitHubApps.ts — Multi-Platform App Discovery
//  Android · Windows · macOS · Linux — NO iOS, NO AAB
// ──────────────────────────────────────────────────────

export interface GHAsset {
  name: string;
  browser_download_url: string;
  size: number;
  download_count: number;
}

export interface AppPlatforms {
  android: GHAsset[];
  windows: GHAsset[];
  macos:   GHAsset[];
  linux:   GHAsset[];
}

export interface GitHubApp {
  id: string;            // owner/repo
  name: string;
  repo: string;
  description: string;
  stars: number;
  version: string;
  publishedAt: string;
  platforms: AppPlatforms;
  icon: string;
  repoUrl: string;
  releaseUrl: string;
  totalDownloads: number;
}

// ── Strict asset classifiers — NO iOS, NO AAB ──────────
const skipAsset = (name: string) => {
  const lower = name.toLowerCase();
  return (
    lower.endsWith('.ipa') ||          // iOS — skip
    lower.endsWith('.aab') ||          // Android bundle — not installable
    lower.includes('ios') ||
    lower.includes('iphone') ||
    lower.includes('ipad')
  );
};

const isAndroid = (name: string) => /\.apk$/i.test(name);
const isWindows  = (name: string) => /\.(exe|msi|msix|appx)$/i.test(name);
const isMacos    = (name: string) => /\.(dmg|pkg)$/i.test(name);
const isLinux    = (name: string) =>
  /\.(deb|rpm|AppImage|snap)$/i.test(name) ||
  /\.tar\.(gz|xz|bz2)$/i.test(name);

const mapAsset = (a: any): GHAsset => ({
  name: a.name,
  browser_download_url: a.browser_download_url,
  size: a.size || 0,
  download_count: a.download_count || 0,
});

const classifyAssets = (raw: any[]): AppPlatforms => {
  const valid = raw.filter(a => !skipAsset(a.name));
  return {
    android: valid.filter(a => isAndroid(a.name)).map(mapAsset),
    windows: valid.filter(a => isWindows(a.name)).map(mapAsset),
    macos:   valid.filter(a => isMacos(a.name)).map(mapAsset),
    linux:   valid.filter(a => isLinux(a.name)).map(mapAsset),
  };
};

const buildApp = (repo: any, release: any): GitHubApp | null => {
  if (!release || release.message) return null;          // no release / API error
  const platforms = classifyAssets(release.assets || []);
  const hasAny =
    platforms.android.length > 0 ||
    platforms.windows.length > 0 ||
    platforms.macos.length > 0   ||
    platforms.linux.length > 0;
  if (!hasAny) return null;

  const login = typeof repo === 'string' ? repo.split('/')[0] : repo.owner?.login;
  const full  = typeof repo === 'string' ? repo : repo.full_name;
  const repoName = typeof repo === 'string' ? repo.split('/')[1] : repo.name;

  // Primary: real GitHub org/user avatar (actual logo like Wikipedia globe, etc.)
  // Fallback (set via onError in UI): DiceBear gradient initials
  const icon = `https://github.com/${login}.png?size=100`;

  return {
    id:   full,
    name: repoName,
    repo: full,
    description: (typeof repo === 'object' ? repo.description : '') || '',
    stars: (typeof repo === 'object' ? repo.stargazers_count : 0) || 0,
    version: release.tag_name || '',
    publishedAt: release.published_at || '',
    platforms,
    icon,
    repoUrl:    `https://github.com/${full}`,
    releaseUrl: release.html_url || `https://github.com/${full}/releases`,
    totalDownloads: (release.assets || []).reduce(
      (s: number, a: any) => s + (a.download_count || 0), 0
    ),
  };
};

const makeHeaders = (token: string): Record<string, string> => {
  const h: Record<string, string> = { Accept: 'application/vnd.github.v3+json' };
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
};

// ── Fetch latest release for a list of repo slugs ──────
export const fetchGitHubApps = async (
  repos: string[],
  token: string,
): Promise<GitHubApp[]> => {
  const headers = makeHeaders(token);
  const settled = await Promise.allSettled(
    repos.map(async repo => {
      const res = await fetch(
        `https://api.github.com/repos/${repo}/releases/latest`,
        { headers }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const release = await res.json();
      return buildApp(repo, release);
    })
  );
  return settled
    .filter(r => r.status === 'fulfilled' && r.value !== null)
    .map((r: any) => r.value as GitHubApp);
};

// ── Discovery: parallel topic/tech searches → releases ──
const DISCOVERY_QUERIES = [
  'topic:android-app',
  'topic:cross-platform',
  'topic:desktop-app',
  'topic:windows-app',
  'topic:macos-app',
  'topic:linux-app',
  'electron app releases',
  'flutter desktop releases',
  'tauri app releases',
  'qt application releases',
];

export const discoverApps = async (
  token: string,
  page = 1,
  perPage = 20
): Promise<GitHubApp[]> => {
  const headers = makeHeaders(token);

  // Run all discovery queries in parallel
  const queryResults = await Promise.allSettled(
    DISCOVERY_QUERIES.map(async q => {
      const res = await fetch(
        `https://api.github.com/search/repositories?q=${encodeURIComponent(
          q + ' stars:>200 is:public archived:false'
        )}&sort=stars&order=desc&per_page=${perPage}&page=${page}`,
        { headers }
      );
      if (!res.ok) return [] as any[];
      const data = await res.json();
      return data.items || [];
    })
  );

  // Merge & deduplicate repo objects
  const seen = new Set<string>();
  const allRepos: any[] = [];
  for (const r of queryResults) {
    if (r.status === 'fulfilled') {
      for (const repo of r.value) {
        if (!seen.has(repo.full_name)) {
          seen.add(repo.full_name);
          allRepos.push(repo);
        }
      }
    }
  }

  if (allRepos.length === 0) return [];

  // Fetch releases in parallel — Promise.allSettled so one 404 won't break others
  const settled = await Promise.allSettled(
    allRepos.map(async repo => {
      const res = await fetch(
        `https://api.github.com/repos/${repo.full_name}/releases/latest`,
        { headers }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const release = await res.json();
      return buildApp(repo, release);
    })
  );

  return settled
    .filter(r => r.status === 'fulfilled' && r.value !== null)
    .map((r: any) => r.value as GitHubApp);
};

// ── User search ─────────────────────────────────────────
export const searchGitHubApps = async (
  query: string,
  token: string,
  page = 1
): Promise<GitHubApp[]> => {
  const headers = makeHeaders(token);

  // Use fewer query variants to reduce API calls and avoid rate limits
  const variants = [
    `${query} stars:>10 is:public archived:false`,
    `${query} topic:android-app OR topic:desktop-app stars:>5 is:public archived:false`,
  ];

  const settled = await Promise.allSettled(
    variants.map(async q => {
      const res = await fetch(
        `https://api.github.com/search/repositories?q=${encodeURIComponent(
          q
        )}&sort=stars&order=desc&per_page=20&page=${page}`,
        { headers }
      );
      if (res.status === 403) throw new Error('403 Rate Limit');
      if (!res.ok) return [] as any[];
      const data = await res.json();
      return data.items || [];
    })
  );

  const seen = new Set<string>();
  const allRepos: any[] = [];
  let rateLimited = false;
  
  for (const r of settled) {
    if (r.status === 'fulfilled') {
      for (const repo of r.value) {
        if (!seen.has(repo.full_name)) {
          seen.add(repo.full_name);
          allRepos.push(repo);
        }
      }
    } else if (r.reason && r.reason.message.includes('403')) {
      rateLimited = true;
    }
  }

  if (rateLimited && allRepos.length === 0) {
    throw new Error('403 GitHub Rate Limit Reached');
  }

  if (allRepos.length === 0) return [];

  // Fetch releases in parallel — use full repo objects so buildApp has stars/description
  const releaseSettled = await Promise.allSettled(
    allRepos.map(async repo => {
      const res = await fetch(
        `https://api.github.com/repos/${repo.full_name}/releases/latest`,
        { headers }
      );
      if (!res.ok) return null;
      const release = await res.json();
      return buildApp(repo, release);
    })
  );

  return releaseSettled
    .filter(r => r.status === 'fulfilled' && r.value !== null)
    .map((r: any) => r.value as GitHubApp);
};

// ── localStorage cache ───────────────────────────────────
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

const cacheKey = (platform: string, query: string) =>
  `gitsync_apps_v5_${platform}_${query || 'discover'}`;

export const getCachedApps = (platform: string, query = ''): GitHubApp[] | null => {
  try {
    const raw = localStorage.getItem(cacheKey(platform, query));
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL) return null;
    return data as GitHubApp[];
  } catch { return null; }
};

export const setCachedApps = (platform: string, query: string, apps: GitHubApp[]) => {
  try {
    localStorage.setItem(cacheKey(platform, query), JSON.stringify({ data: apps, ts: Date.now() }));
  } catch {}
};

export const clearAppsCache = () => {
  try {
    Object.keys(localStorage)
      .filter(k => k.startsWith('gitsync_apps_v5'))
      .forEach(k => localStorage.removeItem(k));
  } catch {}
};
