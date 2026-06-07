/*
  HFStatsLibrary — Anonymous usage stats for Top Novels
  Records events locally (always) and via Cloudflare Worker when deployed.
  Reads rankings from worker + local storage; HF CDN is optional merge only.
*/
"use strict";

class HFStatsLibrary { // eslint-disable-line no-unused-vars

    static WORKER_URL = localStorage.getItem("hf_worker_url")
        || (typeof HFLibrary !== "undefined" ? HFLibrary.WORKER_URL : null)
        || "https://webtoepub-hf-proxy.telegram-bridge.workers.dev";

    static STATS_REPO_ID = "prasadonly/webtoepub-library";
    static STATS_CATALOG_FILE = "stats-catalog.json";
    static LOCAL_STATS_KEY = "wte_usage_stats_v1";
    static FETCH_TIMEOUT_MS = 6000;
    static WORKER_TOP_TIMEOUT_MS = 2500;
    static _reportedReads = new Set();
    static _WORKER_BLOCKED_KEY = "hf_stats_worker_blocked_v2";

    static isWorkerBlocked() {
        try {
            return localStorage.getItem(HFStatsLibrary._WORKER_BLOCKED_KEY) === "1";
        } catch (_) {
            return false;
        }
    }

    static markWorkerBlocked() {
        try {
            localStorage.setItem(HFStatsLibrary._WORKER_BLOCKED_KEY, "1");
        } catch (_) { /* ignore */ }
    }

    static clearWorkerBlocked() {
        try {
            localStorage.removeItem(HFStatsLibrary._WORKER_BLOCKED_KEY);
        } catch (_) { /* ignore */ }
    }

    static getStatsCatalogUrl() {
        const base = `https://huggingface.co/datasets/${HFStatsLibrary.STATS_REPO_ID}/resolve/main/${HFStatsLibrary.STATS_CATALOG_FILE}`;
        return `${base}?t=${Date.now()}`;
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

    static isSampleEntry(entry) {
        if (!entry) {
            return true;
        }
        if (entry.sample === true || entry.isSample === true) {
            return true;
        }
        const title = String(entry.title || "").toLowerCase();
        if (title.includes("sample ") || title.startsWith("sample")) {
            return true;
        }
        const url = String(entry.url || "").toLowerCase();
        const sampleUrls = [
            "novelfull.net/legend-of-swordsman",
            "wattpad.com/story/29396964",
            "wtr-lab.com/en/novel/serie-123/example-novel"
        ];
        return sampleUrls.some(s => url.includes(s));
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

    static getPrimaryMode(entry) {
        const modes = ["live", "manual", "library"];
        let best = "live";
        let bestScore = -1;
        for (const mode of modes) {
            const score = HFStatsLibrary.computeTotalScore(entry, mode);
            if (score > bestScore) {
                bestScore = score;
                best = mode;
            }
        }
        return best;
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

    static _readLocalStore() {
        try {
            const raw = localStorage.getItem(HFStatsLibrary.LOCAL_STATS_KEY);
            if (!raw) {
                return { entries: {} };
            }
            const parsed = JSON.parse(raw);
            if (!parsed || typeof parsed.entries !== "object") {
                return { entries: {} };
            }
            return parsed;
        } catch (_) {
            return { entries: {} };
        }
    }

    static _writeLocalStore(store) {
        try {
            localStorage.setItem(HFStatsLibrary.LOCAL_STATS_KEY, JSON.stringify(store));
        } catch (_) { /* ignore quota */ }
    }

    static _bumpMode(modes, mode, action) {
        if (!modes[mode]) {
            modes[mode] = {};
        }
        const bucket = modes[mode];
        const now = new Date().toISOString();
        if (mode === "live" && action === "read") {
            bucket.reads = (bucket.reads || 0) + 1;
        } else if (mode === "live" && action === "open") {
            bucket.opens = (bucket.opens || 0) + 1;
        } else if (mode === "manual" && action === "epub_convert") {
            bucket.epubConversions = (bucket.epubConversions || 0) + 1;
        } else if (mode === "library" && action === "download") {
            bucket.downloads = (bucket.downloads || 0) + 1;
        } else if (mode === "library" && action === "open") {
            bucket.opens = (bucket.opens || 0) + 1;
        } else if (mode === "library" && action === "read") {
            bucket.reads = (bucket.reads || 0) + 1;
        }
        bucket.lastAt = now;
        return modes;
    }

    static _mergeModeBuckets(target, source) {
        if (!source) {
            return target;
        }
        for (const [mode, bucket] of Object.entries(source)) {
            if (!target[mode]) {
                target[mode] = { ...bucket };
                continue;
            }
            const t = target[mode];
            t.reads = (t.reads || 0) + (bucket.reads || 0);
            t.opens = (t.opens || 0) + (bucket.opens || 0);
            t.downloads = (t.downloads || 0) + (bucket.downloads || 0);
            t.epubConversions = (t.epubConversions || 0) + (bucket.epubConversions || 0);
            if (bucket.lastAt && (!t.lastAt || bucket.lastAt > t.lastAt)) {
                t.lastAt = bucket.lastAt;
            }
        }
        return target;
    }

    static recordLocalEvent({ url, mode, action, title, author, coverUrl }) {
        const normalized = HFStatsLibrary.normalizeUrl(url);
        if (!normalized) {
            return;
        }
        const store = HFStatsLibrary._readLocalStore();
        let entry = store.entries[normalized] || {
            url: normalized,
            title: "",
            author: "",
            coverUrl: "",
            host: "",
            modes: {}
        };
        if (title) entry.title = String(title).trim().slice(0, 200);
        if (author) entry.author = String(author).trim().slice(0, 120);
        if (coverUrl) entry.coverUrl = String(coverUrl).trim().slice(0, 500);
        entry.host = (() => {
            try { return new URL(normalized).hostname; } catch (_) { return ""; }
        })();
        entry.modes = HFStatsLibrary._bumpMode(entry.modes, mode, action);
        entry.totalScore = HFStatsLibrary.computeTotalScore(entry, "all");
        store.entries[normalized] = entry;
        HFStatsLibrary._writeLocalStore(store);
    }

    static getLocalTopEntries(mode, limit) {
        const store = HFStatsLibrary._readLocalStore();
        const entries = Object.values(store.entries || {})
            .filter(e => e && e.url && !HFStatsLibrary.isSampleEntry(e));
        return HFStatsLibrary._normalizeEntries({ entries }, mode, limit);
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

        HFStatsLibrary.recordLocalEvent(payload);

        const base = HFStatsLibrary.getWorkerBase();
        if (!base || HFStatsLibrary.isWorkerBlocked()) {
            return;
        }

        try {
            fetch(`${base}/stats/event`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
                keepalive: true,
                mode: "cors"
            }).then(resp => {
                if (resp.ok) {
                    HFStatsLibrary.clearWorkerBlocked();
                } else if (resp.status === 403) {
                    HFStatsLibrary.markWorkerBlocked();
                }
            }).catch(() => {});
        } catch (_) { /* fire-and-forget */ }
    }

    static async _fetchTopFromWorker(mode, limit, signal) {
        const workerBase = HFStatsLibrary.getWorkerBase();
        if (!workerBase || HFStatsLibrary.isWorkerBlocked()) {
            return null;
        }
        try {
            const workerUrl = `${workerBase}/stats/top?limit=${limit}${mode !== "all" ? `&mode=${encodeURIComponent(mode)}` : ""}&t=${Date.now()}`;
            const resp = await fetch(workerUrl, { signal, cache: "no-store" });
            if (resp.status === 403) {
                HFStatsLibrary.markWorkerBlocked();
                return null;
            }
            if (!resp.ok) {
                return null;
            }
            HFStatsLibrary.clearWorkerBlocked();
            const data = await resp.json();
            const entries = HFStatsLibrary._normalizeEntries(data, mode, limit)
                .filter(e => !HFStatsLibrary.isSampleEntry(e));
            return entries.length > 0 ? entries : null;
        } catch (_) {
            return null;
        }
    }

    static async _fetchTopFromHf(mode, limit, signal) {
        try {
            const resp = await fetch(HFStatsLibrary.getStatsCatalogUrl(), { signal, cache: "no-store" });
            if (!resp.ok) {
                return null;
            }
            const data = await resp.json();
            const entries = HFStatsLibrary._normalizeEntries(data, mode, limit)
                .filter(e => !HFStatsLibrary.isSampleEntry(e));
            return entries.length > 0 ? entries : null;
        } catch (_) {
            return null;
        }
    }

    static _mergeEntryLists(lists, mode, limit) {
        const byUrl = new Map();
        for (const list of lists) {
            if (!Array.isArray(list)) {
                continue;
            }
            for (const entry of list) {
                if (!entry?.url || HFStatsLibrary.isSampleEntry(entry)) {
                    continue;
                }
                const key = HFStatsLibrary.normalizeUrl(entry.url);
                if (!key) {
                    continue;
                }
                if (!byUrl.has(key)) {
                    byUrl.set(key, {
                        url: key,
                        title: entry.title || "",
                        author: entry.author || "",
                        coverUrl: entry.coverUrl || "",
                        host: entry.host || "",
                        modes: JSON.parse(JSON.stringify(entry.modes || {}))
                    });
                    continue;
                }
                const existing = byUrl.get(key);
                if (!existing.title && entry.title) existing.title = entry.title;
                if (!existing.author && entry.author) existing.author = entry.author;
                if (!existing.coverUrl && entry.coverUrl) existing.coverUrl = entry.coverUrl;
                if (!existing.host && entry.host) existing.host = entry.host;
                HFStatsLibrary._mergeModeBuckets(existing.modes, entry.modes);
            }
        }

        let merged = [...byUrl.values()].map(e => ({
            ...e,
            openMode: mode === "all" ? HFStatsLibrary.getPrimaryMode(e) : mode,
            totalScore: HFStatsLibrary.computeTotalScore(e, mode)
        }));

        if (mode !== "all") {
            merged = merged.filter(e => HFStatsLibrary.computeTotalScore(e, mode) > 0);
        }

        merged.sort((a, b) => {
            const scoreA = mode === "all" ? a.totalScore : HFStatsLibrary.computeTotalScore(a, mode);
            const scoreB = mode === "all" ? b.totalScore : HFStatsLibrary.computeTotalScore(b, mode);
            return scoreB - scoreA;
        });

        return merged.slice(0, limit);
    }

    static async fetchTopNovels({ mode = "all", limit = 20, timeoutMs = HFStatsLibrary.FETCH_TIMEOUT_MS } = {}) {
        const localEntries = HFStatsLibrary.getLocalTopEntries(mode, limit);

        const workerController = new AbortController();
        const workerTimer = setTimeout(() => workerController.abort(), HFStatsLibrary.WORKER_TOP_TIMEOUT_MS);
        let workerEntries = null;
        try {
            workerEntries = await HFStatsLibrary._fetchTopFromWorker(mode, limit, workerController.signal);
        } finally {
            clearTimeout(workerTimer);
        }

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        let hfEntries = null;
        try {
            hfEntries = await HFStatsLibrary._fetchTopFromHf(mode, limit, controller.signal);
        } finally {
            clearTimeout(timer);
        }

        const merged = HFStatsLibrary._mergeEntryLists([workerEntries, hfEntries, localEntries], mode, limit);
        if (merged.length === 0) {
            throw new Error("No usage stats yet");
        }

        let source = "local";
        if (workerEntries?.length && localEntries.length) {
            source = "worker+local";
        } else if (workerEntries?.length) {
            source = "worker";
        } else if (hfEntries?.length && localEntries.length) {
            source = "hf+local";
        } else if (hfEntries?.length) {
            source = "hf";
        }

        return { entries: merged, source };
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
            .filter(e => !HFStatsLibrary.isSampleEntry(e))
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
                openMode: mode === "all" ? HFStatsLibrary.getPrimaryMode(e) : mode,
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
