import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read HttpClient.js
let code = fs.readFileSync(path.resolve(__dirname, '../plugin/js/HttpClient.js'), 'utf-8');

// We don't need the whole extension, just the HttpClient code. 
// We can use eval to load it.
const dom = new JSDOM(`<body></body>`, { url: 'http://localhost/' });
global.window = dom.window;
global.fetch = fetch;
global.AbortController = dom.window.AbortController;

// Execute HttpClient.js in global scope
eval(code);

// Mock the native fetch to return specific responses for proxies
const originalFetch = global.fetch;
global.fetch = async (url, opts) => {
    if (url.includes("tufive")) {
        return {
            ok: true,
            clone: function() { return this; },
            text: async () => "<title>Just a moment...</title>Cloudflare",
            status: 200
        };
    }
    if (url.includes("codetabs")) {
        return {
            ok: true,
            clone: function() { return this; },
            text: async () => "window._cf_chl_opt",
            status: 200
        };
    }
    if (url.includes("allorigins")) {
        // Delay to make it the slowest, ensuring the race skips the fast Cloudflare blocks!
        await new Promise(r => setTimeout(r, 100));
        return {
            ok: true,
            clone: function() { return this; },
            text: async () => "<html><body>REAL NOVELHALL CONTENT</body></html>",
            status: 200
        };
    }
    return originalFetch(url, opts);
};

(async () => {
    console.log("Testing wrapFetchImpl race...");
    HttpClient.enableCorsProxy = true;
    try {
        let result = await HttpClient.wrapFetch("https://www.novelhall.com/book", { isHtml: true });
        console.log("Result received successfully!");
        console.log(result.substring(0, 50));
    } catch (e) {
        console.log("Test failed:", e.message);
    }
})();
