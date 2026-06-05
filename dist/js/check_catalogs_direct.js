const HFLibrary = {
    async fetchPrasad() {
        const url = "https://huggingface.co/datasets/prasadonly/webtoepub-library/resolve/main/catalog.json";
        const resp = await fetch(url);
        if (resp.ok) {
            const data = await resp.json();
            console.log(`[DIRECT] prasadonly length: ${data.length}`);
            if (data.length > 0) console.log(`First item: ${data[0].title}`);
        } else {
            console.log(`[DIRECT] prasadonly status: ${resp.status}`);
        }
    },
    async fetchAmono() {
        const url = "https://huggingface.co/datasets/Amono5667/webtoepub-library/resolve/main/catalog.json";
        const resp = await fetch(url);
        if (resp.ok) {
            const data = await resp.json();
            console.log(`[DIRECT] Amono5667 length: ${data.length}`);
            if (data.length > 0) console.log(`First item: ${data[0].title}`);
        } else {
            console.log(`[DIRECT] Amono5667 status: ${resp.status}`);
        }
    }
};

(async () => {
    await HFLibrary.fetchPrasad();
    await HFLibrary.fetchAmono();
})();
