/*
  TopNovelsUI — Portal "Top Novels" section (hidden when catalog unavailable)
*/
"use strict";

class TopNovelsUI { // eslint-disable-line no-unused-vars

    static _loadGeneration = 0;

    static init() {
        const section = document.getElementById("topNovelsSection");
        if (!section || typeof HFStatsLibrary === "undefined") {
            return;
        }

        TopNovelsUI._bindTabs();
        TopNovelsUI.load("all");
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
        section.hidden = true;
        row.innerHTML = "";

        try {
            const result = await HFStatsLibrary.fetchTopNovels({ mode, limit: 16 });
            if (generation !== TopNovelsUI._loadGeneration) {
                return;
            }
            if (!result?.entries?.length) {
                return;
            }
            TopNovelsUI._render(row, result.entries, mode);
            section.hidden = false;
        } catch (e) {
            if (generation !== TopNovelsUI._loadGeneration) {
                return;
            }
            console.warn("[TopNovels] Catalog unavailable, hiding section:", e.message);
            section.hidden = true;
            row.innerHTML = "";
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
            card.addEventListener("click", () => TopNovelsUI._openNovel(entry));
            container.appendChild(card);
        });
    }

    static _openNovel(entry) {
        const url = entry.url || "";
        if (/^https?:\/\//i.test(url)) {
            const lrPath = (window.location.pathname.includes("/plugin/") || window.location.protocol === "chrome-extension:")
                ? "live-reader.html"
                : "plugin/live-reader.html";
            window.location.href = `${lrPath}?url=${encodeURIComponent(url)}`;
            return;
        }
        if (typeof window.showView === "function") {
            window.showView("librariesView");
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
