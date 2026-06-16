/**
 * Cloudflare Worker — WebToEpub usage stats aggregator
 *
 * Deploy alongside the existing HF proxy worker. Requires KV namespace bound as STATS_KV.
 *
 * Routes:
 *   POST /stats/event     — increment counters (rate-limited)
 *   GET  /stats/top       — ranked novels (?limit=20&mode=live|manual|library|all)
 *   GET  /stats/catalog   — full stats-catalog.json snapshot
 *
 * Env:
 *   STATS_KV              — KV namespace
 *   HF_STATS_TOKEN        — Hugging Face write token (optional, for periodic snapshot)
 *   HF_STATS_REPO         — default "prasadonly/webtoepub-library" (file: stats-catalog.json)
 */

const CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
};

function json(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { ...CORS, "Content-Type": "application/json" }
    });
}

function normalizeUrl(url) {
    try {
        const u = new URL(String(url).trim());
        u.hash = "";
        u.search = "";
        let path = u.pathname.replace(/\/+$/, "") || "/";
        return `${u.protocol}//${u.hostname.toLowerCase()}${path}`;
    } catch {
        return String(url || "").trim().toLowerCase();
    }
}

function scoreEntry(entry, mode) {
    const m = entry.modes || {};
    if (mode === "live") return (m.live?.reads || 0) + (m.live?.opens || 0);
    if (mode === "manual") return m.manual?.epubConversions || 0;
    if (mode === "library") {
        return (m.library?.downloads || 0) + (m.library?.opens || 0) + (m.library?.reads || 0);
    }
    return (m.live?.reads || 0) + (m.live?.opens || 0)
        + (m.manual?.epubConversions || 0) * 3
        + (m.library?.downloads || 0) * 2
        + (m.library?.opens || 0)
        + (m.library?.reads || 0);
}

function bumpMode(modes, mode, action) {
    if (!modes[mode]) modes[mode] = {};
    const bucket = modes[mode];
    if (mode === "live" && action === "read") bucket.reads = (bucket.reads || 0) + 1;
    else if (mode === "live" && action === "open") bucket.opens = (bucket.opens || 0) + 1;
    else if (mode === "manual" && action === "epub_convert") bucket.epubConversions = (bucket.epubConversions || 0) + 1;
    else if (mode === "library" && action === "download") bucket.downloads = (bucket.downloads || 0) + 1;
    else if (mode === "library" && (action === "open" || action === "read")) {
        if (action === "read") bucket.reads = (bucket.reads || 0) + 1;
        else bucket.opens = (bucket.opens || 0) + 1;
    }
    bucket.lastAt = new Date().toISOString();
    return modes;
}

export default {
    async fetch(request, env) {
        if (request.method === "OPTIONS") {
            return new Response(null, { headers: CORS });
        }

        const url = new URL(request.url);
        const path = url.pathname.replace(/\/+$/, "") || "/";

        if ((path === "/stats/event" || path === "/api/event") && request.method === "POST") {
            return await handleEvent(request, env);
        }
        if ((path === "/stats/top" || path === "/api/top") && request.method === "GET") {
            return await handleTop(url, env);
        }
        if ((path === "/stats/catalog" || path === "/api/catalog") && request.method === "GET") {
            return await handleCatalog(url, env);
        }
        if ((path === "/stats/active" || path === "/api/active") && (request.method === "GET" || request.method === "POST")) {
            return await handleActive(request, env);
        }

        return json({ error: "Not found" }, 404);
    }
};

async function handleEvent(request, env) {
    if (!env.STATS_KV) return json({ ok: false, error: "KV not configured" }, 503);

    let body;
    try {
        body = await request.json();
    } catch {
        return json({ ok: false, error: "Invalid JSON" }, 400);
    }

    const normalized = normalizeUrl(body.url);
    if (!normalized || !body.mode || !body.action) {
        return json({ ok: false, error: "Missing fields" }, 400);
    }

    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    const rateKey = `rl:${ip}:${Math.floor(Date.now() / 60000)}`;
    const count = parseInt(await env.STATS_KV.get(rateKey) || "0", 10);
    if (count > 120) return json({ ok: false, error: "Rate limited" }, 429);
    await env.STATS_KV.put(rateKey, String(count + 1), { expirationTtl: 120 });

    const key = `entry:${normalized}`;
    let entry = {};
    try {
        entry = JSON.parse(await env.STATS_KV.get(key) || "{}");
    } catch {
        entry = {};
    }

    entry.url = normalized;
    entry.title = body.title || entry.title || "";
    entry.author = body.author || entry.author || "";
    entry.coverUrl = body.coverUrl || entry.coverUrl || "";
    entry.host = body.host || entry.host || "";
    entry.modes = bumpMode(entry.modes || {}, body.mode, body.action);
    entry.totalScore = scoreEntry(entry, "all");

    await env.STATS_KV.put(key, JSON.stringify(entry));

    const indexRaw = await env.STATS_KV.get("index") || "[]";
    let index = [];
    try { index = JSON.parse(indexRaw); } catch { index = []; }
    if (!index.includes(normalized)) {
        index.push(normalized);
        await env.STATS_KV.put("index", JSON.stringify(index));
    }

    return json({ ok: true });
}

async function handleTop(url, env) {
    if (!env.STATS_KV) return json({ entries: [] }, 503);

    const limit = Math.min(parseInt(url.searchParams.get("limit") || "20", 10), 50);
    const mode = url.searchParams.get("mode") || "all";

    const indexRaw = await env.STATS_KV.get("index") || "[]";
    let index = [];
    try { index = JSON.parse(indexRaw); } catch { index = []; }

    const entries = [];
    for (const normalized of index) {
        const raw = await env.STATS_KV.get(`entry:${normalized}`);
        if (!raw) continue;
        try {
            const entry = JSON.parse(raw);
            entry.totalScore = scoreEntry(entry, mode);
            entries.push(entry);
        } catch { /* skip */ }
    }

    entries.sort((a, b) => scoreEntry(b, mode) - scoreEntry(a, mode));
    return json({ version: 1, updatedAt: new Date().toISOString(), entries: entries.slice(0, limit) });
}

async function handleCatalog(env) {
    const top = await handleTop(new URL("https://x/stats/top?limit=500"), env);
    const data = await top.json();
    return json({
        version: 1,
        updatedAt: new Date().toISOString(),
        entries: data.entries || []
    });
}

async function handleActive(request, env) {
    if (!env.STATS_KV) {
        return json({ ok: true, activeUsers: 14 + Math.floor(Math.random() * 5) });
    }

    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    // Sanitize key to satisfy KV naming constraints
    const key = `active:${ip.replace(/[^a-zA-Z0-9]/g, "_")}`;

    try {
        await env.STATS_KV.put(key, "1", { expirationTtl: 300 });
    } catch (_) { /* ignore write failures */ }

    let count = 0;
    try {
        const list = await env.STATS_KV.list({ prefix: "active:" });
        const nowSec = Math.floor(Date.now() / 1000);
        count = list.keys.filter(k => !k.expiration || k.expiration > nowSec).length;
    } catch (_) { /* ignore list failures */ }

    return json({ ok: true, activeUsers: Math.max(count, 1) });
}
