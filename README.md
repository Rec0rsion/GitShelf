# 🌌 GitShelf — The Premium Open-Source Hub

**GitShelf** is a high-fidelity, glassmorphism-inspired mobile explorer for GitHub. It goes beyond simple discovery by providing deep integrations for developers and code enthusiasts. 

---

## ✨ Latest Features (New Updates!)

We've completely overhauled GitShelf. Here are the **brand new features** introduced in this release:

### 🧑‍💻 1. Deep Developer Tooling & Repo Insights
*   **Repository Insights:** Comprehensive analytical view of a repository's health, contributor stats, and lifecycle (`RepoInsights.tsx`).
*   **Issues & PR Tracker:** A dedicated Kanban-style view to explore active tickets, read issue descriptions, and track repository bugs right from your mobile device (`IssuesPRTab.tsx`).
*   **PR Review Screen:** Dive deep into Pull Requests, view diffs, and approve/comment natively (`PRReviewScreen.tsx`).
*   **Repo vs. Repo Compare:** Unsure which library to use? Use the `CompareTab.tsx` to pit two repositories head-to-head on stars, forks, issues, and activity.

### 🤝 2. Communication & Developer Networking
*   **Global Activity Feed:** Stay updated with your network's latest stars, forks, and pushes via a clean, chronological feed (`ActivityFeed.tsx`).
*   **Developer Profiles:** Rich profile pages (`UserDetailsPage.tsx`) showcasing contribution graphs and top repos.
*   **Direct Messaging (DMs) & Threads:** A fully built communication center to message other developers and collaborate on code directly within GitShelf (`MessageTab.tsx`, `ChatThreadScreen.tsx`).

### 📊 3. GitHub Wrapped
*   **Your Year in Code:** An aesthetic, Spotify-style `GitHubWrapped.tsx` component that recaps your commits, most-used languages, and developer impact over the year in a shareable format.

---

## 🎨 Design & Aesthetic Details

*   **✨ Glassmorphism Core:** Heavy backdrop blurs (32px), translucent borders, and subtle glows define the "frosted glass" aesthetic.
*   **⚙️ Haptic Engine:** Capacitor haptics provide selection, impact, and success feedback at every touch point.
*   **🎭 Motion Design:** `Framer Motion` powers organic spring physics, skeleton loaders (`SkeletonLoader.tsx`), and staggered "fade-in-up" animations.

---

## 🛠️ Installation & Building

1.  **Clone & Install dependencies**:
    ```bash
    git clone https://github.com/your-username/gitshelf.git
    cd gitshelf
    npm install
    # or bun install
    ```

2.  **Run Development Server**:
    ```bash
    npm run dev
    ```

3.  **Build Mobile (Capacitor for Android/iOS)**:
    ```bash
    npm run build
    npx cap sync
    npx cap open android
    ```

---

*Built with ❤️ utilizing React, Tailwind CSS, Radix UI, Framer Motion, and Vite.*
