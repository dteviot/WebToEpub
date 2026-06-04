console.log("--- Audit Script Starting ---");
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseHTML } from 'linkedom';
import vm from 'vm';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Mocking Browser Environment ---
const { window, document, customElements, HTMLElement, HTMLAnchorElement, DOMParser, Node, Element } = parseHTML('<!DOCTYPE html><html><body></body></html>');
global.window = window;
global.document = document;
global.navigator = window.navigator;
global.DOMParser = DOMParser;
global.Node = Node;
global.Element = Element;
global.HTMLAnchorElement = HTMLAnchorElement;
global.HTMLElement = HTMLElement;

// Mock node-fetch to use as global fetch
const nodeFetch = fetch; // Node 20+ has fetch
global.fetch = async (url, options) => {
    // console.log(`Fetching: ${url}`);
    return nodeFetch(url, options);
};

// Mock chrome.runtime
global.chrome = {
    runtime: {
        getURL: (p) => p
    }
};

// Mock UIText (minimal)
global.UIText = {
    Error: { htmlFetchFailed: (u, e) => `Fetch failed: ${u} - ${e}` },
    Warning: { httpFetchCanRetry: "Can retry." },
    Common: { cancel: "Cancel", skip: "Skip" }
};

// Mock HttpClient (SiteSearchEngine uses it for proxies)
global.HttpClient = {
    CORS_PROXIES: [
        { name: "New IP Proxy", url: "https://nexuspage-extractor.vercel.app/?url=http%3A%2F%2F93.115.101.178%3A11214%2F%3Furl%3D" },
        { name: "Workers Proxy", url: "https://nexuspage-extractor.prasadghanwat123.workers.dev/?url=" },
        { name: "AllOrigins (Raw)", url: "https://api.allorigins.win/raw?url=" }
    ],
    isProxyUrl: () => false,
    unproxyUrl: (u) => u
};

// --- Load App Logic ---
const utilContent = fs.readFileSync(path.join(__dirname, '../plugin/js/Util.js'), 'utf8');
const siteSearchEngineContent = fs.readFileSync(path.join(__dirname, '../plugin/js/SiteSearchEngine.js'), 'utf8');

// Minimal util mock for what SiteSearchEngine needs
global.util = {
    sleep: (ms) => new Promise(resolve => setTimeout(resolve, ms))
};

// Execute files in global context
console.log("Evaluating Util.js...");
vm.runInThisContext(utilContent);
console.log("Evaluating SiteSearchEngine.js...");
vm.runInThisContext(siteSearchEngineContent);

// Lower timeout for faster audit
SiteSearchEngine.PROXY_TIMEOUT_MS = 3000;

// Ensure classes are attached to global if they aren't already
if (typeof SiteSearchEngine !== 'undefined') global.SiteSearchEngine = SiteSearchEngine;
if (typeof util !== 'undefined') global.util = util;

console.log("Global context prepared. SiteSearchEngine defined:", typeof SiteSearchEngine !== 'undefined');

// --- Audit Logic ---
const COMMON_WORDS = ["the", "novel"];

async function auditSite(site) {
    console.log(`\nAudit: [${site.name}] (${site.hostname})`);
    for (const word of COMMON_WORDS) {
        try {
            process.stdout.write(`  Trying "${word}"... `);
            const results = await SiteSearchEngine.fetchSiteResults(site, word);
            if (results && results.length > 0) {
                console.log(`SUCCESS: Found ${results.length} results.`);
                // Basic structural validation
                const first = results[0];
                if (!first.title || !first.url) {
                    console.log(`    WARNING: Missing structural data: title="${first.title}", url="${first.url}"`);
                    return { status: "STRUCTURAL_ERROR", word, results };
                }
                return { status: "PASS", word, results };
            } else {
                console.log(`EMPTY`);
            }
        } catch (error) {
            console.log(`ERROR: ${error.message}`);
            return { status: "ERROR", word, error: error.message };
        }
    }
    console.log(`  FAIL: No results found for any common words.`);
    return { status: "FAIL" };
}

async function runAudit() {
    // Get command line args
    const args = process.argv.slice(2);
    const siteFlag = args.findIndex(a => a === '--site');
    const specificSite = siteFlag !== -1 ? args[siteFlag + 1] : null;
    const allFlag = args.includes("--all");

    let allSites = [];

    if (specificSite) {
        const primary = SiteSearchEngine.PRIMARY_SITES.find(s => s.hostname === specificSite);
        const secondary = SiteSearchEngine.SECONDARY_SITES.find(s => s.hostname === specificSite);
        if (primary) allSites = [primary];
        else if (secondary) allSites = [secondary];
        else {
            console.error(`Error: Site "${specificSite}" not found.`);
            process.exit(1);
        }
    } else if (allFlag) {
        allSites = [...SiteSearchEngine.PRIMARY_SITES, ...SiteSearchEngine.SECONDARY_SITES];
    } else {
        // Collect a representative sample of all engines
        const primary = [...SiteSearchEngine.PRIMARY_SITES];
        const secondary = SiteSearchEngine.SECONDARY_SITES;

        // Sample one of each shared engine from the secondary list
        const sampledHosts = [
            "novelfull.net", // NovelFull
            "vipnovel.com",  // Madara
            "readwn.com",   // Readwn
            "boxnovel.org", // General/WP
            "noblemtl.com", // Noblemtl
            "lightnovelworld.com" // LightNovelWorld
        ];

        const sampledSecondary = secondary.filter(s => sampledHosts.includes(s.hostname));
        allSites = [...primary, ...sampledSecondary];
    }

    console.log(`Starting Audit of ${allSites.length} sites...`);
    const report = {
        pass: [],
        fail: [],
        error: [],
        structural: []
    };

    // Process in batches to speed up
    const BATCH_SIZE = 2;
    for (let i = 0; i < allSites.length; i += BATCH_SIZE) {
        const batch = allSites.slice(i, i + BATCH_SIZE);
        console.log(`Auditing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(allSites.length / BATCH_SIZE)}...`);

        const results = await Promise.all(batch.map(async (site) => {
            const res = await auditSite(site);
            return { site, res };
        }));

        for (const { site, res } of results) {
            if (res.status === "PASS") report.pass.push(site.hostname);
            else if (res.status === "FAIL") report.fail.push(site.hostname);
            else if (res.status === "ERROR") report.error.push({ site: site.hostname, error: res.error });
            else if (res.status === "STRUCTURAL_ERROR") report.structural.push({ site: site.hostname, results: res.results });
        }

        // Brief pause between batches to respect proxy rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Output Summary
    console.log("\n--- AUDIT SUMMARY ---");
    console.log(`Total Sites: ${allSites.length}`);
    console.log(`Passed:      ${report.pass.length}`);
    console.log(`Failed:      ${report.fail.length}`);
    console.log(`Errors:      ${report.error.length}`);
    console.log(`Structural:  ${report.structural.length}`);

    if (report.fail.length > 0) {
        console.log("\nFAILED SITES (No Results):");
        report.fail.forEach(s => console.log(` - ${s}`));
    }

    if (report.error.length > 0) {
        console.log("\nERRORED SITES:");
        report.error.forEach(e => console.log(` - ${e.site}: ${e.error}`));
    }
}

runAudit().catch(err => {
    console.error("Audit Crashed:", err);
    process.exit(1);
});
