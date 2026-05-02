interface GhConversation {
  id: number;
  number: number;
  title: string;
  body: string;
  html_url: string;
  repository_url: string;
  created_at: string;
  updated_at: string;
  user: {
    login: string;
    avatar_url: string;
  };
  comments: number;
}

interface GhMessage {
  id: number;
  body: string;
  created_at: string;
  user: {
    login: string;
    avatar_url: string;
  };
}

const DEFAULT_CENTRAL_REPO = 'Algo4ithm/gitspace-inbox';

export const chatEngine = {
  getToken: () => localStorage.getItem('gh_token'),

  getHeaders: () => {
    const token = chatEngine.getToken();
    return {
      'Accept': 'application/vnd.github.v3+json',
      ...(token ? { 'Authorization': `token ${token}` } : {})
    };
  },

  getInboxMode: (): 'personal' | 'central' => {
    return (localStorage.getItem('chat_inbox_mode') as 'personal' | 'central') || 'central';
  },

  setInboxMode: (mode: 'personal' | 'central') => {
    localStorage.setItem('chat_inbox_mode', mode);
    window.dispatchEvent(new Event('chat_settings_updated'));
  },

  getInboxRepo: async () => {
    const mode = chatEngine.getInboxMode();
    if (mode === 'central') return DEFAULT_CENTRAL_REPO;
    
    // Personal mode: uses user's own repo named 'gitspace-inbox'
    const user = await chatEngine.getCurrentUser();
    return `${user.login}/gitspace-inbox`;
  },

  getCurrentUser: async () => {
    const token = chatEngine.getToken();
    if (!token) throw new Error('Not authenticated');
    const res = await fetch('https://api.github.com/user', { headers: chatEngine.getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch user');
    return res.json();
  },

  initInbox: async () => {
    const mode = chatEngine.getInboxMode();
    if (mode === 'central') return true;

    // Check if personal repo exists, if not, offer to create it? 
    // For now, just check if reachable.
    try {
      const repo = await chatEngine.getInboxRepo();
      const res = await fetch(`https://api.github.com/repos/${repo}`, { headers: chatEngine.getHeaders() });
      if (res.status === 404) {
        throw new Error(`Personal inbox repository not found: ${repo}. Please create it to use personal mode.`);
      }
      return true;
    } catch (err) {
      throw err;
    }
  },

  createPersonalInbox: async () => {
    const res = await fetch(`https://api.github.com/user/repos`, {
      method: 'POST',
      headers: chatEngine.getHeaders(),
      body: JSON.stringify({
        name: 'gitspace-inbox',
        description: 'GitSpace Chat Inbox (Backend)',
        private: false,
        has_issues: true
      })
    });
    if (!res.ok) throw new Error('Failed to create personal inbox repository');
    return res.json();
  },

  fetchConversations: async (myLogin: string): Promise<GhConversation[]> => {
    const repo = await chatEngine.getInboxRepo();
    // Use search to find conversations (issues) involves the user
    // We use a specific tag or title prefix to identify chat issues
    const query = encodeURIComponent(`repo:${repo} is:issue involves:${myLogin} "[Chat]" in:title sort:updated-desc`);
    const res = await fetch(`https://api.github.com/search/issues?q=${query}`, {
      headers: chatEngine.getHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch conversations');
    const data = await res.json();
    return data.items || [];
  },

  fetchMessages: async (issueNumber: number): Promise<GhMessage[]> => {
    const repo = await chatEngine.getInboxRepo();
    const issueRes = await fetch(`https://api.github.com/repos/${repo}/issues/${issueNumber}`, {
      headers: chatEngine.getHeaders()
    });
    if (!issueRes.ok) throw new Error('Failed to fetch conversation');
    const issue = await issueRes.json();

    let comments = [];
    if (issue.comments > 0) {
      const commentsRes = await fetch(issue.comments_url, {
        headers: chatEngine.getHeaders()
      });
      if (commentsRes.ok) {
        comments = await commentsRes.json();
      }
    }

    return [issue, ...comments];
  },

  sendMessage: async (targetUsername: string, text: string, existingIssueNumber?: number) => {
    const user = await chatEngine.getCurrentUser();
    const repo = await chatEngine.getInboxRepo();

    if (existingIssueNumber) {
      const url = `https://api.github.com/repos/${repo}/issues/${existingIssueNumber}/comments`;
      const res = await fetch(url, {
        method: 'POST',
        headers: chatEngine.getHeaders(),
        body: JSON.stringify({ body: text })
      });
      if (!res.ok) throw new Error('Failed to send message');
      return res.json();
    } else {
      const title = `[Chat] ${user.login} & ${targetUsername}`;
      const res = await fetch(`https://api.github.com/repos/${repo}/issues`, {
        method: 'POST',
        headers: chatEngine.getHeaders(),
        body: JSON.stringify({
          title,
          body: text,
          labels: ['chat']
        })
      });

      if (!res.ok) {
        throw new Error('Failed to start conversation');
      }
      return res.json();
    }
  }
};
