const proxies = [
    { name: "New IP Proxy", url: "https://nexuspage-extractor.vercel.app/?url=http%3A%2F%2F93.115.101.178%3A11214%2F%3Furl%3D" },
    { name: "Tufive Workers Proxy", url: "https://fragrant-frost-f292.tufive.workers.dev/?url=" },
    { name: "Workers Proxy", url: "https://nexuspage-extractor.prasadghanwat123.workers.dev/?url=" },
    { name: "Nexuspage Proxy", url: "https://nexuspage-extractor.vercel.app/?url=" },
    { name: "AllOrigins (Raw)", url: "https://api.allorigins.win/raw?url=" },
    { name: "CodeTabs Proxy", url: "https://api.codetabs.com/v1/proxy/?quest=" }
];

const testUrls = [
    "https://novelfull.com/search?keyword=the",
    "https://www.royalroad.com/fictions/search?title=the"
];

async function testProxy(proxy) {
    console.log(`Testing Proxy: [${proxy.name}] (${proxy.url})`);
    for (const target of testUrls) {
        const fetchUrl = proxy.url + encodeURIComponent(target);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);
        try {
            const start = Date.now();
            const res = await fetch(fetchUrl, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
                signal: controller.signal
            });
            const duration = Date.now() - start;
            clearTimeout(timeoutId);
            if (res.ok) {
                const text = await res.text();
                console.log(`  -> SUCCESS on ${new URL(target).hostname} (Status: ${res.status}, Length: ${text.length}, Time: ${duration}ms)`);
            } else {
                console.log(`  -> FAIL on ${new URL(target).hostname} (Status: ${res.status}, Time: ${duration}ms)`);
            }
        } catch (err) {
            clearTimeout(timeoutId);
            console.log(`  -> ERROR on ${new URL(target).hostname}: ${err.message}`);
        }
    }
}

async function run() {
    for (const p of proxies) {
        await testProxy(p);
        console.log('');
    }
}

run();
