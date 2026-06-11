const limit = 16;
const mode = "all";
const workerUrl = `https://webtoepub-hf-proxy.telegram-bridge.workers.dev/stats/top?limit=${limit}&t=${Date.now()}`;
fetch(workerUrl, { mode: "cors" }).then(res => res.json()).then(console.log).catch(console.error);
