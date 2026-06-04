const HFLibrary = {
    WORKER_URL: "https://webtoepub-hf-proxy.telegram-bridge.workers.dev",
    _getApiBase() { return `${this.WORKER_URL}/api`; },
    _headers() { return { "Content-Type": "application/json" }; },
    async whoami() {
        const resp = await fetch(`${this._getApiBase()}/whoami-v2`, { headers: this._headers() });
        const data = await resp.json();
        return data.name;
    }
};

HFLibrary.whoami().then(console.log).catch(console.error);
