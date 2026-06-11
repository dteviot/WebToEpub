import fetch from 'node-fetch';

async function run() {
    const url = "https://huggingface.co/datasets/prasadonly/webtoepub-library/resolve/main/stats-catalog.json?t=" + Date.now();
    console.log("Fetching", url);
    const res = await fetch(url);
    console.log("Status:", res.status);
    const text = await res.text();
    console.log("Response (first 200 chars):", text.substring(0, 200));
}
run();
