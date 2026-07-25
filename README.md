<div align="center">
  <img src="https://img.shields.io/badge/Hyprland-Web_OS-0a0a0f?style=for-the-badge&logo=linux&logoColor=bb9af7" alt="Hyprland Web OS" />
  <img src="https://img.shields.io/badge/Status-Live-a6e3a1?style=for-the-badge" alt="Status Live" />
  <img src="https://img.shields.io/badge/Vanilla-JS_%7C_CSS-f9e2af?style=for-the-badge&logo=javascript" alt="Vanilla JS" />
  <br/>
  <h1>🖥️ Hyprland Web OS Portfolio</h1>
  <p><b>A sleek, premium, and fully interactive personal portfolio designed to mimic a Linux tiling window manager (Hyprland) running directly in your browser.</b></p>
  
  <p>
    <a href="https://tanmaytiwari.me"><strong>View Live Demo »</strong></a>
  </p>
</div>

<br/>

## ✨ About the Project

This project pushes the limits of what a static browser environment can feel like without relying on heavy frameworks like React or Vue. By using purely **Vanilla HTML, CSS, and JavaScript**, this portfolio creates an authentic "Web OS" experience inspired by the famous Linux Wayland compositor, **Hyprland**.

It features a custom window manager, a functional application launcher, dynamic themes, terminal simulations, and beautiful glassmorphism aesthetics.

---

## 🚀 Key Features

*   🪟 **Custom Window Manager:**
    *   Drag and drop floating windows anywhere on the screen.
    *   Z-index sorting: Click a window to bring it to the front.
    *   Maximize, minimize, and close window controls.
    *   Simulated multi-workspace navigation (`1`, `2`, `3`, `4`).
*   ⚡ **Wofi App Launcher:**
    *   Click anywhere on the desktop or use the top-bar button to open the application menu.
    *   Launch simulated apps like Terminal (`whoami`), `btop` System Monitor, Projects, and Tech Stack.
*   📊 **Waybar (Top Panel):**
    *   Dynamic clock and date.
    *   Real-time active window title updates (e.g., `kitty ~ tanmay@hypr: ~/whoami`).
    *   Simulated system tray metrics (CPU, RAM, Network, Battery).
*   🎨 **Dynamic Theming System:**
    *   Switch between beautiful built-in color schemes: **Aurora**, **Abyss**, **Carbon**, and **Neon**.
    *   Instant global CSS variable swapping without page reloads.
*   ⌨️ **Terminal Simulator (kitty + zsh):**
    *   Authentic syntax highlighting, prompt designs (`tanmay@hypr`), and simulated commands (`ls -la`, `cat stack.json | jq`).
    *   Dynamic canvas-generated ASCII art.
*   🖱️ **Native Linux Cursors:**
    *   Uses the beautiful **Bibata Modern Classic** cursor pack, embedded directly into the CSS via URL-encoded SVGs.

---

## 🛠️ Technology Stack

This project is built from scratch with zero external dependencies to ensure maximum performance and complete control over the DOM.

*   **HTML5** — Semantic, accessible structure.
*   **Vanilla CSS3** — Flexbox, Grid, custom properties (CSS variables), `backdrop-filter` for glassmorphism, and hardware-accelerated transitions.
*   **Vanilla JavaScript** — Event delegation, DOM manipulation, drag-and-drop math, and state management.
*   **Remix Icons** — Crisp, lightweight SVG icons.
*   **Google Fonts** — `JetBrains Mono` for authentic terminal typography and `Inter`/`Outfit` for sleek UI text.

---

## 💻 How to Run Locally

Because this is a purely static site, there is no build step or `npm install` required!

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/tanmayhutt/tanmayhutt.github.io.git
    ```
2.  **Navigate to the directory:**
    ```bash
    cd tanmayhutt.github.io
    ```
3.  **Open it:**
    Simply double-click `index.html` to open it in your browser, or use a live server plugin if you prefer auto-reloading.

---

## 🌍 Deployment (GitHub Pages)

This project is perfectly optimized for **GitHub Pages**.

1. Name your repository `<your-username>.github.io` (e.g., `tanmayhutt.github.io`).
2. Push your code to the `main` branch.
3. Ensure your GitHub Settings -> Pages is set to deploy from the `main` branch `/ (root)` folder.
4. Your site will be live within seconds!

---

<div align="center">
  <p><i>Designed & Engineered by <a href="https://github.com/tanmayhutt">Tanmay Tiwari</a></i></p>
</div>
