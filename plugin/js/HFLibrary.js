/*
  HFLibrary — Hugging Face Dataset-backed Public Library
  Uses the HF Hub REST API to store/retrieve EPUB files + metadata.
  No npm dependencies — pure browser fetch.
*/
"use strict";

class HFLibrary { // eslint-disable-line no-unused-vars

    // Configure your deployed Cloudflare Worker proxy URL here.
    // If empty, falls back to direct Hugging Face API (which requires browser token storage).
    static WORKER_URL = localStorage.getItem("hf_worker_url") || "https://webtoepub-hf-proxy.telegram-bridge.workers.dev";

    static REPO_NAME = "webtoepub-library";
    static CATALOG_FILE = "catalog.json";

    static _getApiBase() {
        if (HFLibrary.WORKER_URL) {
            return `${HFLibrary.WORKER_URL.replace(/\/$/, "")}/api`;
        }
        return "https://huggingface.co/api";
    }

    static _getBase() {
        if (HFLibrary.WORKER_URL) {
            return HFLibrary.WORKER_URL.replace(/\/$/, "");
        }
        return "https://huggingface.co";
    }

    // ─── Token Management ────────────────────────────────────────
    static getToken() {
        return localStorage.getItem("hf_token") || "";
    }

    static setToken(token) {
        const trimmed = (token || "").trim();
        if (trimmed) {
            localStorage.setItem("hf_token", trimmed);
        } else {
            localStorage.removeItem("hf_token");
        }
    }

    static hasToken() {
        return !!HFLibrary.WORKER_URL || !!HFLibrary.getToken();
    }

    static ensureTokenConfigured(interactive = false) {
        if (HFLibrary.WORKER_URL) {
            return "worker_active"; // Worker handles token securely
        }
        let token = HFLibrary.getToken();
        if (token) {
            return token;
        }
        if (interactive) {
            const entered = window.prompt("Enter your Hugging Face access token for public library upload:");
            if (entered && entered.trim()) {
                HFLibrary.setToken(entered);
                return HFLibrary.getToken();
            }
        }
        return "";
    }

    static _headers() {
        const headers = {
            "Content-Type": "application/json"
        };
        if (!HFLibrary.WORKER_URL) {
            const token = HFLibrary.ensureTokenConfigured(false);
            if (!token) throw new Error("No Hugging Face token configured.");
            headers["Authorization"] = `Bearer ${token}`;
        }
        return headers;
    }

    static _uploadHeaders() {
        const headers = {};
        if (!HFLibrary.WORKER_URL) {
            const token = HFLibrary.ensureTokenConfigured(false);
            if (!token) throw new Error("No Hugging Face token configured.");
            headers["Authorization"] = `Bearer ${token}`;
        }
        return headers;
    }

    // ─── Whoami: Get Username ────────────────────────────────────
    static async whoami() {
        const resp = await fetch(`${HFLibrary._getApiBase()}/whoami-v2`, {
            headers: HFLibrary._headers()
        });
        if (!resp.ok) throw new Error(`HF auth failed (${resp.status})`);
        const data = await resp.json();
        return data.name;
    }

    static async _getRepoId() {
        if (HFLibrary._cachedRepoId) return HFLibrary._cachedRepoId;
        const username = await HFLibrary.whoami();
        HFLibrary._cachedRepoId = `${username}/${HFLibrary.REPO_NAME}`;
        return HFLibrary._cachedRepoId;
    }

    // ─── Repo Creation ───────────────────────────────────────────
    static async ensureRepo() {
        const repoId = await HFLibrary._getRepoId();
        try {
            // Check if repo already exists
            const checkResp = await fetch(`${HFLibrary._getApiBase()}/datasets/${repoId}`, {
                headers: HFLibrary._headers()
            });
            if (checkResp.ok) return repoId;
        } catch { /* continue to create */ }

        // Create the dataset repo
        const createResp = await fetch(`${HFLibrary._getApiBase()}/repos/create`, {
            method: "POST",
            headers: HFLibrary._headers(),
            body: JSON.stringify({
                name: HFLibrary.REPO_NAME,
                type: "dataset",
                private: false,
                sdk: "static"
            })
        });
        if (!createResp.ok && createResp.status !== 409) {
            const errText = await createResp.text();
            throw new Error(`Failed to create HF repo: ${createResp.status} ${errText}`);
        }

        // Initialize with empty catalog
        await HFLibrary._writeCatalog([]);
        return repoId;
    }

    // ─── Catalog (catalog.json) ──────────────────────────────────
    static async getCatalog() {
        if (!HFLibrary.hasToken()) {
            return [];
        }
        const repoId = await HFLibrary._getRepoId();
        const url = `${HFLibrary._getBase()}/datasets/${repoId}/resolve/main/${HFLibrary.CATALOG_FILE}`;
        try {
            const resp = await fetch(url, {
                headers: HFLibrary._uploadHeaders(),
                cache: "no-store"
            });
            if (!resp.ok) {
                if (resp.status === 404) return [];
                throw new Error(`Catalog fetch failed: ${resp.status}`);
            }
            return await resp.json();
        } catch (e) {
            console.warn("HFLibrary: Could not load catalog, returning empty.", e);
            return [];
        }
    }

    static async _writeCatalog(catalog) {
        const repoId = await HFLibrary._getRepoId();
        const blob = new Blob([JSON.stringify(catalog, null, 2)], { type: "application/json" });

        // Use the commit API for uploading
        const formData = new FormData();

        // The HF Hub commit API expects specific format
        const operations = [{
            key: "file",
            path: HFLibrary.CATALOG_FILE,
            blob: blob
        }];

        await HFLibrary._commitFiles(repoId, "Update catalog", operations);
    }

    // ─── Commit API (upload files) ───────────────────────────────
    static async _commitFiles(repoId, commitMessage, operations) {
        const url = `${HFLibrary._getApiBase()}/datasets/${repoId}/commit/main`;

        const ndjsonLines = [];

        // 1. Add Header line
        ndjsonLines.push(JSON.stringify({
            key: "header",
            value: {
                summary: commitMessage
            }
        }));

        // 2. Add Operation lines
        for (const op of operations) {
            if (op.delete) {
                ndjsonLines.push(JSON.stringify({
                    key: "deletedFile",
                    value: {
                        path: op.path
                    }
                }));
            } else if (op.blob) {
                const base64 = await HFLibrary._blobToBase64(op.blob);
                ndjsonLines.push(JSON.stringify({
                    key: "file",
                    value: {
                        content: base64,
                        path: op.path,
                        encoding: "base64"
                    }
                }));
            }
        }

        const body = ndjsonLines.join("\n");

        console.log(`HFLibrary: Sending NDJSON commit to ${url} with ${ndjsonLines.length} operations. Payload size: ${body.length} chars.`);

        const resp = await fetch(url, {
            method: "POST",
            headers: {
                ...HFLibrary._uploadHeaders(),
                "Content-Type": "application/x-ndjson"
            },
            body: body
        });

        console.log(`HFLibrary: Server responded with status ${resp.status}`);

        if (!resp.ok) {
            const errText = await resp.text();
            throw new Error(`HF commit failed: ${resp.status} ${errText}`);
        }

        return await resp.json();
    }

    // ─── Upload a Book ───────────────────────────────────────────
    static async uploadBook(epubBlob, metadata) {
        // metadata: { title, author, coverDataUrl }
        const repoId = await HFLibrary.ensureRepo();
        const bookId = Date.now().toString();
        const epubPath = `books/${bookId}.epub.txt`;

        // Build operations: upload epub + cover + update catalog
        const operations = [];

        // 1. Convert EPUB blob to base64 text
        const epubBase64 = await HFLibrary._blobToBase64(epubBlob);
        const epubTxtBlob = new Blob([epubBase64], { type: "text/plain" });
        operations.push({
            path: epubPath,
            blob: epubTxtBlob
        });

        // 2. Cover image (convert data URL to base64 text file)
        let coverPath = "";
        if (metadata.coverDataUrl && metadata.coverDataUrl.startsWith("data:")) {
            const [header, base64] = metadata.coverDataUrl.split(",");
            const ext = header.match(/:(.*?);/)[1].split("/").pop().replace("svg+xml", "svg");
            coverPath = `covers/${bookId}.${ext}.txt`;
            const coverTxtBlob = new Blob([base64], { type: "text/plain" });
            operations.push({
                path: coverPath,
                blob: coverTxtBlob
            });
        }

        // 3. Update catalog
        const catalog = await HFLibrary.getCatalog();
        catalog.push({
            id: bookId,
            title: metadata.title || "Unknown Title",
            author: metadata.author || "Unknown Author",
            epubPath: epubPath,
            coverPath: coverPath,
            uploadedAt: new Date().toISOString(),
            size: epubBlob.size
        });

        operations.push({
            path: HFLibrary.CATALOG_FILE,
            blob: new Blob([JSON.stringify(catalog, null, 2)], { type: "application/json" })
        });

        await HFLibrary._commitFiles(repoId, `Add: ${metadata.title}`, operations);
        return bookId;
    }

    // ─── Download a Book ─────────────────────────────────────────
    static async downloadBook(epubPath) {
        const repoId = await HFLibrary._getRepoId();
        const url = `${HFLibrary._getBase()}/datasets/${repoId}/resolve/main/${epubPath}`;
        const resp = await fetch(url, { cache: "no-store" });
        if (!resp.ok) throw new Error(`Failed to download book: ${resp.status}`);

        // If it's a binary epub (doesn't end with .txt), return the blob directly
        if (!epubPath.toLowerCase().endsWith(".txt")) {
            return await resp.blob();
        }

        const base64Text = await resp.text();
        return await HFLibrary._dataUrlToBlobAsync(`data:application/epub+zip;base64,${base64Text.trim()}`);
    }

    // ─── Get Cover URL ───────────────────────────────────────────
    static async getCoverUrl(coverPath) {
        if (!coverPath) return "";
        const repoId = await HFLibrary._getRepoId();
        const url = `${HFLibrary._getBase()}/datasets/${repoId}/resolve/main/${coverPath}`;
        try {
            const resp = await fetch(url, { cache: "no-store" });
            if (!resp.ok) return "";

            // If the cover is stored as a binary image (doesn't end with .txt)
            if (!coverPath.toLowerCase().endsWith(".txt")) {
                const blob = await resp.blob();
                return new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result);
                    reader.onerror = () => resolve("");
                    reader.readAsDataURL(blob);
                });
            }

            const base64Text = await resp.text();
            
            // Extract the original extension to get the correct mime type
            const parts = coverPath.split(".");
            const ext = parts[parts.length - 2] || "jpg";
            const mime = ext === "png" ? "image/png" : (ext === "svg" ? "image/svg+xml" : "image/jpeg");
            
            return `data:${mime};base64,${base64Text.trim()}`;
        } catch (e) {
            console.error("HFLibrary: Failed to fetch and decode cover.", e);
            return "";
        }
    }

    // ─── Delete a Book ───────────────────────────────────────────
    static async deleteBook(bookId) {
        const repoId = await HFLibrary._getRepoId();
        const catalog = await HFLibrary.getCatalog();
        const entry = catalog.find(b => b.id === bookId);
        if (!entry) throw new Error("Book not found in catalog");

        // Build delete operations
        const operations = [];
        operations.push({ path: entry.epubPath, delete: true });
        if (entry.coverPath) {
            operations.push({ path: entry.coverPath, delete: true });
        }

        // Update catalog (remove entry)
        const updatedCatalog = catalog.filter(b => b.id !== bookId);
        operations.push({
            path: HFLibrary.CATALOG_FILE,
            blob: new Blob([JSON.stringify(updatedCatalog, null, 2)], { type: "application/json" })
        });

        await HFLibrary._commitFiles(repoId, `Delete: ${entry.title}`, operations);
    }

    // ─── Utilities ───────────────────────────────────────────────
    static async _blobToBase64(blob) {
        if (typeof FileReader !== "undefined") {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result.split(",")[1]);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        } else {
            // Node.js fallback
            const arrayBuffer = await blob.arrayBuffer();
            return Buffer.from(arrayBuffer).toString("base64");
        }
    }

    static _dataUrlToBlob(dataUrl) {
        if (!dataUrl) return null;
        const parts = dataUrl.split(",");
        const mime = parts[0].match(/:(.*?);/)[1];
        const b64Data = parts[1];
        
        const byteCharacters = atob(b64Data);
        const byteNumbers = new Uint8Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        return new Blob([byteNumbers], { type: mime });
    }

    static async _dataUrlToBlobAsync(dataUrl) {
        return HFLibrary._dataUrlToBlob(dataUrl);
    }

    static formatSize(bytes) {
        if (bytes < 1024) return bytes + " B";
        if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
        return (bytes / 1048576).toFixed(1) + " MB";
    }
}
