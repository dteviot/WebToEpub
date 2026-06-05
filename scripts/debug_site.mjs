import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseHTML } from 'linkedom';
import vm from 'vm';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mock browser environment
const { window, document, DOMParser } = parseHTML('<!DOCTYPE html><html><body></body></html>');
global.window = window;
global.document = document;
global.DOMParser = DOMParser;

// Use the working Workers Proxy
const WORKING_PROXY = "https://fragrant-frost-f292.tufive.workers.dev/?url=";

global.HttpClient = {
    CORS_PROXIES: [{ name: "Workers Proxy", url: WORKING_PROXY }],
    isProxyUrl: () => false,
    unproxyUrl: (u) => u
};

global.util = {
    sleep: (ms) => new Promise(resolve => setTimeout(resolve, ms))
};

// Load SiteSearchEngine.js
const siteSearchEngineContent = fs.readFileSync(path.join(__dirname, '../plugin/js/SiteSearchEngine.js'), 'utf8');
vm.runInThisContext(siteSearchEngineContent);

async function debugSite(siteName) {
    const site = [...SiteSearchEngine.PRIMARY_SITES, ...SiteSearchEngine.SECONDARY_SITES].find(s => s.name.toLowerCase() === siteName.toLowerCase() || s.hostname.toLowerCase() === siteName.toLowerCase());
    if (!site) {
        console.log(`Site not found: ${siteName}`);
        return;
    }

    console.log(`\n=================== Debugging: ${site.name} (${site.hostname}) ===================`);
    const query = "the";
    const url = site.searchUrl(query);
    const fetchOptions = site.getFetchOptions ? await site.getFetchOptions(query) : {};
    console.log(`Query URL: ${url}`);
    if (Object.keys(fetchOptions).length > 0) {
        console.log(`Fetch Options:`, fetchOptions);
    }

    const fetchUrl = WORKING_PROXY + encodeURIComponent(url);
    console.log(`Fetching via proxy...`);
    try {
        const res = await fetch(fetchUrl, fetchOptions);
        if (!res.ok) {
            console.log(`Fetch failed: HTTP ${res.status}`);
            return;
        }
        const html = await res.text();
        console.log(`HTML fetched successfully! Length: ${html.length} bytes`);
        fs.writeFileSync(path.join(__dirname, 'debug_out.html'), html, 'utf8');
        console.log(`HTML saved to scripts/debug_out.html`);

        const dom = SiteSearchEngine.parseSafeHtml(html, url);
        const results = site.parseResults(dom);
        console.log(`Parsed Results Count: ${results.length}`);
        if (results.length > 0) {
            console.log(`First result:`, results[0]);
        } else {
            console.log(`No results parsed! Checking DOM selectors...`);
            // Check common tags/classes
            const aTags = dom.querySelectorAll('a');
            console.log(`Total <a> tags found in DOM: ${aTags.length}`);
            if (aTags.length > 0) {
                // print first 5 links
                console.log(`Sample links in DOM:`);
                for (let i = 0; i < Math.min(5, aTags.length); i++) {
                    console.log(`  - href="${aTags[i].getAttribute('href')}" text="${aTags[i].textContent.trim().substring(0, 40)}"`);
                }
            }
        }
    } catch (e) {
        console.log(`Error: ${e.message}`);
    }
}

// Get site from CLI argument
const args = process.argv.slice(2);
const siteArg = args[0] || 'novelhall.com';
debugSite(siteArg);
