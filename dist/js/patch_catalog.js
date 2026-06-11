// Dynamically patch catalog: fetch each book's epub, extract chapter 1 text as description
(async () => {
    const PROXY = "https://webtoepub-hf-proxy.telegram-bridge.workers.dev";
    const REPO = "prasadonly/webtoepub-library";
    const CATALOG_URL = `https://huggingface.co/datasets/${REPO}/resolve/main/catalog.json`;

    // 1. Fetch catalog
    const catalogResp = await fetch(CATALOG_URL, { cache: "no-store" });
    if (!catalogResp.ok) { console.error("Catalog fetch failed:", catalogResp.status); return; }
    const catalog = await catalogResp.json();

    let changed = false;
    for (const book of catalog) {
        if (book.description && book.description.length > 20) {
            // Already has a real description
            console.log(`✓ ${book.title} — already has description`);
            continue;
        }

        console.log(`  Fetching epub for: ${book.title}`);
        const epubUrl = `https://huggingface.co/datasets/${REPO}/resolve/main/${book.epubPath}`;
        let epubResp;
        try { epubResp = await fetch(epubUrl, { cache: "no-store" }); }
        catch (e) { console.warn(`  Failed to fetch: ${e.message}`); continue; }

        if (!epubResp.ok) { console.warn(`  HTTP ${epubResp.status}`); continue; }

        const base64Text = await epubResp.text();
        const binary = atob(base64Text.trim());
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const blob = new Blob([bytes], { type: "application/epub+zip" });

        const { ZipReader, BlobReader, TextWriter } = await import("https://cdn.jsdelivr.net/npm/@zip.js/zip.js@2.7.44/index.js");
        const zipReader = new ZipReader(new BlobReader(blob), { useWebWorkers: !!(typeof window !== "undefined" && window.WTE_WEBSITE_MODE && !document.querySelector("script[src*=\"zip-no-worker.min.js\"]")) });
        const entries = await zipReader.getEntries();

        const opfEntry = entries.find(e => e.filename.endsWith(".opf"));
        if (!opfEntry) { console.warn("  No OPF found"); continue; }

        const opfText = await opfEntry.getData(new TextWriter());
        let opfDoc = new DOMParser().parseFromString(opfText, "application/xml");
        if (opfDoc.querySelector("parsererror")) opfDoc = new DOMParser().parseFromString(opfText, "text/html");

        const opfDir = opfEntry.filename.substring(0, opfEntry.filename.lastIndexOf("/") + 1);
        const spine = opfDoc.querySelector("spine");
        const manifest = opfDoc.querySelector("manifest");
        let extracted = "";

        if (spine && manifest) {
            const itemrefs = spine.querySelectorAll("itemref");
            for (const ref of itemrefs) {
                const id = ref.getAttribute("idref");
                const item = manifest.querySelector(`item[id="${id}"]`);
                if (!item) continue;
                const href = item.getAttribute("href");
                const resolved = opfDir + href;
                const entry = entries.find(e => e.filename === resolved || e.filename.endsWith(href));
                if (!entry) continue;
                const content = await entry.getData(new TextWriter());
                const doc = new DOMParser().parseFromString(content, "text/html");
                const text = (doc.body ? doc.body.textContent : "").replace(/\s+/g, " ").trim();
                if (text.length > 50) { extracted = text.substring(0, 200) + "..."; break; }
            }
        }

        if (extracted) {
            book.description = extracted;
            changed = true;
            console.log(`  Extracted: "${extracted.substring(0, 60)}..."`);
        }
    }

    if (!changed) { console.log("Nothing to update."); return; }

    // 2. Commit updated catalog
    const ndjson = [
        JSON.stringify({ key: "header", value: { summary: "Auto-patch: extract descriptions from chapter 1" } }),
        JSON.stringify({
            key: "file",
            value: {
                content: btoa(unescape(encodeURIComponent(JSON.stringify(catalog, null, 2)))),
                path: "catalog.json",
                encoding: "base64"
            }
        })
    ].join("\n");

    const commitResp = await fetch(`${PROXY}/api/datasets/${REPO}/commit/main`, {
        method: "POST",
        headers: { "Content-Type": "application/x-ndjson" },
        body: ndjson
    });

    console.log(commitResp.ok ? "✓ Catalog patched successfully!" : `✗ Commit failed: ${await commitResp.text()}`);
})();
