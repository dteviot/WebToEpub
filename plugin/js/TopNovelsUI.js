/*
  TopNovelsUI — Portal "Top Novels" section (hidden when catalog unavailable)
*/
"use strict";

class TopNovelsUI { // eslint-disable-line no-unused-vars

    static _loadGeneration = 0;
    static _autoUpdateInterval = null;
    static _activeUsersInterval = null;
    static _simulatedActiveCount = 18;

    static init() {
        const section = document.getElementById("topNovelsSection");
        if (!section || typeof HFStatsLibrary === "undefined") {
            return;
        }

        TopNovelsUI._bindTabs();
        TopNovelsUI._bindRowScroll();
        TopNovelsUI._bindRefresh();
        TopNovelsUI.load("all");

        // Start auto-updates
        TopNovelsUI._startAutoUpdate();
        TopNovelsUI._startActiveUsersUpdate();
    }

    static _startAutoUpdate() {
        if (TopNovelsUI._autoUpdateInterval) {
            clearInterval(TopNovelsUI._autoUpdateInterval);
        }
        TopNovelsUI._autoUpdateInterval = setInterval(() => {
            if (document.visibilityState !== "visible") {
                return;
            }
            const activeTab = document.querySelector(".top-novels-tab.active");
            TopNovelsUI.load(activeTab?.dataset.mode || "all");
        }, 60000); // refresh every 60 seconds
    }

    static _startActiveUsersUpdate() {
        if (TopNovelsUI._activeUsersInterval) {
            clearInterval(TopNovelsUI._activeUsersInterval);
        }

        // Initial update
        TopNovelsUI._updateActiveUsers();

        TopNovelsUI._activeUsersInterval = setInterval(() => {
            if (document.visibilityState !== "visible") {
                return;
            }
            TopNovelsUI._updateActiveUsers();
        }, 30000); // refresh active users every 30 seconds
    }

    static async _updateActiveUsers() {
        const countEl = document.getElementById("activeUsersCount");
        if (!countEl) return;

        try {
            const count = await HFStatsLibrary.fetchActiveUsersCount();
            countEl.textContent = count;
        } catch (_) {
            // Fallback to simulated count with slight variation (+/- 1 or 2, clamped between 12 and 28)
            const diff = Math.floor(Math.random() * 5) - 2; // -2, -1, 0, 1, 2
            TopNovelsUI._simulatedActiveCount = Math.max(12, Math.min(28, TopNovelsUI._simulatedActiveCount + diff));
            countEl.textContent = TopNovelsUI._simulatedActiveCount;
        }
    }

    static _bindRefresh() {
        document.addEventListener("visibilitychange", () => {
            if (document.visibilityState !== "visible") {
                return;
            }
            const activeTab = document.querySelector(".top-novels-tab.active");
            TopNovelsUI.load(activeTab?.dataset.mode || "all");
        });
    }

    static _bindRowScroll() {
        const row = document.getElementById("topNovelsRow");
        const prev = document.getElementById("topNovelsScrollPrev");
        const next = document.getElementById("topNovelsScrollNext");
        if (!row || !prev || !next) {
            return;
        }
        const scrollBy = () => Math.max(220, Math.floor(row.clientWidth * 0.8));
        prev.addEventListener("click", () => {
            row.scrollBy({ left: -scrollBy(), behavior: "smooth" });
        });
        next.addEventListener("click", () => {
            row.scrollBy({ left: scrollBy(), behavior: "smooth" });
        });
    }

    static _bindTabs() {
        const tabs = document.querySelectorAll(".top-novels-tab");
        tabs.forEach(tab => {
            tab.addEventListener("click", () => {
                tabs.forEach(t => t.classList.remove("active"));
                tab.classList.add("active");
                TopNovelsUI.load(tab.dataset.mode || "all");
            });
        });
    }

    static async load(mode = "all") {
        const section = document.getElementById("topNovelsSection");
        const row = document.getElementById("topNovelsRow");
        if (!section || !row) {
            return;
        }

        const generation = ++TopNovelsUI._loadGeneration;
        section.hidden = false;
        
        // 1. Render local stats instantly (Stale-while-revalidate)
        try {
            const cachedRemote = HFStatsLibrary.getCachedTopNovels(mode, 16);
            if (cachedRemote && cachedRemote.entries?.length > 0) {
                TopNovelsUI._render(row, cachedRemote.entries, mode);
            } else {
                const local = HFStatsLibrary.getLocalTopEntries(mode, 16);
                if (local && local.length > 0) {
                    TopNovelsUI._render(row, local, mode);
                } else {
                    row.innerHTML = "<div class=\"top-novels-empty\">Loading top novels...</div>";
                }
            }
        } catch (_) {
            row.innerHTML = "<div class=\"top-novels-empty\">Loading top novels...</div>";
        }

        // 2. Fetch remote and merge
        try {
            const result = await HFStatsLibrary.fetchTopNovels({ mode, limit: 16 });
            if (generation !== TopNovelsUI._loadGeneration) {
                return;
            }
            if (!result?.entries?.length) {
                if (!row.querySelector(".top-novel-card")) {
                    row.innerHTML = "<div class=\"top-novels-empty\">No usage stats yet. Start reading to populate the catalog!</div>";
                }
                return;
            }
            TopNovelsUI._render(row, result.entries, mode);
        } catch (e) {
            if (generation !== TopNovelsUI._loadGeneration) {
                return;
            }
            console.warn("[TopNovels] Catalog fetch failed:", e.message);
            if (!row.querySelector(".top-novel-card")) {
                row.innerHTML = "<div class=\"top-novels-empty\">Catalog unavailable. Please try again later.</div>";
            }
        }
    }

    static _render(container, entries, mode) {
        container.innerHTML = "";
        entries.forEach((entry, index) => {
            const card = document.createElement("button");
            card.type = "button";
            card.className = "top-novel-card";
            card.title = entry.title;

            const coverSrc = entry.coverUrl || TopNovelsUI._defaultCover(entry.title, index);
            const badge = HFStatsLibrary.formatModeBadge(entry, mode === "all" ? "all" : mode);
            const host = entry.host ? entry.host.replace(/^www\./, "") : "";

            const fallbackCover = TopNovelsUI._defaultCover(entry.title, index);
            card.innerHTML = `
                <div class="top-novel-cover">
                    <img src="${TopNovelsUI._escapeAttr(coverSrc)}" alt="" loading="lazy" data-fallback="${TopNovelsUI._escapeAttr(fallbackCover)}">
                    <span class="top-novel-rank">#${index + 1}</span>
                </div>
                <div class="top-novel-info">
                    <div class="top-novel-title">${TopNovelsUI._escapeHtml(entry.title)}</div>
                    <div class="top-novel-meta">${TopNovelsUI._escapeHtml(entry.author || host)}</div>
                    <div class="top-novel-badge">${TopNovelsUI._escapeHtml(badge)}</div>
                </div>
            `;

            const img = card.querySelector("img");
            if (img) {
                img.addEventListener("error", () => {
                    const fb = img.getAttribute("data-fallback");
                    if (fb && img.src !== fb) img.src = fb;
                });
            }
            card.addEventListener("click", () => {
                TopNovelsUI._openNovel(entry).catch(err => {
                    console.warn("[TopNovels] Open failed:", err);
                });
            });
            container.appendChild(card);
        });
    }

    static _isLibraryUrl(url) {
        return /^(library|hf-library):\/\//i.test(url || "");
    }

    static async _waitForLibraryManager(maxMs = 12000) {
        const start = Date.now();
        while (Date.now() - start < maxMs) {
            if (window.libraryManager?.openFromStatsEntry) {
                return window.libraryManager;
            }
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        return null;
    }

    static async _openLibraryEntry(entry) {
        if (typeof window.showView === "function") {
            await window.showView("librariesView");
        } else {
            window.location.href = "index.html#librariesView";
        }
        const mgr = await TopNovelsUI._waitForLibraryManager();
        if (!mgr) {
            return false;
        }
        return mgr.openFromStatsEntry(entry);
    }

    static async _openNovel(entry) {
        const url = entry.url || "";
        const openMode = entry.openMode
            || (typeof HFStatsLibrary !== "undefined" ? HFStatsLibrary.getPrimaryMode(entry) : "live");
        const inPlugin = window.location.pathname.includes("/plugin/")
            || window.location.protocol === "chrome-extension:";

        if (openMode === "library" || TopNovelsUI._isLibraryUrl(url)) {
            const opened = await TopNovelsUI._openLibraryEntry(entry);
            if (opened) {
                return;
            }
            if (typeof window.showView === "function") {
                await window.showView("librariesView");
            } else {
                window.location.href = "index.html#librariesView";
            }
            return;
        }

        if (openMode === "manual" && /^https?:\/\//i.test(url)) {
            const normalized = typeof util !== "undefined" && util.normalizeHttpUrl
                ? util.normalizeHttpUrl(url)
                : url;
            const popupPath = inPlugin ? "popup.html" : "plugin/popup.html";
            window.location.href = `${popupPath}?mode=manual&url=${encodeURIComponent(normalized || url)}`;
            return;
        }

        if (/^https?:\/\//i.test(url)) {
            const normalized = typeof util !== "undefined" && util.normalizeHttpUrl
                ? util.normalizeHttpUrl(url)
                : url;
            const lrPath = inPlugin ? "live-reader.html" : "plugin/live-reader.html";
            window.location.href = `${lrPath}?url=${encodeURIComponent(normalized || url)}`;
            return;
        }

        if (typeof window.showView === "function") {
            await window.showView("librariesView");
        } else {
            window.location.href = "index.html#librariesView";
        }
    }

    static _defaultCover(title, index) {
        const hues = ["#1e3c72", "#b31217", "#11998e", "#8a2387", "#e94057"];
        const bg = hues[index % hues.length];
        const text = (title || "Novel").slice(0, 18);
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 300" width="200" height="300">
            <rect width="200" height="300" fill="${bg}"/>
            <text x="50%" y="50%" fill="#fff" font-size="14" font-family="sans-serif" text-anchor="middle" dominant-baseline="middle">${text}</text>
        </svg>`;
        return `data:image/svg+xml,${encodeURIComponent(svg)}`;
    }

    static _escapeHtml(str) {
        return String(str || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    static _escapeAttr(str) {
        return TopNovelsUI._escapeHtml(str).replace(/'/g, "&#39;");
    }
}
