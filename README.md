# 🌌 GitShelf — The Premium Open-Source Hub

---
![Logo](https://imagur.org/i/1Ijd5r4K)

## 📱 Feature 

### 🏠 1. Home Feed (The Discovery Engine)
The Home tab is designed as an addictive, discovery-first feed for code.

*   **⚡ Quick Stats Dashboard**: Three interactive floating cards at the top:
    *   **Trending Button**: Instantly jump to what's hot across GitHub.
    *   **Downloads Button**: Access your local repository assets and APKs.
    *   **Recent Button**: Browse your recently viewed feed.
*   **🔍 Advanced Search Bar**:
    *   **Mode Toggle**: Specifically designed buttons to switch between **Repo** search and **User** search.
    *   **Dynamic Placeholder**: Changes based on search mode (`Search repo...` vs `Search users...`).
    *   **Clear Button**: Instant reset of search queries.
*   **🔥 New Releases Carousel**: A horizontal scrolling section that highlights repositories you track which have fresh updates or tags.
*   **🏷️ Topic Chips**: Minimalist text-only navigation for quick filtering:
    *   `All`, `Android`, `Windows`, `MacOS`, `Linux`.
*   **📊 Filter & Sort Bar**:
    *   **Language Selector**: Drill down into specific stacks (Kotlin, Rust, Go, TypeScript, etc.) via a smooth slide-up bottom sheet.
    *   **Sort Logic**: Choose between `Stars`, `Forks`, `Updated`, or `Best Match`.
*   **🎴 Style Cards**: High-fidelity cards featuring:
    *   **Language Watermarks**: Massive, faded background text indicating the primary language.
    *   **Ambient Glow**: Radial gradients matching the language's signature color.
    *   **Floating Sidebar Actions**: 
        *   `Save` (Bookmark): Add to your private collection.
        *   `Notify` (Bell): Subscribe to future release alerts.
    *   **Haptic Icons**: Every interaction triggers a light vibration feedback.

---

### 📦 2. App Store (Release Explorer)
A specialized tab for finding ready-to-use open-source applications.

*   **💻 Platform Filter Tabs**: Segregate apps by `Android`, `Windows`, `Mac`, or `Linux`.
*   **📥 Native Download Manager**:
    *   **Download Sheet**: A slide-up panel showing all available assets for a release.
    *   **Platform Badges**: Automatic detection of file types with custom icons (APK icon for Android, Windows logo for EXE).
    *   **Progress Tracking**: Real-time percentage indicators inside the "GET" button.
*   **📈 App Sorting**: Sort by `Most Stars`, `Most Downloads`, `Recently Updated`, or `Newest Release`.
*   **🔄 Silent Refresh**: System automatically updates the app list in the background to ensure you see the latest versions.

---

### 🔖 3. Collection & Saved
Your personal library, curated and organized.

*   **📁 Organized Folders**: Group your saved repositories into custom categories (e.g., "Tools", "Games").
*   **👀 Watched Users**: Monitor influential developers and get notified when they create new repositories.
*   **📤 Import/Export**: Share your entire collection with others using a simple Base64 string link.

---

### 🔔 4.  Notifications
Never miss a code update again.

*   **🔄 5-Minute Sync**: Background process checks for new releases every 5 minutes.
*   **📲 Push Alerts**: Receive native system notifications for new tags or releases.
*   **🔴 Unread Badges**: Real-time notification bubbles on the navigation bar.

---

### ⌨️ 5. Power User Features

*   **🕒 Recently Viewed**: A dedicated side-panel showing every repository, app, and user you've interacted with recently.
*   **🧬 Deep Linking**: Click a `github.com` link in your browser, and GitShelf will automatically handle it natively.
*   **📊 GitHub Wrapped**: A beautiful analytical summary of your year on GitHub (if logged in).

---

### ⚙️ 6. Settings & Customization
*   **🎨 Accent Colors**: Choose your signature color (Blue, Green, Orange, Purple, Pink).
*   **🌑 Midnight Theme**: Optimized for OLED screens with deep blacks and vibrant gradients.
*   **🔑 API Management**: Input your GitHub Token to increase rate limits to 5000 req/hr.

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
