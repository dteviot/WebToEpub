#!/usr/bin/env node
/**
 * Create/update prasadonly/webtoepub-stats on Hugging Face and upload stats-catalog.json
 * Usage: HF_TOKEN=... node scripts/upload-stats-catalog.mjs
 */
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = "prasadonly/webtoepub-library";
const FILE = "stats-catalog.json";
const TOKEN = process.env.HF_TOKEN || process.env.HUGGING_FACE_HUB_TOKEN;

const catalogPath = join(__dirname, "..", "data", FILE);
const catalogText = readFileSync(catalogPath, "utf8");
JSON.parse(catalogText); // validate

const headers = {
    Authorization: `Bearer ${TOKEN}`,
    "Content-Type": "application/json"
};

async function ensureRepo() {
    const workerBase = process.env.HF_WORKER_URL || "https://webtoepub-hf-proxy.telegram-bridge.workers.dev";
    const check = await fetch(`${workerBase}/api/datasets/${REPO}`);
    if (check.ok) {
        console.log(`Dataset ${REPO} exists`);
        return;
    }
    throw new Error(`Dataset ${REPO} not found (${check.status})`);
}

async function uploadCatalog() {
    const b64 = Buffer.from(catalogText, "utf8").toString("base64");
    const ndjson = [
        JSON.stringify({ key: "header", value: { summary: "Update stats catalog" } }),
        JSON.stringify({
            key: "file",
            value: {
                content: b64,
                path: FILE,
                encoding: "base64"
            }
        })
    ].join("\n");

    const workerBase = process.env.HF_WORKER_URL || "https://webtoepub-hf-proxy.telegram-bridge.workers.dev";
    const useWorker = !TOKEN;
    const url = useWorker
        ? `${workerBase}/api/datasets/${REPO}/commit/main`
        : `https://huggingface.co/api/datasets/${REPO}/commit/main`;
    const uploadHeaders = useWorker
        ? { "Content-Type": "application/x-ndjson" }
        : { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/x-ndjson" };
    const resp = await fetch(url, {
        method: "POST",
        headers: uploadHeaders,
        body: ndjson
    });
    if (!resp.ok) {
        throw new Error(`Upload failed ${resp.status}: ${await resp.text()}`);
    }
    console.log(`Uploaded ${FILE} to ${REPO}`);
    const result = await resp.json();
    console.log("Commit:", result.commitUrl || result);
}

async function verifyPublicRead() {
    const url = `https://huggingface.co/datasets/${REPO}/resolve/main/${FILE}`;
    for (let i = 0; i < 8; i++) {
        await new Promise(r => setTimeout(r, 1500));
        const resp = await fetch(url, { cache: "no-store" });
        if (resp.ok) {
            const data = await resp.json();
            console.log(`Public CDN OK — ${data.entries?.length || 0} entries`);
            return;
        }
        console.log(`Waiting for CDN... (${resp.status})`);
    }
    throw new Error("Public CDN read failed after upload");
}

await ensureRepo();
await uploadCatalog();
await verifyPublicRead();
