/* =====================================================
   TANMAY TIWARI | HYPRLAND WEB DESK
   script.js

   1. Helpers and state
   2. Waybar clock
   3. Window manager (open, close, minimize, maximize, focus)
   4. Dragging and resizing
   5. Workspaces
   6. Wofi launcher
   7. Keyboard shortcuts
   8. Context menu and tiling
   9. Themes
   10. Device status
   11. btop simulation
   12. fastfetch avatar
   13. Terminal
   ===================================================== */

(() => {
    'use strict';

    /* ─── 1. HELPERS AND STATE ─── */
    const $ = (sel, root = document) => root.querySelector(sel);
    const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const finePointer = window.matchMedia('(pointer: fine)');
    const isMobile = () => window.innerWidth <= 768;
    const motionMs = (ms) => (motionQuery.matches ? 0 : ms);
    const EASE_OUT = 'cubic-bezier(0.22, 1, 0.36, 1)';

    const storage = {
        get(key) {
            try { return window.localStorage.getItem(key); } catch (err) { return null; }
        },
        set(key, value) {
            try { window.localStorage.setItem(key, value); } catch (err) { /* storage unavailable */ }
        }
    };

    /** Small element builder so terminal output never goes through innerHTML. */
    function el(tag, props = {}, children = []) {
        const node = document.createElement(tag);
        Object.entries(props).forEach(([key, value]) => {
            if (key === 'class') node.className = value;
            else if (key === 'text') node.textContent = value;
            else node.setAttribute(key, value);
        });
        [].concat(children).forEach(child => {
            if (child == null) return;
            node.append(child instanceof Node ? child : document.createTextNode(String(child)));
        });
        return node;
    }

    const WS_COUNT = 4;
    const root = document.documentElement;
    const body = document.body;
    const waybar = $('#waybar');
    const wbTitle = $('#wb-title');
    const wbTasks = $('#wb-tasks');
    const wsButtons = $$('.ws');
    const desktopTrack = $('#desktop-track');
    const wsIndicator = $('#ws-indicator');
    const windows = $$('.hypr-win');

    const state = {
        ws: 1,
        z: 20,
        focused: null,
        pids: new Map(),
        nextPid: 1024
    };

    const gap = () => parseFloat(getComputedStyle(root).getPropertyValue('--gap')) || 10;
    const topEdge = () => waybar.getBoundingClientRect().bottom + gap();
    const workspaceEl = (n) => $(`#ws-${n}`);
    const workspaceOf = (win) => Number(win.parentElement.dataset.ws);
    const isOpen = (win) => win.classList.contains('open');
    const openWindowsIn = (n) => $$('.hypr-win.open', workspaceEl(n));

    /* ─── 2. WAYBAR CLOCK ─── */
    const timeEl = $('#wb-time');
    const dateEl = $('#wb-date');
    const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    function updateClock() {
        const now = new Date();
        const hh = String(now.getHours()).padStart(2, '0');
        const mm = String(now.getMinutes()).padStart(2, '0');
        timeEl.textContent = `${hh}:${mm}`;
        dateEl.textContent = `${DAYS[now.getDay()]} ${now.getDate()} ${MONTHS[now.getMonth()]}`;
    }
    updateClock();
    setInterval(updateClock, 10000);

    /* ─── 3. WINDOW MANAGER ─── */

    /** Keep a window fully inside the usable desktop area. */
    function clampWindow(win) {
        const g = gap();
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const minTop = topEdge();

        let width = win.offsetWidth;
        if (width > vw - 2 * g) {
            width = vw - 2 * g;
            win.style.width = `${width}px`;
        }
        if (win.style.height && win.offsetHeight > vh - minTop - g) {
            win.style.height = `${vh - minTop - g}px`;
        }

        const height = win.offsetHeight;
        const left = Math.min(Math.max(win.offsetLeft, g), Math.max(g, vw - width - g));
        const top = Math.min(Math.max(win.offsetTop, minTop), Math.max(minTop, vh - height - g));
        win.style.left = `${Math.round(left)}px`;
        win.style.top = `${Math.round(top)}px`;
    }

    /** Size and position a window when it opens. Desktop windows float centred with a cascade. */
    function placeWindow(win) {
        const g = gap();
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const minTop = topEdge();
        const availH = vh - minTop - g;

        if (isMobile()) {
            win.style.left = `${g}px`;
            win.style.top = `${minTop}px`;
            win.style.width = `${vw - 2 * g}px`;
            win.style.height = win.dataset.h ? `${Math.min(Number(win.dataset.h), availH)}px` : '';
            return;
        }

        const width = Math.min(Number(win.dataset.w) || 600, vw - 2 * g);
        win.style.width = `${width}px`;
        win.style.height = win.dataset.h ? `${Math.min(Number(win.dataset.h), availH)}px` : '';

        const height = win.offsetHeight;
        const cascade = openWindowsIn(state.ws).filter(w => w !== win).length * 28;
        const left = (vw - width) / 2 + cascade;
        const top = minTop + Math.max(0, (availH - height) / 2) + cascade;
        win.style.left = `${Math.round(left)}px`;
        win.style.top = `${Math.round(top)}px`;
        clampWindow(win);
    }

    function focusWindow(win) {
        if (!win) return;
        state.z += 1;
        win.style.zIndex = state.z;
        state.focused = win;
        windows.forEach(w => w.classList.toggle('focused', w === win));
        refreshChrome();
    }

    /** Waybar title, occupied workspace dots and btop rows follow the window stack. */
    function refreshChrome() {
        const visible = openWindowsIn(state.ws)
            .sort((a, b) => (Number(b.style.zIndex) || 0) - (Number(a.style.zIndex) || 0));
        const top = visible[0] || null;

        if (!top || !isOpen(top)) {
            state.focused = null;
        } else if (!state.focused || !isOpen(state.focused) || workspaceOf(state.focused) !== state.ws) {
            state.focused = top;
        }
        windows.forEach(w => w.classList.toggle('focused', w === state.focused));

        if (!wofi.classList.contains('active')) {
            wbTitle.textContent = state.focused ? $('.win-title', state.focused).textContent : '';
        }

        wsButtons.forEach(btn => {
            const n = Number(btn.dataset.ws);
            btn.classList.toggle('occupied', n !== state.ws && openWindowsIn(n).length > 0);
        });

        renderProcesses();
    }

    function animateIn(win) {
        if (!win.animate || motionQuery.matches) return;
        win.animate(
            [
                { opacity: 0, transform: 'scale(0.94) translateY(8px)' },
                { opacity: 1, transform: 'none' }
            ],
            { duration: 240, easing: EASE_OUT }
        );
    }

    function openWindow(id, { focusContent = true, restore = false } = {}) {
        const win = typeof id === 'string' ? document.getElementById(id) : id;
        if (!win) return;

        removeFromTray(win);
        const home = workspaceEl(state.ws);
        const wasOpen = isOpen(win);

        if (win.parentElement !== home) {
            home.appendChild(win);
        }
        if (!state.pids.has(win.id)) {
            state.pids.set(win.id, state.nextPid++);
        }

        if (!wasOpen) {
            win.classList.add('open');
            // Restored windows return to where they were; new ones are placed fresh.
            if (restore && !isMobile()) clampWindow(win);
            else placeWindow(win);
            animateIn(win);
        }

        focusWindow(win);

        if (focusContent) {
            const input = $('input', win);
            if (input && (finePointer.matches || win.id === 'win-cli')) {
                input.focus({ preventScroll: true });
            } else {
                win.focus({ preventScroll: true });
            }
        }

        if (win.id === 'win-btop') startBtop();
    }

    function hideWindow(win) {
        win.classList.remove('open', 'maximized', 'focused');
        if (state.focused === win) state.focused = null;
        if (win.contains(document.activeElement)) {
            $('#wofi-btn').focus({ preventScroll: true });
        }
        refreshChrome();
        if (win.id === 'win-btop') stopBtop();
    }

    function closeWindow(win) {
        if (!isOpen(win)) return;
        if (!win.animate || motionQuery.matches) {
            hideWindow(win);
            return;
        }
        win.style.pointerEvents = 'none';
        const anim = win.animate(
            [
                { opacity: 1, transform: 'none' },
                { opacity: 0, transform: 'scale(0.94)' }
            ],
            { duration: 150, easing: 'ease-in' }
        );
        anim.onfinish = () => {
            win.style.pointerEvents = '';
            hideWindow(win);
        };
    }

    function minimizeWindow(win) {
        if (!isOpen(win)) return;
        const chip = addToTray(win);
        if (!win.animate || motionQuery.matches) {
            hideWindow(win);
            return;
        }
        // Genie-style squeeze into the Waybar chip that will restore it.
        const from = win.getBoundingClientRect();
        const to = chip.getBoundingClientRect();
        const dx = to.left + to.width / 2 - (from.left + from.width / 2);
        const dy = to.top + to.height / 2 - (from.top + from.height / 2);
        win.style.pointerEvents = 'none';
        const anim = win.animate(
            [
                { opacity: 1, transform: 'none', filter: 'none' },
                { opacity: 0.85, transform: `translate(${dx * 0.35}px, ${dy * 0.2}px) scale(0.7, 0.55)`, offset: 0.45 },
                { opacity: 0, transform: `translate(${dx}px, ${dy}px) scale(0.04, 0.02)`, filter: 'blur(2px)' }
            ],
            { duration: 380, easing: 'cubic-bezier(0.55, 0, 0.3, 1)' }
        );
        anim.onfinish = () => {
            win.style.pointerEvents = '';
            hideWindow(win);
        };
    }

    function toggleMaximize(win) {
        win.classList.toggle('maximized');
        focusWindow(win);
    }

    function toggleWindow(id) {
        const win = document.getElementById(id);
        if (isOpen(win) && workspaceOf(win) === state.ws && state.focused === win) {
            closeWindow(win);
        } else {
            openWindow(win);
        }
    }

    /* Minimized windows live in a Waybar tray, like Hyprland's special workspace. */
    function addToTray(win) {
        removeFromTray(win);
        const chip = el('button', {
            class: 'wb-task',
            type: 'button',
            title: `Restore ${win.dataset.name}`,
            'aria-label': `Restore ${win.dataset.name}`,
            'data-win': win.id
        }, [el('i', { class: win.dataset.icon, 'aria-hidden': 'true' }), el('span', { text: win.dataset.name })]);
        chip.addEventListener('click', (event) => {
            event.stopPropagation();
            openWindow(win, { restore: true });
        });
        wbTasks.appendChild(chip);
        return chip;
    }

    function removeFromTray(win) {
        const chip = $(`.wb-task[data-win="${win.id}"]`, wbTasks);
        if (chip) chip.remove();
    }

    windows.forEach(win => {
        win.addEventListener('pointerdown', () => {
            if (state.focused !== win) focusWindow(win);
        });
        win.addEventListener('focusin', () => {
            if (state.focused !== win) focusWindow(win);
        });

        $('.wc.close', win).addEventListener('click', () => closeWindow(win));
        $('.wc.min', win).addEventListener('click', () => minimizeWindow(win));
        $('.wc.max', win).addEventListener('click', () => toggleMaximize(win));
        $('.win-header', win).addEventListener('dblclick', (event) => {
            if (!event.target.closest('.win-controls')) toggleMaximize(win);
        });
    });

    $$('[data-open]').forEach(btn => {
        btn.addEventListener('click', () => openWindow(btn.dataset.open));
    });

    /* ─── 4. DRAGGING AND RESIZING ─── */
    let drag = null;

    windows.forEach(win => {
        const header = $('.win-header', win);
        const handle = $('.resize-handle', win);

        header.addEventListener('pointerdown', (event) => {
            if (event.button !== 0 || event.target.closest('.win-controls')) return;
            event.preventDefault();

            // Dragging a maximized window restores it under the cursor, like Hyprland.
            if (win.classList.contains('maximized')) {
                const ratio = (event.clientX - win.offsetLeft) / win.offsetWidth;
                win.classList.remove('maximized');
                win.style.left = `${event.clientX - win.offsetWidth * ratio}px`;
                win.style.top = `${topEdge()}px`;
            }

            drag = {
                type: 'move',
                win,
                pointerId: event.pointerId,
                offsetX: event.clientX - win.offsetLeft,
                offsetY: event.clientY - win.offsetTop
            };
            header.setPointerCapture(event.pointerId);
            body.classList.add('is-dragging');
        });

        header.addEventListener('pointermove', (event) => {
            if (!drag || drag.type !== 'move' || drag.win !== win || drag.pointerId !== event.pointerId) return;
            win.style.left = `${event.clientX - drag.offsetX}px`;
            win.style.top = `${event.clientY - drag.offsetY}px`;
            clampWindow(win);
        });

        const endDrag = (event) => {
            if (!drag || drag.pointerId !== event.pointerId) return;
            drag = null;
            body.classList.remove('is-dragging', 'is-resizing');
        };
        header.addEventListener('pointerup', endDrag);
        header.addEventListener('pointercancel', endDrag);

        if (!handle) return;

        handle.addEventListener('pointerdown', (event) => {
            if (event.button !== 0) return;
            event.preventDefault();
            event.stopPropagation();
            focusWindow(win);
            drag = {
                type: 'resize',
                win,
                pointerId: event.pointerId,
                startX: event.clientX,
                startY: event.clientY,
                startW: win.offsetWidth,
                startH: win.offsetHeight
            };
            handle.setPointerCapture(event.pointerId);
            body.classList.add('is-resizing');
        });

        handle.addEventListener('pointermove', (event) => {
            if (!drag || drag.type !== 'resize' || drag.win !== win || drag.pointerId !== event.pointerId) return;
            const g = gap();
            const maxW = window.innerWidth - win.offsetLeft - g;
            const maxH = window.innerHeight - win.offsetTop - g;
            const w = Math.min(Math.max(drag.startW + event.clientX - drag.startX, 320), maxW);
            const h = Math.min(Math.max(drag.startH + event.clientY - drag.startY, 160), maxH);
            win.style.width = `${w}px`;
            win.style.height = `${h}px`;
        });
        handle.addEventListener('pointerup', endDrag);
        handle.addEventListener('pointercancel', endDrag);
    });

    // Keep windows reachable when the viewport changes size or orientation.
    let resizeFrame = 0;
    window.addEventListener('resize', () => {
        cancelAnimationFrame(resizeFrame);
        resizeFrame = requestAnimationFrame(() => {
            $$('.hypr-win.open').forEach(win => {
                if (isMobile()) placeWindow(win);
                else clampWindow(win);
            });
            hideContextMenu();
        });
    });

    /* ─── 5. WORKSPACES ─── */
    let indicatorTimer = 0;

    function goToWorkspace(index, { announce = true } = {}) {
        if (index < 1) index = WS_COUNT;
        if (index > WS_COUNT) index = 1;
        state.ws = index;
        desktopTrack.style.transform = `translateX(-${(index - 1) * 25}%)`;

        wsButtons.forEach(btn => {
            const active = Number(btn.dataset.ws) === index;
            btn.classList.toggle('active', active);
            if (active) btn.setAttribute('aria-current', 'true');
            else btn.removeAttribute('aria-current');
        });

        // Only the visible workspace is reachable by keyboard and screen readers.
        for (let n = 1; n <= WS_COUNT; n += 1) {
            workspaceEl(n).inert = n !== index;
        }

        if (announce) {
            wsIndicator.textContent = `workspace ${index}`;
            wsIndicator.classList.add('show');
            clearTimeout(indicatorTimer);
            indicatorTimer = setTimeout(() => wsIndicator.classList.remove('show'), 900);
        }
        refreshChrome();
    }

    wsButtons.forEach(btn => {
        btn.addEventListener('click', () => goToWorkspace(Number(btn.dataset.ws)));
    });
    $('#nav-left').addEventListener('click', () => goToWorkspace(state.ws - 1));
    $('#nav-right').addEventListener('click', () => goToWorkspace(state.ws + 1));

    // Horizontal swipe on empty desktop switches workspace on touch screens.
    let swipe = null;
    $('#desktop').addEventListener('pointerdown', (event) => {
        if (event.pointerType !== 'touch' || event.target.closest('.hypr-win, #wofi-launcher')) return;
        swipe = { x: event.clientX, y: event.clientY };
    });
    $('#desktop').addEventListener('pointerup', (event) => {
        if (!swipe) return;
        const dx = event.clientX - swipe.x;
        const dy = event.clientY - swipe.y;
        swipe = null;
        if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
            goToWorkspace(state.ws + (dx < 0 ? 1 : -1));
        }
    });

    /* ─── 6. WOFI LAUNCHER ─── */
    const wofi = $('#wofi-launcher');
    const wofiBtn = $('#wofi-btn');
    const wofiInput = $('#wofi-input');
    const wofiItems = $$('.wofi-item', wofi);
    const wofiGroups = $$('.wofi-group', wofi);
    const wofiEmpty = $('#wofi-empty');
    const wofiList = $('#wofi-list');
    let wofiIndex = 0;

    const visibleWofiItems = () => wofiItems.filter(item => !item.hidden);

    function setWofiSelection(index, { scroll = true } = {}) {
        const items = visibleWofiItems();
        wofiItems.forEach(item => item.classList.remove('selected'));
        if (!items.length) {
            wbTitle.textContent = '';
            return;
        }
        wofiIndex = (index + items.length) % items.length;
        const item = items[wofiIndex];
        item.classList.add('selected');
        wbTitle.textContent = item.dataset.title || item.textContent.trim();
        if (scroll) {
            // Scroll only the list; scrollIntoView could also shift the clipped desktop.
            const box = wofiList.getBoundingClientRect();
            const rect = item.getBoundingClientRect();
            if (rect.top < box.top) wofiList.scrollTop -= box.top - rect.top + 6;
            else if (rect.bottom > box.bottom) wofiList.scrollTop += rect.bottom - box.bottom + 6;
        }
    }

    function filterWofi(query) {
        const q = query.trim().toLowerCase();
        wofiItems.forEach(item => {
            item.hidden = q !== '' && !item.textContent.toLowerCase().includes(q);
        });
        // Hide group labels that have no visible entries.
        wofiGroups.forEach(group => {
            let next = group.nextElementSibling;
            let any = false;
            while (next && next.classList.contains('wofi-item')) {
                if (!next.hidden) any = true;
                next = next.nextElementSibling;
            }
            group.hidden = !any;
        });
        wofiEmpty.hidden = visibleWofiItems().length > 0;
        setWofiSelection(0);
    }

    function wofiGeniePath() {
        const from = wofi.getBoundingClientRect();
        const to = wofiBtn.getBoundingClientRect();
        return {
            dx: to.left + to.width / 2 - (from.left + from.width / 2),
            dy: to.top + to.height / 2 - (from.top + from.height / 2)
        };
    }

    function openWofi({ focusInput = true } = {}) {
        hideContextMenu();
        wofiInput.value = '';
        filterWofi('');
        wofi.classList.add('active');
        wofiBtn.setAttribute('aria-expanded', 'true');
        wofiBtn.setAttribute('aria-label', 'Close app launcher');

        if (wofi.animate && !motionQuery.matches) {
            const { dx, dy } = wofiGeniePath();
            wofi.animate(
                [
                    { opacity: 0, transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0.05, 0.03)` },
                    { opacity: 1, transform: 'translate(-50%, calc(-50% + 12px)) scale(1)' }
                ],
                { duration: 340, easing: EASE_OUT }
            );
        }
        if (focusInput) wofiInput.focus({ preventScroll: true });
    }

    function closeWofi({ restoreFocus = false } = {}) {
        if (!wofi.classList.contains('active')) return;
        if (wofi.animate && !motionQuery.matches) {
            // Squeeze back into the Waybar button so visitors learn where it lives.
            const { dx, dy } = wofiGeniePath();
            wofi.animate(
                [
                    { opacity: 1, visibility: 'visible', transform: 'translate(-50%, calc(-50% + 12px)) scale(1)' },
                    { opacity: 0.9, visibility: 'visible', transform: `translate(calc(-50% + ${dx * 0.3}px), calc(-50% + ${dy * 0.15}px)) scale(0.7, 0.5)`, offset: 0.45 },
                    { opacity: 0, visibility: 'visible', transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0.05, 0.03)` }
                ],
                { duration: 360, easing: 'cubic-bezier(0.55, 0, 0.3, 1)' }
            );
            wofiBtn.animate(
                [{ transform: 'scale(1)' }, { transform: 'scale(1.12)', offset: 0.8 }, { transform: 'scale(1)' }],
                { duration: 480, easing: 'ease-out' }
            );
        }
        wofi.classList.remove('active');
        wofiBtn.setAttribute('aria-expanded', 'false');
        wofiBtn.setAttribute('aria-label', 'Open app launcher');
        if (wofi.contains(document.activeElement)) {
            if (restoreFocus) wofiBtn.focus({ preventScroll: true });
            else document.activeElement.blur();
        }
        refreshChrome();
    }

    const toggleWofi = () => (wofi.classList.contains('active') ? closeWofi({ restoreFocus: true }) : openWofi());

    wofiBtn.addEventListener('click', toggleWofi);
    wofiInput.addEventListener('input', () => filterWofi(wofiInput.value));

    wofi.addEventListener('keydown', (event) => {
        const items = visibleWofiItems();
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            setWofiSelection(wofiIndex + (event.key === 'ArrowDown' ? 1 : -1));
            if (document.activeElement !== wofiInput) items[wofiIndex]?.focus({ preventScroll: true });
        } else if (event.key === 'Enter' && event.target === wofiInput) {
            event.preventDefault();
            items[wofiIndex]?.click();
        }
    });

    wofiItems.forEach(item => {
        item.addEventListener('pointerenter', () => setWofiSelection(visibleWofiItems().indexOf(item), { scroll: false }));
        item.addEventListener('focus', () => setWofiSelection(visibleWofiItems().indexOf(item), { scroll: false }));
        item.addEventListener('click', () => {
            if (item.dataset.app) {
                closeWofi();
                openWindow(item.dataset.app);
            } else if (item.target === '_blank') {
                closeWofi();
            }
        });
    });

    // Any press outside the launcher closes it.
    document.addEventListener('pointerdown', (event) => {
        if (wofi.classList.contains('active') && !wofi.contains(event.target) && !wofiBtn.contains(event.target)) {
            closeWofi();
        }
    });

    /* ─── 7. KEYBOARD SHORTCUTS ─── */
    const isTyping = (target) => target instanceof HTMLElement &&
        (target.matches('input, textarea, select') || target.isContentEditable);

    // A lone tap on Super toggles Wofi. Chords such as Cmd+C or Super+Tab never trigger it.
    let superArmed = false;
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Meta' || event.key === 'OS' || event.key === 'Super') {
            superArmed = !event.repeat;
            return;
        }
        superArmed = false;

        if (event.key === 'Escape') {
            if (!ctxMenu.hidden) {
                hideContextMenu();
            } else if (wofi.classList.contains('active')) {
                closeWofi({ restoreFocus: true });
            }
            return;
        }

        if (isTyping(event.target) || !event.altKey || event.ctrlKey || event.metaKey) return;

        // Alt stands in for Super, since browsers reserve most Super chords.
        const digit = /^Digit([1-4])$/.exec(event.code);
        if (digit) {
            event.preventDefault();
            goToWorkspace(Number(digit[1]));
        } else if (event.code === 'KeyQ' && state.focused) {
            event.preventDefault();
            closeWindow(state.focused);
        } else if (event.code === 'Enter') {
            event.preventDefault();
            openWindow('win-cli');
        } else if (event.code === 'KeyF' && state.focused) {
            event.preventDefault();
            toggleMaximize(state.focused);
        }
    });

    document.addEventListener('keyup', (event) => {
        if ((event.key === 'Meta' || event.key === 'OS' || event.key === 'Super') && superArmed) {
            superArmed = false;
            toggleWofi();
        }
    });
    window.addEventListener('blur', () => { superArmed = false; });

    /* ─── 8. CONTEXT MENU AND TILING ─── */
    const ctxMenu = $('#context-menu');
    const ctxItems = $$('.cm-item', ctxMenu);

    function hideContextMenu() {
        ctxMenu.hidden = true;
    }

    document.addEventListener('contextmenu', (event) => {
        if (event.target.closest('.hypr-win, .waybar, #wofi-launcher, .context-menu, a, input')) return;
        event.preventDefault();
        ctxMenu.hidden = false;
        const { offsetWidth: w, offsetHeight: h } = ctxMenu;
        const x = Math.min(event.clientX, window.innerWidth - w - 6);
        const y = Math.min(event.clientY, window.innerHeight - h - 6);
        ctxMenu.style.left = `${Math.max(6, x)}px`;
        ctxMenu.style.top = `${Math.max(6, y)}px`;
        ctxItems[0].focus({ preventScroll: true });
    });

    document.addEventListener('pointerdown', (event) => {
        if (!ctxMenu.hidden && !ctxMenu.contains(event.target)) hideContextMenu();
    });

    ctxMenu.addEventListener('keydown', (event) => {
        if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
        event.preventDefault();
        const i = ctxItems.indexOf(document.activeElement);
        const next = (i + (event.key === 'ArrowDown' ? 1 : -1) + ctxItems.length) % ctxItems.length;
        ctxItems[next].focus();
    });

    ctxItems.forEach(item => {
        item.addEventListener('click', () => {
            hideContextMenu();
            const action = item.dataset.action;
            if (action === 'terminal') openWindow('win-cli');
            else if (action === 'launcher') openWofi();
            else if (action === 'tile') tileWorkspace();
            else if (action === 'theme') cycleTheme();
            else if (action === 'close-all') openWindowsIn(state.ws).forEach(closeWindow);
        });
    });

    /** Master and stack layout, the default feel of a tiling session. */
    function tileWorkspace() {
        const wins = openWindowsIn(state.ws)
            .sort((a, b) => (Number(b.style.zIndex) || 0) - (Number(a.style.zIndex) || 0));
        if (!wins.length) return 0;

        const g = gap();
        const top = topEdge();
        const width = window.innerWidth - 2 * g;
        const height = window.innerHeight - top - g;
        const setRect = (win, x, y, w, h) => {
            win.classList.remove('maximized');
            win.classList.add('is-tiling');
            Object.assign(win.style, { left: `${x}px`, top: `${y}px`, width: `${w}px`, height: `${h}px` });
            setTimeout(() => win.classList.remove('is-tiling'), motionMs(400));
        };

        if (wins.length === 1) {
            setRect(wins[0], g, top, width, height);
        } else if (isMobile()) {
            const h = (height - g * (wins.length - 1)) / wins.length;
            wins.forEach((win, i) => setRect(win, g, top + i * (h + g), width, h));
        } else {
            const masterW = (width - g) * 0.55;
            const stackW = width - g - masterW;
            const stackH = (height - g * (wins.length - 2)) / (wins.length - 1);
            setRect(wins[0], g, top, masterW, height);
            wins.slice(1).forEach((win, i) => setRect(win, g + masterW + g, top + i * (stackH + g), stackW, stackH));
        }
        return wins.length;
    }

    /* ─── 9. THEMES ─── */
    const THEMES = ['aurora', 'abyss', 'carbon', 'neon'];
    const themeCards = $$('.theme-card');
    const wallpaper = $('.wallpaper');
    const nfTheme = $('#nf-theme');
    const metaTheme = $('meta[name="theme-color"]');

    function setTheme(themeId, { persist = true } = {}) {
        if (!THEMES.includes(themeId)) return false;
        if (root.dataset.theme !== themeId && !motionQuery.matches) {
            wallpaper.classList.add('is-swapping');
            setTimeout(() => wallpaper.classList.remove('is-swapping'), 120);
        }
        root.dataset.theme = themeId;
        themeCards.forEach(card => card.setAttribute('aria-pressed', String(card.dataset.themeId === themeId)));
        nfTheme.textContent = themeId.charAt(0).toUpperCase() + themeId.slice(1);
        metaTheme.setAttribute('content', getComputedStyle(root).getPropertyValue('--bg-base').trim());
        if (persist) storage.set('linux-desk-theme', themeId);
        return true;
    }

    function cycleTheme() {
        const i = THEMES.indexOf(root.dataset.theme);
        setTheme(THEMES[(i + 1) % THEMES.length]);
    }

    themeCards.forEach(card => card.addEventListener('click', () => setTheme(card.dataset.themeId)));
    setTheme(storage.get('linux-desk-theme') || 'neon', { persist: false });

    $('#sys-theme').addEventListener('click', () => toggleWindow('win-theme'));
    ['#sys-cpu', '#sys-ram', '#sys-net', '#sys-battery'].forEach(sel => {
        $(sel).addEventListener('click', () => toggleWindow('win-btop'));
    });

    /* ─── 10. DEVICE STATUS ───
       Values come from browser APIs. Modules without data are hidden rather than faked. */
    const device = {
        cores: navigator.hardwareConcurrency || null,
        memory: navigator.deviceMemory || null,
        lang: navigator.language ? navigator.language.split('-')[0].toUpperCase() : null,
        battery: null,
        charging: null
    };

    function setModule(sel, value) {
        const module = $(sel);
        if (value == null) {
            module.hidden = true;
            return;
        }
        module.hidden = false;
        $('.val', module).textContent = value;
    }

    function updateNetwork() {
        const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        const icon = $('#sys-net i');
        if (!navigator.onLine) {
            setModule('#sys-net', 'OFF');
            icon.className = 'ri-wifi-off-line';
        } else {
            setModule('#sys-net', conn && conn.effectiveType ? conn.effectiveType.toUpperCase() : 'ON');
            icon.className = 'ri-wifi-line';
        }
    }

    setModule('#sys-cpu', device.cores ? `${device.cores}c` : null);
    setModule('#sys-ram', device.memory ? `${device.memory}G` : null);
    setModule('#sys-lang', device.lang);
    updateNetwork();
    window.addEventListener('online', updateNetwork);
    window.addEventListener('offline', updateNetwork);
    if (navigator.connection && navigator.connection.addEventListener) {
        navigator.connection.addEventListener('change', updateNetwork);
    }

    if (navigator.getBattery) {
        navigator.getBattery().then(battery => {
            const icon = $('#bat-icon');
            const update = () => {
                const level = Math.round(battery.level * 100);
                device.battery = level;
                device.charging = battery.charging;
                setModule('#sys-battery', `${level}%`);
                if (battery.charging) icon.className = 'ri-battery-2-charge-line';
                else if (level > 60) icon.className = 'ri-battery-fill';
                else if (level > 20) icon.className = 'ri-battery-2-line';
                else icon.className = 'ri-battery-low-line';
                icon.style.color = !battery.charging && level <= 20 ? 'var(--c-red)' : battery.charging ? 'var(--c-green)' : '';
            };
            update();
            battery.addEventListener('levelchange', update);
            battery.addEventListener('chargingchange', update);
        }).catch(() => { /* keep the AC fallback */ });
    }

    /* ─── 11. BTOP SIMULATION ─── */
    const btop = {
        timer: 0,
        history: Array.from({ length: 48 }, () => 20 + Math.random() * 30),
        graph: $('#btop-graph'),
        procs: $('#btop-procs'),
        load: new Map()
    };

    btop.history.forEach(() => btop.graph.appendChild(el('i')));
    $('#btop-cores').textContent = device.cores ? `${device.cores} logical cores reported` : 'cores not shared by browser';
    $('#btop-memtotal').textContent = device.memory ? `about ${device.memory} GB reported` : 'memory not shared by browser';

    const jitter = (value, spread, min, max) => Math.min(max, Math.max(min, value + (Math.random() * 2 - 1) * spread));

    function setMeter(id, value) {
        $(`#${id}`).textContent = `${Math.round(value)}%`;
        $(`#${id}-bar`).style.setProperty('--v', `${value}%`);
    }

    function renderProcesses() {
        if (!btop.procs) return;
        const rows = [
            { pid: 1, user: 'root', cmd: 'Hyprland', base: 6 },
            { pid: 112, user: 'tanmay', cmd: 'waybar', base: 1.2 }
        ];
        if (wofi.classList.contains('active')) rows.push({ pid: 241, user: 'tanmay', cmd: 'wofi --show drun', base: 1.5 });
        $$('.hypr-win.open').forEach(win => {
            const cmd = win.id === 'win-btop' ? 'btop' : win.id === 'win-theme' ? 'hyprpaper' : `kitty ${win.dataset.name}`;
            rows.push({ pid: state.pids.get(win.id), user: 'tanmay', cmd, base: win.id === 'win-btop' ? 3 : 1.4, win });
        });

        btop.procs.replaceChildren(...rows.map(row => {
            const key = row.cmd;
            const prev = btop.load.get(key) || { cpu: row.base, mem: row.base * 0.6 };
            const next = { cpu: jitter(prev.cpu, 0.8, 0.1, 18), mem: jitter(prev.mem, 0.2, 0.1, 9) };
            btop.load.set(key, next);
            const tr = el('tr', {}, [
                el('td', { text: row.pid }),
                el('td', { text: row.user }),
                el('td', { text: next.cpu.toFixed(1) }),
                el('td', { text: next.mem.toFixed(1) }),
                el('td', { text: row.cmd })
            ]);
            if (row.win && row.win === state.focused) tr.className = 'is-focused';
            return tr;
        }));
    }

    function tickBtop() {
        const last = btop.history[btop.history.length - 1];
        const cpu = jitter(last, 14, 6, 94);
        btop.history.push(cpu);
        btop.history.shift();
        $$('i', btop.graph).forEach((bar, i) => bar.style.setProperty('--h', `${btop.history[i]}%`));

        setMeter('btop-cpu', cpu);
        setMeter('btop-mem', jitter(Number($('#btop-mem-bar').style.getPropertyValue('--v').replace('%', '')) || 58, 3, 35, 85));
        setMeter('btop-swp', jitter(4, 2, 0, 12));
        setMeter('btop-dsk', 32 + Math.random() * 2);

        const conn = navigator.connection;
        const base = conn && conn.downlink ? conn.downlink / 8 : 2.5;
        $('#btop-down').textContent = jitter(base, base * 0.4, 0, 99).toFixed(1);
        $('#btop-up').textContent = jitter(base / 4, base * 0.15, 0, 50).toFixed(1);

        const bat = device.battery == null ? 'AC' : `${device.battery}%${device.charging ? ' charging' : ''}`;
        $('#btop-sys').textContent = `lang ${device.lang || '--'} | bat ${bat}`;
        renderProcesses();
    }

    function startBtop() {
        if (btop.timer) return;
        tickBtop();
        btop.timer = setInterval(() => {
            if (!document.hidden) tickBtop();
        }, 1600);
    }

    function stopBtop() {
        clearInterval(btop.timer);
        btop.timer = 0;
    }

    /* ─── 12. FASTFETCH AVATAR ───
       Converts the live GitHub avatar into coloured ASCII. Falls back to the Arch logo. */
    function renderAscii() {
        const container = $('#nf-ascii-art');
        const RAMP = ' .\'`^",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$';
        const COLS = 36;
        const ROWS = 20;

        const fallback = () => {
            const ARCH = [
                '                  -`',
                '                 .o+`',
                '                `ooo/',
                '               `+oooo:',
                '              `+oooooo:',
                '              -+oooooo+:',
                '            `/:-:++oooo+:',
                '           `/++++/+++++++:',
                '          `/++++++++++++++:',
                '         `/+++ooooooooooooo/`',
                '        ./ooosssso++osssssso+`',
                '       .oossssso-````/ossssss+`',
                '      -osssssso.      :ssssssso.',
                '     :osssssss/        osssso+++.',
                '    /ossssssss/        +ssssooo/-',
                '  `/ossssso+/:-        -:/+osssso+-',
                ' `+sso+:-`                 `.-/+oso:',
                '`++:.                           `-/+/',
                '.`                                 `/'
            ];
            container.classList.add('is-fallback');
            container.replaceChildren(el('pre', { class: 'c-blue', text: ARCH.join('\n') }));
        };

        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = COLS;
            canvas.height = ROWS;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            ctx.drawImage(img, 0, 0, COLS, ROWS);
            let data;
            try {
                data = ctx.getImageData(0, 0, COLS, ROWS).data;
            } catch (err) {
                fallback();
                return;
            }

            // First pass: blend transparency and measure the brightness range.
            const pixels = [];
            let minL = 1;
            let maxL = 0;
            for (let i = 0; i < data.length; i += 4) {
                const alpha = data[i + 3] / 255;
                const r = data[i] * alpha + 18 * (1 - alpha);
                const g = data[i + 1] * alpha + 18 * (1 - alpha);
                const b = data[i + 2] * alpha + 18 * (1 - alpha);
                const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
                minL = Math.min(minL, lum);
                maxL = Math.max(maxL, lum);
                pixels.push([r, g, b, lum]);
            }

            // Second pass: stretch contrast for the glyph ramp and lift dark colours
            // while keeping the avatar's own hues.
            const range = Math.max(0.05, maxL - minL);
            const lift = Math.min(3, 0.85 / Math.max(0.1, maxL));
            const pre = document.createElement('pre');
            pixels.forEach(([r, g, b, lum], index) => {
                const level = (lum - minL) / range;
                const span = document.createElement('span');
                span.textContent = RAMP[Math.floor(level * (RAMP.length - 1))];
                const tone = (c) => Math.min(255, Math.round(c * lift + 24));
                span.style.color = `rgb(${tone(r)}, ${tone(g)}, ${tone(b)})`;
                pre.appendChild(span);
                if ((index + 1) % COLS === 0) pre.appendChild(document.createTextNode('\n'));
            });
            container.replaceChildren(pre);
        };
        img.onerror = fallback;
        img.src = 'https://avatars.githubusercontent.com/u/89214022?v=4&s=120';
    }
    renderAscii();

    /* ─── 13. TERMINAL ─── */
    const cliInput = $('#cli-input');
    const cliForm = $('#cli-form');
    const cliOutput = $('#cli-output');
    const cliContainer = $('#cli-container');
    const history = [];
    let historyIndex = 0;

    const PROJECTS = [
        { name: 'blend', title: 'Blend', url: 'https://github.com/tanmayhutt/blend', note: 'compare YouTube tastes, privately' },
        { name: 'thwip', title: 'Thwip', url: 'https://github.com/tanmayhutt/thwip-cli', note: 'switch local coding agents, keep context' },
        { name: 'arch-server', title: 'Arch server', url: 'https://github.com/tanmayhutt/arch-server', note: 'headless Arch node from an old laptop' },
        { name: 'filmedin', title: 'FilmedIn', url: 'https://github.com/tanmayhutt/FilmedIn', note: 'track films, build playlists' },
        { name: 'wifisense', title: 'WiFiSense', url: 'https://github.com/tanmayhutt/WiFiSense', note: 'presence sensing from Wi-Fi signal' }
    ];

    const LINKS = {
        resume: 'https://tanmaytiwari.me/resume/',
        email: 'mailto:tiwaritanmay1021@gmail.com',
        github: 'https://github.com/tanmayhutt',
        linkedin: 'https://www.linkedin.com/in/tanmay-tiwari-72719526a/',
        youtube: 'https://www.youtube.com/@saul.3gp',
        instagram: 'https://www.instagram.com/tanmayhutt',
        home: 'https://tanmaytiwari.me/',
        'spotify-desk': '/spotify-desk/',
        'nokia-desk': '/nokia-desk/'
    };

    const APPS = {
        about: 'win-about',
        whoami: 'win-about',
        projects: 'win-projects',
        stack: 'win-stack',
        contact: 'win-connect',
        btop: 'win-btop',
        themes: 'win-theme',
        terminal: 'win-cli'
    };

    const BIO = "I'm a student and independent builder. I learn fastest by making real things, finding where they break, and refining them until the interaction feels right.";

    function print(content, cls = '') {
        const line = el('div', { class: `out-line ${cls}`.trim() }, content);
        cliOutput.appendChild(line);
        return line;
    }

    const link = (href, text) => el('a', {
        href,
        ...(href.startsWith('http') && !href.startsWith(LINKS.home) ? { target: '_blank', rel: 'noopener noreferrer' } : {})
    }, text);

    function printGrid(rows) {
        print(el('div', { class: 'cli-grid' }, rows.flatMap(([a, b]) => [
            el('span', { class: 'c-green' }, a),
            el('span', { class: 'c-dim' }, b)
        ])));
    }

    function contactRows() {
        return [
            ['email', link(LINKS.email, 'tiwaritanmay1021@gmail.com')],
            ['github', link(LINKS.github, 'github.com/tanmayhutt')],
            ['linkedin', link(LINKS.linkedin, 'in/tanmay-tiwari-72719526a')],
            ['youtube', link(LINKS.youtube, '@saul.3gp')],
            ['instagram', link(LINKS.instagram, '@tanmayhutt')],
            ['resume', link(LINKS.resume, 'tanmaytiwari.me/resume')]
        ];
    }

    function openTarget(name) {
        if (APPS[name]) {
            openWindow(APPS[name], { focusContent: name === 'terminal' });
            return `opening ${name}`;
        }
        const project = PROJECTS.find(p => p.name === name);
        const url = project ? project.url : LINKS[name];
        if (!url) return null;
        if (url.startsWith('mailto:') || url.startsWith('/') || url === LINKS.home) {
            window.location.href = url;
        } else {
            window.open(url, '_blank', 'noopener');
        }
        return `opening ${url.replace(/^mailto:|^https?:\/\/(www\.)?/, '')}`;
    }

    const COMMANDS = {
        help: {
            desc: 'list commands',
            run() {
                printGrid(Object.entries(COMMANDS).map(([name, cmd]) => [name, cmd.desc]));
            }
        },
        whoami: {
            desc: 'who is Tanmay',
            run() {
                print('tanmay', 'c-green');
                print('Student and independent builder: full-stack software, developer tools, Linux infrastructure, embedded hardware and video.');
            }
        },
        fastfetch: {
            desc: 'open the about window',
            run() { print(openTarget('about'), 'c-dim'); }
        },
        projects: {
            desc: 'list selected projects',
            run() {
                printGrid(PROJECTS.map(p => [p.name, el('span', {}, [link(p.url, p.title), `  ${p.note}`])]));
                print('Try: open blend', 'c-dim');
            }
        },
        contact: {
            desc: 'email and social links',
            run() { printGrid(contactRows()); }
        },
        resume: {
            desc: 'link to the resume',
            run() { print(link(LINKS.resume, 'tanmaytiwari.me/resume/')); }
        },
        open: {
            desc: 'open an app, project or link',
            run(args) {
                const target = (args[0] || '').toLowerCase();
                if (!target) {
                    print('usage: open <name>', 'c-yellow');
                    print(`apps: ${Object.keys(APPS).join(' ')}`, 'c-dim');
                    print(`projects: ${PROJECTS.map(p => p.name).join(' ')}`, 'c-dim');
                    print(`links: ${Object.keys(LINKS).join(' ')}`, 'c-dim');
                    return;
                }
                const result = openTarget(target);
                if (result) print(result, 'c-dim');
                else print(`open: no such app, project or link: ${target}`, 'c-red');
            }
        },
        ls: {
            desc: 'list files',
            run(args) {
                if ((args[0] || '').replace(/\/$/, '') === 'projects') {
                    print(el('span', { class: 'c-blue' }, PROJECTS.map(p => `${p.name}/`).join('  ')));
                    return;
                }
                print(el('span', {}, [el('span', { class: 'c-blue' }, 'projects/'), '  bio.txt  contact.txt  stack.json']));
            }
        },
        cat: {
            desc: 'read a file',
            run(args) {
                const file = args[0];
                if (file === 'bio.txt') print(BIO);
                else if (file === 'contact.txt') printGrid(contactRows());
                else if (file === 'stack.json') print(openTarget('stack'), 'c-dim');
                else if (!file) print('usage: cat <file>', 'c-yellow');
                else print(`cat: ${file}: No such file or directory`, 'c-red');
            }
        },
        theme: {
            desc: 'list or set a theme',
            run(args) {
                const name = (args[0] || '').toLowerCase();
                if (!name) {
                    print(THEMES.map(t => (t === root.dataset.theme ? `[${t}]` : t)).join('  '));
                    return;
                }
                if (setTheme(name)) print(`theme set to ${name}`, 'c-dim');
                else print(`theme: unknown theme: ${name}`, 'c-red');
            }
        },
        ws: {
            desc: 'switch workspace (1 to 4)',
            run(args) {
                const n = Number(args[0]);
                if (n >= 1 && n <= WS_COUNT) {
                    // The terminal travels with you, like a pinned window.
                    goToWorkspace(n);
                    openWindow('win-cli');
                } else {
                    print('usage: ws <1-4>', 'c-yellow');
                }
            }
        },
        tile: {
            desc: 'tile windows on this workspace',
            run() {
                const count = tileWorkspace();
                print(`tiled ${count} window${count === 1 ? '' : 's'}`, 'c-dim');
            }
        },
        history: {
            desc: 'show command history',
            run() {
                history.forEach((cmd, i) => print(`${String(i + 1).padStart(4)}  ${cmd}`));
            }
        },
        date: {
            desc: 'print the date',
            run() { print(new Date().toString()); }
        },
        echo: {
            desc: 'print text',
            run(args, raw) { print(raw.replace(/^\s*echo\s?/i, '')); }
        },
        pwd: {
            desc: 'print working directory',
            run() { print('/home/tanmay'); }
        },
        sudo: {
            desc: 'try it',
            run() { print('tanmay is not in the sudoers file. This incident will be reported.', 'c-red'); }
        },
        clear: {
            desc: 'clear the screen (Ctrl+L)',
            run() { cliOutput.replaceChildren(); }
        },
        exit: {
            desc: 'close the terminal',
            run() { closeWindow($('#win-cli')); }
        }
    };

    const ALIASES = { neofetch: 'fastfetch', about: 'fastfetch', socials: 'contact', cls: 'clear', cd: 'cd' };

    function runCommand(raw) {
        const trimmed = raw.trim();
        print(el('span', { class: 'prompt-line' }, [
            el('span', { class: 'p-user' }, 'tanmay@hypr'),
            el('span', { class: 'p-dir' }, '~'),
            el('span', { class: 'p-arrow' }, '$'),
            el('span', { class: 'p-cmd' }, trimmed)
        ]), 'mt-2');
        if (!trimmed) return;

        history.push(trimmed);
        historyIndex = history.length;

        const [first, ...args] = trimmed.split(/\s+/);
        let name = first.toLowerCase();
        name = ALIASES[name] || name;

        if (name === 'cd') {
            print('cd: this desk is read-only. Try: open projects', 'c-yellow');
        } else if (COMMANDS[name]) {
            COMMANDS[name].run(args, trimmed);
        } else {
            print(`zsh: command not found: ${first}`, 'c-red');
        }
    }

    function completeInput() {
        const value = cliInput.value;
        const parts = value.split(/\s+/);
        let pool;
        if (parts.length <= 1) {
            pool = Object.keys(COMMANDS);
        } else if (parts[0] === 'open') {
            pool = [...Object.keys(APPS), ...PROJECTS.map(p => p.name), ...Object.keys(LINKS)];
        } else if (parts[0] === 'theme') {
            pool = THEMES;
        } else if (parts[0] === 'cat') {
            pool = ['bio.txt', 'contact.txt', 'stack.json'];
        } else {
            return;
        }
        const partial = parts[parts.length - 1].toLowerCase();
        const matches = [...new Set(pool)].filter(option => option.startsWith(partial));
        if (matches.length === 1) {
            parts[parts.length - 1] = matches[0];
            cliInput.value = `${parts.join(' ')} `;
        } else if (matches.length > 1) {
            print(matches.join('  '), 'c-dim');
            scrollTerminal();
        }
    }

    const scrollTerminal = () => { cliContainer.scrollTop = cliContainer.scrollHeight; };

    cliForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const raw = cliInput.value;
        cliInput.value = '';
        runCommand(raw);
        scrollTerminal();
    });

    cliInput.addEventListener('keydown', (event) => {
        if (event.key === 'Tab') {
            event.preventDefault();
            completeInput();
        } else if (event.key === 'ArrowUp' && history.length) {
            event.preventDefault();
            historyIndex = Math.max(0, historyIndex - 1);
            cliInput.value = history[historyIndex];
        } else if (event.key === 'ArrowDown' && history.length) {
            event.preventDefault();
            historyIndex = Math.min(history.length, historyIndex + 1);
            cliInput.value = history[historyIndex] || '';
        } else if (event.ctrlKey && event.key.toLowerCase() === 'l') {
            event.preventDefault();
            cliOutput.replaceChildren();
        } else if (event.ctrlKey && event.key.toLowerCase() === 'c') {
            if (cliInput.selectionStart !== cliInput.selectionEnd) return;
            event.preventDefault();
            print(`${cliInput.value}^C`, 'c-dim');
            cliInput.value = '';
            scrollTerminal();
        }
    });

    // Clicking the terminal focuses the prompt, unless the visitor is selecting text or following a link.
    cliContainer.addEventListener('click', (event) => {
        if (event.target.closest('a') || String(window.getSelection())) return;
        cliInput.focus({ preventScroll: true });
    });

    /* ─── BOOT ─── */
    // The desktop clips overflow; never let focus or find-in-page scroll it out of place.
    const desktop = $('#desktop');
    desktop.addEventListener('scroll', () => {
        desktop.scrollLeft = 0;
        desktop.scrollTop = 0;
    });

    goToWorkspace(1, { announce: false });
    wofi.classList.add('active');
    filterWofi('');
    if (finePointer.matches) wofiInput.focus({ preventScroll: true });
})();
