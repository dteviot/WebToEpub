/*
  HFStatsLibrary — Anonymous usage stats for Top Novels
  Records events via Cloudflare Worker; reads aggregated stats-catalog.json from HF CDN.
  Never embeds or sends a Hugging Face token — reads are public CDN, writes go to the worker.
*/
"use strict";

class HFStatsLibrary { // eslint-disable-line no-unused-vars

    static WORKER_URL = localStorage.getItem("hf_worker_url")
        || (typeof HFLibrary !== "undefined" ? HFLibrary.WORKER_URL : null)
        || "https://webtoepub-hf-proxy.telegram-bridge.workers.dev";

    static STATS_REPO_ID = "prasadonly/webtoepub-library";
    static STATS_CATALOG_FILE = "stats-catalog.json";
    static FETCH_TIMEOUT_MS = 6000;
    static _reportedReads = new Set();

    static getStatsCatalogUrl() {
        return `https://huggingface.co/datasets/${HFStatsLibrary.STATS_REPO_ID}/resolve/main/${HFStatsLibrary.STATS_CATALOG_FILE}`;
    }

    static getWorkerBase() {
        return String(HFStatsLibrary.WORKER_URL || "").replace(/\/$/, "");
    }

    static isContributingEnabled() {
        try {
            if (typeof UserPreferences !== "undefined") {
                const prefs = UserPreferences.readFromLocalStorage();
                if (prefs.contributeUsageStats) {
                    return prefs.contributeUsageStats.value !== false;
                }
            }
        } catch (_) { /* ignore */ }
        return localStorage.getItem("contributeUsageStats") !== "false";
    }

    static normalizeUrl(url) {
        if (!url || typeof url !== "string") {
            return "";
        }
        url = url.trim();
        if (!url) {
            return "";
        }
        try {
            const parsed = new URL(url);
            parsed.hash = "";
            parsed.search = "";
            let path = parsed.pathname.replace(/\/+$/, "") || "/";
            return `${parsed.protocol}//${parsed.hostname.toLowerCase()}${path}`;
        } catch (_) {
            return url.toLowerCase();
        }
    }

    static computeTotalScore(entry, modeFilter) {
        if (!entry || !entry.modes) {
            return 0;
        }
        const m = entry.modes;
        if (modeFilter === "live") {
            return (m.live?.reads || 0) + (m.live?.opens || 0);
        }
        if (modeFilter === "manual") {
            return m.manual?.epubConversions || 0;
        }
        if (modeFilter === "library") {
            return (m.library?.downloads || 0) + (m.library?.opens || 0) + (m.library?.reads || 0);
        }
        return (m.live?.reads || 0) + (m.live?.opens || 0)
            + (m.manual?.epubConversions || 0) * 3
            + (m.library?.downloads || 0) * 2
            + (m.library?.opens || 0)
            + (m.library?.reads || 0);
    }

    static formatModeBadge(entry, modeFilter) {
        if (!entry?.modes) {
            return "";
        }
        const m = entry.modes;
        if (modeFilter === "live") {
            const activity = (m.live?.reads || 0) + (m.live?.opens || 0);
            return `${activity} reads`;
        }
        if (modeFilter === "manual") {
            return `${m.manual?.epubConversions || 0} EPUBs`;
        }
        if (modeFilter === "library") {
            const dl = m.library?.downloads || 0;
            const opens = (m.library?.opens || 0) + (m.library?.reads || 0);
            return `${dl} dl · ${opens} opens`;
        }
        const parts = [];
        if (m.live?.reads) parts.push(`Live ${m.live.reads}`);
        if (m.manual?.epubConversions) parts.push(`EPUB ${m.manual.epubConversions}`);
        const lib = (m.library?.downloads || 0) + (m.library?.opens || 0) + (m.library?.reads || 0);
        if (lib) parts.push(`Lib ${lib}`);
        return parts.join(" · ") || "Popular";
    }

    static recordEvent({ url, mode, action, title, author, coverUrl }) {
        if (!HFStatsLibrary.isContributingEnabled()) {
            return;
        }
        const normalized = HFStatsLibrary.normalizeUrl(url);
        if (!normalized) {
            return;
        }

        if (mode === "live" && action === "read") {
            const dedupeKey = `${normalized}:${action}`;
            if (HFStatsLibrary._reportedReads.has(dedupeKey)) {
                return;
            }
            HFStatsLibrary._reportedReads.add(dedupeKey);
        }

        const base = HFStatsLibrary.getWorkerBase();
        if (!base) {
            return;
        }

        const payload = {
            url: normalized,
            mode: mode,
            action: action,
            title: (title || "").trim().slice(0, 200),
            author: (author || "").trim().slice(0, 120),
            coverUrl: (coverUrl || "").trim().slice(0, 500),
            host: (() => {
                try { return new URL(normalized).hostname; } catch (_) { return ""; }
            })(),
            ts: new Date().toISOString()
        };

        try {
            fetch(`${base}/stats/event`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
                keepalive: true,
                mode: "cors"
            }).catch(() => {});
        } catch (_) { /* fire-and-forget */ }
    }

    static async fetchTopNovels({ mode = "all", limit = 20, timeoutMs = HFStatsLibrary.FETCH_TIMEOUT_MS } = {}) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);

        try {
            const workerBase = HFStatsLibrary.getWorkerBase();
            if (workerBase) {
                try {
                    const workerCtrl = new AbortController();
                    const workerTimer = setTimeout(() => workerCtrl.abort(), 2000);
                    const workerUrl = `${workerBase}/stats/top?limit=${limit}${mode !== "all" ? `&mode=${encodeURIComponent(mode)}` : ""}`;
                    const resp = await fetch(workerUrl, { signal: workerCtrl.signal, cache: "no-store" });
                    clearTimeout(workerTimer);
                    if (resp.ok) {
                        const data = await resp.json();
                        const entries = HFStatsLibrary._normalizeEntries(data, mode, limit);
                        if (entries.length > 0) {
                            return { entries, source: "worker" };
                        }
                    }
                } catch (_) { /* fall through to HF CDN */ }
            }

            const catalogUrl = HFStatsLibrary.getStatsCatalogUrl();
            const resp = await fetch(catalogUrl, { signal: controller.signal, cache: "no-store" });
            if (!resp.ok) {
                throw new Error(`Catalog HTTP ${resp.status}`);
            }
            const data = await resp.json();
            const entries = HFStatsLibrary._normalizeEntries(data, mode, limit);
            if (entries.length === 0) {
                throw new Error("Empty catalog");
            }
            return { entries, source: "hf" };
        } finally {
            clearTimeout(timer);
        }
    }

    static _normalizeEntries(data, mode, limit) {
        let entries = [];
        if (Array.isArray(data)) {
            entries = data;
        } else if (Array.isArray(data?.entries)) {
            entries = data.entries;
        }
        entries = entries
            .filter(e => e && e.url)
            .filter(e => mode === "all" || HFStatsLibrary.computeTotalScore(e, mode) > 0)
            .map(e => ({
                url: e.url,
                title: e.title || HFStatsLibrary._titleFromUrl(e.url),
                author: e.author || "",
                coverUrl: e.coverUrl || "",
                host: e.host || (() => {
                    try { return new URL(e.url).hostname; } catch (_) { return ""; }
                })(),
                modes: e.modes || {},
                totalScore: e.totalScore != null ? e.totalScore : HFStatsLibrary.computeTotalScore(e, mode)
            }))
            .sort((a, b) => {
                const scoreA = mode === "all" ? a.totalScore : HFStatsLibrary.computeTotalScore(a, mode);
                const scoreB = mode === "all" ? b.totalScore : HFStatsLibrary.computeTotalScore(b, mode);
                return scoreB - scoreA;
            })
            .slice(0, limit);
        return entries;
    }

    static _titleFromUrl(url) {
        try {
            const parts = new URL(url).pathname.split("/").filter(Boolean);
            const last = parts[parts.length - 1] || url;
            return decodeURIComponent(last).replace(/[-_]/g, " ");
        } catch (_) {
            return url;
        }
    }
}
