const proxies = [
    { name: "Tufive Workers Proxy", url: "https://fragrant-frost-f292.tufive.workers.dev/?url=" },
    { name: "CodeTabs Proxy", url: "https://api.codetabs.com/v1/proxy/?quest=" },
    { name: "AllOrigins (Raw)", url: "https://api.allorigins.win/raw?url=" },
    { name: "corsproxy.io", url: "https://corsproxy.io/?url=" }
];

const targetUrl = "https://archiveofourown.org/works/search?work_search%5Bquery%5D=the";

async function testProxy(proxy) {
    console.log(`\n--- Testing [${proxy.name}] ---`);
    const fetchUrl = proxy.url + encodeURIComponent(targetUrl);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
    try {
        const start = Date.now();
        const res = await fetch(fetchUrl, {
            signal: controller.signal
        });
        const duration = Date.now() - start;
        clearTimeout(timeoutId);
        
        console.log(`HTTP Status: ${res.status}`);
        console.log(`Time taken: ${duration}ms`);
        
        const text = await res.text();
        console.log(`Response length: ${text.length} chars`);
        
        if (text.length > 0) {
            console.log(`Snippet (first 300 chars):`);
            console.log(text.substring(0, 300).replace(/\r?\n/g, ' '));
        }
    } catch (err) {
        clearTimeout(timeoutId);
        console.log(`Error: ${err.message} (${err.name})`);
    }
}

async function run() {
    for (const p of proxies) {
        await testProxy(p);
    }
}

run();
