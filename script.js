/* =====================================================
   TANMAY TIWARI — HYPRLAND WEB OS THEME
   script.js
   ===================================================== */

document.addEventListener('DOMContentLoaded', () => {

    /* ─── 1. WAYBAR CLOCK & DATE ─── */
    const timeEl = document.getElementById('wb-time');
    const dateEl = document.getElementById('wb-date');

    function updateTime() {
        const now = new Date();
        const hh = String(now.getHours()).padStart(2, '0');
        const mm = String(now.getMinutes()).padStart(2, '0');
        timeEl.textContent = `${hh}:${mm}`;

        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        dateEl.textContent = `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]}`;
    }
    setInterval(updateTime, 1000);
    updateTime();

    /* ─── 2. WINDOW MANAGER (WORKSPACES & Z-INDEX) ─── */
    const windows = document.querySelectorAll('.hypr-win');
    const wsButtons = document.querySelectorAll('.ws');
    const wbTitle = document.getElementById('wb-title');
    let highestZ = 20;
    let activeWindow = null;
    let currentWorkspace = 1;
    function updateWaybarTitle() {
        // Always scan DOM fresh — find the topmost visible window IN CURRENT WORKSPACE
        const visible = Array.from(document.querySelectorAll(`#ws-${currentWorkspace} .hypr-win`))
            .filter(w => !w.classList.contains('hidden'));

        if (visible.length === 0) {
            wbTitle.textContent = '';
            activeWindow = null;
            return;
        }

        // Sort by z-index descending → topmost is the active one
        visible.sort((a, b) => parseInt(b.style.zIndex || 0) - parseInt(a.style.zIndex || 0));
        activeWindow = visible[0];
        wbTitle.textContent = activeWindow.querySelector('.win-title')?.textContent || '';
    }

    function bringToFront(win) {
        highestZ++;
        win.style.zIndex = highestZ;
        activeWindow = win;
        updateWaybarTitle();
    }

    // True Workspace Switching
    const desktopTrack = document.getElementById('desktop-track');
    
    function goToWorkspace(index) {
        if (index < 1) index = 4;
        if (index > 4) index = 1;
        currentWorkspace = index;
        
        // Slide track
        desktopTrack.style.transform = `translateX(-${(index - 1) * 100}vw)`;
        
        // Update waybar buttons
        wsButtons.forEach(b => b.classList.remove('active'));
        const activeBtn = Array.from(wsButtons).find(b => parseInt(b.getAttribute('data-ws')) === index);
        if (activeBtn) activeBtn.classList.add('active');
        
        updateWaybarTitle();
    }

    wsButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const wsIndex = parseInt(btn.getAttribute('data-ws'));
            goToWorkspace(wsIndex);
        });
    });

    // Navigation Arrows
    const navLeft = document.getElementById('nav-left');
    const navRight = document.getElementById('nav-right');
    if (navLeft) navLeft.addEventListener('click', () => goToWorkspace(currentWorkspace - 1));
    if (navRight) navRight.addEventListener('click', () => goToWorkspace(currentWorkspace + 1));

    // Wofi App Launcher
    const wofiLauncher = document.getElementById('wofi-launcher');
    const archLogo = document.querySelector('.wb-logo');
    const wofiInput = document.getElementById('wofi-input');
    const wofiItems = document.querySelectorAll('.wofi-item');

    function toggleWofi() {
        if (wofiLauncher.classList.contains('active')) {
            wofiLauncher.classList.remove('active');
            updateWaybarTitle();
        } else {
            wofiLauncher.classList.add('active');
            wofiInput.value = '';
            wofiInput.focus();
            wofiItems.forEach(item => item.style.display = 'flex');
            wofiSelectedIndex = 0;
            updateWofiSelection();
        }
    }

    if (archLogo) archLogo.addEventListener('click', toggleWofi);

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Meta' || e.key === 'OS' || e.key === 'Super') {
            toggleWofi();
        }
        if (e.key === 'Escape' && wofiLauncher.classList.contains('active')) {
            toggleWofi();
        }
    });

    // Close Wofi when clicking outside
    document.addEventListener('click', (e) => {
        if (wofiLauncher.classList.contains('active') && 
            !wofiLauncher.contains(e.target) && 
            archLogo && !archLogo.contains(e.target)) {
            toggleWofi();
        }
    });

    wofiInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        wofiItems.forEach(item => {
            const text = item.textContent.toLowerCase();
            if (text.includes(query)) {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
        });
        wofiSelectedIndex = 0;
        updateWofiSelection();
    });

    let wofiSelectedIndex = -1;
    
    function updateWofiSelection() {
        const visibleItems = Array.from(wofiItems).filter(item => item.style.display !== 'none');
        
        // Remove selected class from all
        wofiItems.forEach(item => item.classList.remove('selected'));
        
        if (visibleItems.length > 0) {
            if (wofiSelectedIndex >= visibleItems.length) wofiSelectedIndex = 0;
            if (wofiSelectedIndex < 0) wofiSelectedIndex = visibleItems.length - 1;
            
            const selectedItem = visibleItems[wofiSelectedIndex];
            selectedItem.classList.add('selected');
            
            // Preview the title of the selected app in the waybar
            const t = selectedItem.getAttribute('data-title') || selectedItem.textContent.trim();
            wbTitle.textContent = t;
            
            selectedItem.scrollIntoView({ block: 'nearest' });
        }
    }

    wofiInput.addEventListener('keydown', (e) => {
        const visibleItems = Array.from(wofiItems).filter(item => item.style.display !== 'none');
        if (visibleItems.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            wofiSelectedIndex++;
            updateWofiSelection();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            wofiSelectedIndex--;
            updateWofiSelection();
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (wofiSelectedIndex >= 0 && wofiSelectedIndex < visibleItems.length) {
                visibleItems[wofiSelectedIndex].click();
            }
        }
    });

    wofiItems.forEach((item, index) => {
        item.addEventListener('mouseenter', () => {
            const visibleItems = Array.from(wofiItems).filter(i => i.style.display !== 'none');
            wofiSelectedIndex = visibleItems.indexOf(item);
            updateWofiSelection();
        });

        item.addEventListener('click', () => {
            const appId = item.getAttribute('data-app');
            const win = document.getElementById(appId);
            const currentWsContainer = document.getElementById(`ws-${currentWorkspace}`);
            
            if (win && currentWsContainer) {
                // Move window to current workspace
                currentWsContainer.appendChild(win);
                win.classList.remove('hidden');
                win.classList.add('active');
                bringToFront(win);
            }
            toggleWofi();
        });
    });

    // Window Clicking brings to front
    windows.forEach(win => {
        win.addEventListener('mousedown', () => bringToFront(win));
        
        // Controls
        const closeBtn = win.querySelector('.wc.close');
        const minBtn = win.querySelector('.wc.min');
        const maxBtn = win.querySelector('.wc.max');
        const controlsContainer = win.querySelector('.win-controls');

        if (controlsContainer) {
            controlsContainer.addEventListener('mousedown', (e) => e.stopPropagation());
        }

        const closeOrMin = (e) => {
            if (e) e.stopPropagation();
            win.classList.add('hidden');
            win.classList.remove('active');
            // If this was the active window, clear it and find next
            if (activeWindow === win) {
                activeWindow = null;
            }
            updateWaybarTitle();
        };

        if (closeBtn) closeBtn.addEventListener('click', closeOrMin);
        if (minBtn) minBtn.addEventListener('click', closeOrMin);
        
        if (maxBtn) {
            maxBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                win.classList.toggle('maximized');
                // Ensure it comes to front when maximizing
                if (win.classList.contains('maximized')) {
                    bringToFront(win);
                }
            });
        }
    });

    /* ─── 3. WINDOW DRAGGING ─── */
    let isDragging = false;
    let dragTarget = null;
    let startX, startY, initialLeft, initialTop;

    windows.forEach(win => {
        const header = win.querySelector('.win-header');
        if (!header) return;

        const handleDragStart = (e) => {
            // Ignore if clicking on or near the control buttons
            if (e.target.closest('.win-controls')) return;
            
            isDragging = true;
            dragTarget = win;
            bringToFront(win);
            
            // Disable transition so dragging is instant and smooth
            win.style.transition = 'none';
            header.style.cursor = 'grabbing';
            
            const style = window.getComputedStyle(win);
            const matrix = new DOMMatrixReadOnly(style.transform);
            initialLeft = matrix.m41;
            initialTop = matrix.m42;
            
            startX = e.clientX || (e.touches && e.touches[0].clientX);
            startY = e.clientY || (e.touches && e.touches[0].clientY);
        };

        header.addEventListener('mousedown', handleDragStart);
        header.addEventListener('touchstart', handleDragStart, {passive: true});
    });

    const handleDragMove = (e) => {
        if (!isDragging || !dragTarget) return;
        
        const clientX = e.clientX || (e.touches && e.touches[0].clientX);
        const clientY = e.clientY || (e.touches && e.touches[0].clientY);
        
        const dx = clientX - startX;
        const dy = clientY - startY;
        
        dragTarget.style.transform = `translate(${initialLeft + dx}px, ${initialTop + dy}px) scale(1)`;
    };

    const handleDragEnd = () => {
        if (dragTarget) {
            // Restore transition when drag ends
            dragTarget.style.transition = '';
            const header = dragTarget.querySelector('.win-header');
            if (header) header.style.cursor = 'grab';
        }
        isDragging = false;
        dragTarget = null;
    };

    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('touchmove', handleDragMove, {passive: true});

    document.addEventListener('mouseup', handleDragEnd);
    document.addEventListener('touchend', handleDragEnd);

    /* ─── 4. CUSTOM CONTEXT MENU ─── */
    const ctxMenu = document.getElementById('context-menu');
    document.addEventListener('contextmenu', (e) => {
        // Only show custom menu on desktop background
        if (e.target.id === 'desktop' || e.target.classList.contains('noise') || e.target.id === 'aurora-canvas') {
            e.preventDefault();
            ctxMenu.style.left = `${e.clientX}px`;
            ctxMenu.style.top = `${e.clientY}px`;
            ctxMenu.classList.remove('hidden');
        }
    });

    document.addEventListener('click', () => {
        ctxMenu.classList.add('hidden');
    });

    /* ─── 5. DYNAMIC THEMING ─── */
    const cmTheme = document.getElementById('cm-theme');
    const themes = ['aurora', 'abyss', 'carbon', 'neon'];
    let currentThemeIdx = 0;
    
    function setTheme(themeId) {
        document.documentElement.setAttribute('data-theme', themeId);
        currentThemeIdx = themes.indexOf(themeId);
        
        // Update active card
        document.querySelectorAll('.theme-card').forEach(c => c.classList.remove('active'));
        const activeCard = document.querySelector(`.theme-card[data-theme-id="${themeId}"]`);
        if (activeCard) activeCard.classList.add('active');

    }

    function cycleTheme() {
        currentThemeIdx = (currentThemeIdx + 1) % themes.length;
        setTheme(themes[currentThemeIdx]);
    }

    if (cmTheme) cmTheme.addEventListener('click', cycleTheme);
    
    // Bind Theme Cards
    document.querySelectorAll('.theme-card').forEach(card => {
        card.addEventListener('click', () => {
            const themeId = card.getAttribute('data-theme-id');
            setTheme(themeId);
        });
    });

    /* ─── 6. GITHUB API - TOP REPOS ─── */
    async function fetchTopRepos() {
        const grid = document.getElementById('github-repos');
        if (!grid) return;

        try {
            const res = await fetch('https://api.github.com/users/tanmayhutt/repos?per_page=100');
            if (!res.ok) throw new Error('API Error');
            const data = await res.json();

            // Sort by stars first, then by size (as a proxy for commit activity)
            const topRepos = data
                .filter(repo => !repo.fork)
                .sort((a, b) => {
                    if (b.stargazers_count !== a.stargazers_count) {
                        return b.stargazers_count - a.stargazers_count;
                    }
                    return b.size - a.size;
                })
                .slice(0, 6);

            // Remove loading row
            const loadingRow = document.getElementById('repo-loading');
            if (loadingRow) loadingRow.remove();

            // Helper to format sizes like ls
            const formatSize = (kb) => {
                if (kb > 1024) return (kb / 1024).toFixed(1) + 'M';
                return kb + 'K';
            };

            // Colors mapping for languages
            const langColors = {
                'TypeScript': 'c-blue',
                'JavaScript': 'c-yellow',
                'C++': 'c-red',
                'C': 'c-gray',
                'GLSL': 'c-purple',
                'CSS': 'c-green'
            };

            topRepos.forEach((repo, idx) => {
                const date = new Date(repo.pushed_at);
                const dateStr = `${date.toLocaleString('default', { month: 'short' })} ${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
                
                const a = document.createElement('a');
                a.href = repo.html_url;
                a.target = '_blank';
                a.className = 'ls-row';
                
                const nameColor = ['c-green', 'c-purple', 'c-blue', 'c-red', 'c-yellow', 'c-main'][idx % 6];
                const langDesc = repo.language || 'Unknown';
                const starDesc = repo.stargazers_count > 0 ? `${repo.stargazers_count}★ ` : '';

                a.innerHTML = `
                    <span class="c-gray">-rw-r--r--</span>
                    <span class="c-gray">1</span>
                    <span class="c-yellow">tanmay</span>
                    <span class="c-yellow">wheel</span>
                    <span class="c-blue">${formatSize(repo.size)}</span>
                    <span class="c-gray">${dateStr}</span>
                    <span class="${nameColor} fw-bold"><i class="ri-git-repository-line"></i> ${repo.name}</span>
                    <span class="ls-desc">// ${starDesc}${langDesc}</span>
                `;
                grid.appendChild(a);
            });

        } catch (err) {
            const loadingRow = document.getElementById('repo-loading');
            if (loadingRow) loadingRow.innerHTML = `<span class="c-red" style="grid-column: 1 / -1;">Error loading repos: ${err.message}</span>`;
        }
    }
    fetchTopRepos();

    /* ─── 6. REAL DEVICE STATUS ─── */
    function updateDeviceStatus() {
        // CPU Cores (Logical Processors)
        const cpuCores = navigator.hardwareConcurrency || '--';
        const cpuEl = document.querySelector('#sys-cpu .val');
        if (cpuEl) cpuEl.textContent = cpuCores > 0 ? `${cpuCores}c` : '--';

        // Device Memory (Approximate RAM in GB)
        const deviceMemory = navigator.deviceMemory || '--';
        const ramEl = document.querySelector('#sys-ram .val');
        if (ramEl) ramEl.textContent = deviceMemory > 0 ? `${deviceMemory}G` : '--';

        // Language
        const lang = navigator.language ? navigator.language.toUpperCase().split('-')[0] : '--';
        const langEl = document.querySelector('#sys-lang .val');
        if (langEl) langEl.textContent = lang;

        // Network Status
        const netEl = document.querySelector('#sys-net .val');
        const netIcon = document.querySelector('#sys-net i');
        if (netEl && netIcon) {
            if (navigator.onLine) {
                const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
                if (conn && conn.effectiveType) {
                    netEl.textContent = conn.effectiveType.toUpperCase(); // e.g., '4G'
                    netIcon.className = 'ri-wifi-fill';
                } else {
                    netEl.textContent = 'ON';
                    netIcon.className = 'ri-wifi-fill';
                }
            } else {
                netEl.textContent = 'OFF';
                netIcon.className = 'ri-wifi-off-fill';
            }
        }
    }

    // Battery Status API (Requires Promise)
    function updateBatteryStatus() {
        const batEl = document.querySelector('#sys-battery .val');
        const batIcon = document.getElementById('bat-icon');
        
        if (navigator.getBattery && batEl && batIcon) {
            navigator.getBattery().then(function(battery) {
                function updateAllBatteryInfo() {
                    updateChargeInfo();
                    updateLevelInfo();
                }
                
                function updateChargeInfo() {
                    if (battery.charging) {
                        batIcon.className = 'ri-battery-charge-fill';
                        batIcon.style.color = 'var(--c-green)';
                    } else {
                        batIcon.style.color = 'var(--c-main)';
                        const level = battery.level * 100;
                        if (level > 80) batIcon.className = 'ri-battery-fill';
                        else if (level > 50) batIcon.className = 'ri-battery-2-line';
                        else if (level > 20) batIcon.className = 'ri-battery-low-line';
                        else {
                            batIcon.className = 'ri-battery-low-line';
                            batIcon.style.color = 'var(--c-red)';
                        }
                    }
                }

                function updateLevelInfo() {
                    batEl.textContent = Math.round(battery.level * 100) + '%';
                }

                updateAllBatteryInfo();
                battery.addEventListener('chargingchange', updateChargeInfo);
                battery.addEventListener('levelchange', updateLevelInfo);
            });
        } else if (batEl) {
            batEl.textContent = 'AC';
            if (batIcon) batIcon.className = 'ri-plug-fill';
        }
    }

    // Run status updates
    updateDeviceStatus();
    updateBatteryStatus();
    window.addEventListener('online', updateDeviceStatus);
    window.addEventListener('offline', updateDeviceStatus);
    if (navigator.connection) {
        navigator.connection.addEventListener('change', updateDeviceStatus);
    }

    // Handle Sys modules clicking (btop & themes)
    const winBtop = document.getElementById('win-btop');
    const winTheme = document.getElementById('win-theme');
    
    document.querySelectorAll('.wb-sys, .wb-tray').forEach(sysBtn => {
        sysBtn.addEventListener('click', () => {
            const targetWin = sysBtn.id === 'sys-theme' ? winTheme : winBtop;
            
            if (targetWin.classList.contains('hidden')) {
                // If the target window is hidden, we need to append it to the current workspace
                // so it opens on the screen the user is currently looking at
                const currentWsContainer = document.getElementById(`ws-${currentWorkspace}`);
                if (currentWsContainer) {
                    currentWsContainer.appendChild(targetWin);
                }
                targetWin.classList.remove('hidden');
                targetWin.classList.add('active');
                bringToFront(targetWin);
            } else {
                targetWin.classList.add('hidden');
                targetWin.classList.remove('active');
                if (activeWindow === targetWin) {
                    activeWindow = null;
                }
                updateWaybarTitle();
            }
        });
    });

    // Terminal Logic
    const cliInput = document.getElementById('cli-input');
    const cliOutput = document.getElementById('cli-output');
    const cliContainer = document.getElementById('cli-container');
    const winCli = document.getElementById('win-cli');

    if (cliInput && cliOutput) {
        // Focus input when clicking anywhere on terminal
        if (cliContainer) {
            cliContainer.addEventListener('click', () => {
                cliInput.focus();
            });
        }

        cliInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const cmdRaw = cliInput.value;
                const cmd = cmdRaw.trim().toLowerCase();
                cliInput.value = '';

                // Add prompt and command to output
                const promptDiv = document.createElement('div');
                promptDiv.className = 'prompt-line mt-2';
                promptDiv.innerHTML = `<span class="p-user" style="color: var(--c-blue);">tanmay@hypr</span><span class="p-dir" style="color: var(--c-purple);">~$</span> <span class="p-cmd" style="color: var(--c-main); margin-left: 6px;">${cmdRaw}</span>`;
                cliOutput.appendChild(promptDiv);

                // Execute command
                const resDiv = document.createElement('div');
                resDiv.className = 'out-line';
                resDiv.style.color = 'var(--c-gray)';
                
                if (cmd === '') {
                    // Do nothing
                    resDiv.style.display = 'none';
                } else if (cmd === 'help') {
                    resDiv.innerHTML = 'Available commands:<br>&nbsp;&nbsp;help&nbsp;&nbsp;&nbsp;- Show this message<br>&nbsp;&nbsp;clear&nbsp;&nbsp;- Clear terminal<br>&nbsp;&nbsp;whoami&nbsp;- Print user info<br>&nbsp;&nbsp;date&nbsp;&nbsp;&nbsp;- Print current date<br>&nbsp;&nbsp;ls&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;- List files<br>&nbsp;&nbsp;echo&nbsp;&nbsp;&nbsp;- Print text';
                } else if (cmd === 'clear') {
                    cliOutput.innerHTML = '';
                    resDiv.style.display = 'none';
                } else if (cmd === 'whoami') {
                    resDiv.innerHTML = 'tanmay<br>Software Engineer & Designer';
                } else if (cmd === 'date') {
                    resDiv.innerHTML = new Date().toString();
                } else if (cmd === 'ls') {
                    resDiv.innerHTML = '<span style="color: var(--c-blue);">projects/</span>&nbsp;&nbsp;<span style="color: var(--c-blue);">tech-stack/</span>&nbsp;&nbsp;bio.txt&nbsp;&nbsp;resume.pdf';
                } else if (cmd.startsWith('echo ')) {
                    resDiv.textContent = cmdRaw.substring(5);
                } else {
                    resDiv.innerHTML = `bash: ${cmd.split(' ')[0]}: command not found`;
                    resDiv.style.color = 'var(--c-red)';
                }

                if (resDiv.style.display !== 'none') {
                    cliOutput.appendChild(resDiv);
                }

                // Scroll to bottom
                if (cliContainer) {
                    cliContainer.scrollTop = cliContainer.scrollHeight;
                }
            }
        });
    }

});

/* =====================================================
   GITHUB PFP → ASCII ART GENERATOR
   Runs on page load, fetches live from GitHub,
   uses actual pixel colors from the image.
   Auto-syncs if PFP changes.
   ===================================================== */
(function generateGitHubAscii() {
    const container = document.getElementById('nf-ascii-art');
    if (!container) return;

    // Character ramp: dark → bright
    const CHARS = ' .\'`^",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$';
    const W = 36;   // ascii columns
    const H = 20;   // ascii rows

    const canvas = document.createElement('canvas');
    canvas.width  = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
        // Draw onto tiny canvas
        ctx.drawImage(img, 0, 0, W, H);
        let pixelData;
        try {
            pixelData = ctx.getImageData(0, 0, W, H).data;
        } catch (e) {
            // CORS blocked — fallback message
            container.innerHTML = '<pre style="color:var(--c-gray);font-size:9px;">avatar blocked\nby CORS policy</pre>';
            return;
        }

        const pre = document.createElement('pre');
        pre.style.cssText = [
            'font-family: var(--font-mono)',
            'font-size: 9px',
            'line-height: 12px',
            'font-weight: 700',
            'margin: 0',
            'padding-right: 12px',
            'letter-spacing: 0.5px',
            'white-space: pre',
        ].join(';');

        let html = '';
        for (let y = 0; y < H; y++) {
            for (let x = 0; x < W; x++) {
                const i = (y * W + x) * 4;
                const r = pixelData[i];
                const g = pixelData[i + 1];
                const b = pixelData[i + 2];
                const a = pixelData[i + 3];
                // Blend with dark background for transparency
                const br = Math.round(r * (a / 255) + 18 * (1 - a / 255));
                const bg = Math.round(g * (a / 255) + 18 * (1 - a / 255));
                const bb = Math.round(b * (a / 255) + 18 * (1 - a / 255));

                const brightness = (0.299 * br + 0.587 * bg + 0.114 * bb) / 255;
                const charIdx = Math.floor(brightness * (CHARS.length - 1));
                const ch = CHARS[charIdx];
                const safeChar = ch === ' ' ? '&nbsp;' : ch.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
                html += `<span style="color:rgb(${br},${bg},${bb})">${safeChar}</span>`;
            }
            html += '\n';
        }

        pre.innerHTML = html;
        container.innerHTML = '';
        container.appendChild(pre);
    };

    img.onerror = () => {
        container.innerHTML = '<pre style="color:var(--c-gray);font-size:9px;">  could not load\n  github avatar</pre>';
    };

    // GitHub always serves latest avatar at this URL — auto-syncs on PFP change
    img.src = `https://avatars.githubusercontent.com/u/89214022?v=${Date.now()}&s=120`;
})();

/* ─── 8. REAL & FAKE SYSTEM MONITOR ANIMATION ─── */
(() => {
    // Top Waybar Elements
    const wbCpu = document.querySelector('#sys-cpu .val');
    const wbRam = document.querySelector('#sys-ram .val');
    const wbNet = document.querySelector('#sys-net .val');
    const wbLang = document.querySelector('#sys-lang .val');
    const wbBat = document.querySelector('#sys-battery .val');
    const batIcon = document.getElementById('bat-icon');

    // Btop Window Elements
    const btopCpu = document.getElementById('btop-cpu');
    const btopMem = document.getElementById('btop-mem');
    const btopNet = document.getElementById('btop-net');
    const btopTableRows = document.querySelectorAll('#win-btop tbody tr');

    if (!btopCpu || !btopMem || !btopNet) return;

    // --- REAL DATA ---
    const logicalCores = navigator.hardwareConcurrency || 6;
    const deviceMemory = navigator.deviceMemory || 16;
    const lang = navigator.language ? navigator.language.split('-')[0].toUpperCase() : 'EN';
    const connectionType = (navigator.connection && navigator.connection.effectiveType) ? navigator.connection.effectiveType.toUpperCase() : '4G';

    // Update static real data in waybar
    if (wbCpu) wbCpu.textContent = `${logicalCores}c`;
    if (wbRam) wbRam.textContent = `${deviceMemory}G`;
    if (wbLang) wbLang.textContent = `${lang}`;
    if (wbNet) wbNet.textContent = `${connectionType}`;

    // Update real battery data
    if (navigator.getBattery) {
        navigator.getBattery().then(battery => {
            const updateBattery = () => {
                const level = Math.round(battery.level * 100);
                const charging = battery.charging;
                
                if (wbBat) wbBat.textContent = `${level}%`;
                if (batIcon) batIcon.className = charging ? 'ri-battery-charge-line' : 'ri-battery-line';

                window.systemBatteryLevel = level;
                window.systemBatteryCharging = charging;
            };
            updateBattery();
            battery.addEventListener('levelchange', updateBattery);
            battery.addEventListener('chargingchange', updateBattery);
        });
    }

    // --- FAKE & RANDOMIZED DATA ---
    function getBar(percentage, length = 15) {
        const filled = Math.round((percentage / 100) * length);
        const bar = '|'.repeat(filled) + ' '.repeat(length - filled);
        return `[${bar}]`;
    }

    setInterval(() => {
        // Randomize CPU between 15% and 85%
        const cpu = Math.floor(Math.random() * 70) + 15;
        btopCpu.innerHTML = `CPU ${getBar(cpu)} ${cpu}%  (${logicalCores}c)`;

        // Randomize MEM between 60% and 90%
        const mem = Math.floor(Math.random() * 30) + 60;
        btopMem.innerHTML = `MEM ${getBar(mem)} ${mem}% (${deviceMemory}G)`;

        // Randomize NET (Using real connection downlink if available)
        let baseDown = 5;
        if (navigator.connection && navigator.connection.downlink) {
            baseDown = navigator.connection.downlink / 8; // Convert Mbps to MB/s
        }
        // Slightly oscillate around the real base download speed
        const down = Math.max(0, baseDown + (Math.random() * 2 - 1)).toFixed(1);
        const up = Math.max(0, (baseDown / 4) + (Math.random() * 1 - 0.5)).toFixed(1); // Fake upload relative to down
        btopNet.innerHTML = `NET ▼ ${down} MB/s ▲ ${up} MB/s (${connectionType})`;

        // Update remaining stats
        const batLvl = window.systemBatteryLevel || 100;
        const batChg = window.systemBatteryCharging ? '(Charging)' : '(Discharging)';
        const dskEl = btopNet.nextElementSibling;
        const lngBatEl = dskEl.nextElementSibling;
        
        const dsk = 32 + Math.floor(Math.random() * 3);
        dskEl.innerHTML = `DSK ${getBar(dsk, 6)} ${dsk}%`;
        lngBatEl.innerHTML = `LNG: ${lang} | BAT: ${batLvl}% ${batChg}`;

        // Randomize process table CPU/MEM
        btopTableRows.forEach(row => {
            const tds = row.querySelectorAll('td');
            if (tds.length >= 8) {
                const proc = tds[8].textContent.trim();
                let baseCpu = 1, baseMem = 1;
                
                if (proc === 'Hyprland') { baseCpu = 8; baseMem = 4; }
                else if (proc === 'waybar') { baseCpu = 1; baseMem = 0.5; }
                else if (proc === 'btop') { baseCpu = 4; baseMem = 1.5; }
                else if (proc.includes('wofi')) { baseCpu = 2; baseMem = 1; }
                else if (proc.includes('whoami')) { baseCpu = 1.5; baseMem = 1; }
                else if (proc.includes('kitty')) { baseCpu = 2; baseMem = 1.5; } // other kitties
                else if (proc.includes('theme')) { baseCpu = 0.5; baseMem = 0.5; }

                const randCpu = (baseCpu + (Math.random() * 2 - 1)).toFixed(1);
                const randMem = (baseMem + (Math.random() * 1 - 0.5)).toFixed(1);
                
                tds[6].textContent = Math.max(0.1, randCpu).toFixed(1);
                tds[7].textContent = Math.max(0.1, randMem).toFixed(1);
            }
        });
    }, 2000);
})();
