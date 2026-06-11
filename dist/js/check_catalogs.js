const HFLibrary = {
    WORKER_URL: "https://webtoepub-hf-proxy.telegram-bridge.workers.dev",
    _getBase() { return this.WORKER_URL.replace(/\/$/, ""); },
    async fetchPrasad() {
        const url = `${this._getBase()}/datasets/prasadonly/webtoepub-library/resolve/main/catalog.json`;
        const resp = await fetch(url, { headers: { "Content-Type": "application/json" } });
        if (resp.ok) {
            const data = await resp.json();
            console.log(`prasadonly length: ${data.length}`);
            if (data.length > 0) console.log(`First item: ${data[0].title}`);
        } else {
            console.log(`prasadonly status: ${resp.status}`);
        }
    },
    async fetchAmono() {
        const url = `${this._getBase()}/datasets/Amono5667/webtoepub-library/resolve/main/catalog.json`;
        const resp = await fetch(url, { headers: { "Content-Type": "application/json" } });
        if (resp.ok) {
            const data = await resp.json();
            console.log(`Amono5667 length: ${data.length}`);
            if (data.length > 0) console.log(`First item: ${data[0].title}`);
        } else {
            console.log(`Amono5667 status: ${resp.status}`);
        }
    }
};

(async () => {
    await HFLibrary.fetchPrasad();
    await HFLibrary.fetchAmono();
})();
