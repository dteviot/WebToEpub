const fs = require('fs');

async function patchCatalog() {
    const HFLibrary = {
        WORKER_URL: "https://webtoepub-hf-proxy.telegram-bridge.workers.dev",
        _getApiBase() { return `${this.WORKER_URL}/api`; },
        _getBase() { return this.WORKER_URL.replace(/\/$/, ""); }
    };
    
    // Fetch the active catalog
    const url = `${HFLibrary._getBase()}/datasets/prasadonly/webtoepub-library/resolve/main/catalog.json`;
    const resp = await fetch(url, { headers: { "Content-Type": "application/json" } });
    if (!resp.ok) {
        console.error("Failed to fetch catalog", resp.status);
        return;
    }
    const data = await resp.json();
    
    // Check if the book exists and update description
    let updated = false;
    for (let book of data) {
        if (!book.description) {
            book.description = "“Who are you looking at?” The system said: “A beautiful woman, isn’t she pretty?” “She is pretty, but why does she have a tail?” The system said: “Because she’s a fox demon.”...";
            updated = true;
        }
    }
    
    if (updated) {
        const bodyStr = JSON.stringify(data, null, 2);
        
        // Use standard HF API to commit
        const ndjson = [
            JSON.stringify({ key: "header", value: { summary: "Patch catalog descriptions" } }),
            JSON.stringify({
                key: "file",
                value: {
                    content: Buffer.from(bodyStr).toString("base64"),
                    path: "catalog.json",
                    encoding: "base64"
                }
            })
        ].join("\n");
        
        const commitResp = await fetch(`${HFLibrary._getApiBase()}/datasets/prasadonly/webtoepub-library/commit/main`, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-ndjson"
            },
            body: ndjson
        });
        
        if (commitResp.ok) {
            console.log("Successfully patched catalog with mock description!");
        } else {
            console.error("Failed to commit", await commitResp.text());
        }
    } else {
        console.log("No books needed patching.");
    }
}

patchCatalog().catch(console.error);
