const http = require('http');
const https = require('https');

async function testFetch(url) {
    try {
        const response = await fetch("https://corsproxy.io/?" + encodeURIComponent(url));
        const text = await response.text();
        console.log("corsproxy.io:", response.status, text.substring(0, 100));
    } catch (e) {
        console.log("corsproxy.io error:", e.message);
    }
}
testFetch("https://freewebnovel.com/novel/mom-is-a-slut-my-younger-sibling-is-a-bully-and-dad-is-a-thug/chapter-1");
