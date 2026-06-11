/**
 * Local smoke test for WTR-Lab Live Reader fixes.
 * Run: node scratch/test_wtrlab_live.mjs
 */
import { readFileSync } from "fs";
import { JSDOM } from "jsdom";
import vm from "vm";

const NOVEL_URL = "https://wtr-lab.com/en/novel/12067/the-eldest-son-never-backs-down";
const CHAPTER_URL = "https://wtr-lab.com/en/novel/12067/the-eldest-son-never-backs-down/chapter-1";

const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", { url: NOVEL_URL });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.DOMParser = dom.window.DOMParser;
globalThis.navigator = dom.window.navigator;

function evalFile(path) {
    vm.runInThisContext(readFileSync(path, "utf8"), { filename: path });
}

evalFile("plugin/js/Util.js");
evalFile("plugin/js/ImageCollector.js");
evalFile("plugin/js/Parser.js");
globalThis.parserFactory = { register() {} };
evalFile("plugin/js/parsers/WtrlabParser.js");

globalThis.HttpClient = {
    enableCorsProxy: true,
    wtrLabCookieHeader: "",
    fetchJson: async (url, options = {}) => {
        const res = await fetch(url, options);
        const text = await res.text();
        let json;
        try {
            json = JSON.parse(text);
        } catch {
            throw new Error(`Non-JSON response from ${url}: ${text.slice(0, 120)}`);
        }
        return { json, response: { status: res.status, url } };
    }
};

const parser = new WtrlabParser();
let passed = 0;
let failed = 0;

function assert(name, condition, detail = "") {
    if (condition) {
        console.log(`  ✓ ${name}`);
        passed++;
    } else {
        console.error(`  ✗ ${name}${detail ? `: ${detail}` : ""}`);
        failed++;
    }
}

console.log("WTR-Lab Live Reader smoke test\n");

assert("shouldRemoveChapterNumber without checkbox", parser.shouldRemoveChapterNumber() === false);
assert("shouldRetryLonger without checkbox", parser.shouldRetryLonger() === false);

const sampleJson = {
    chapter: { title: "The eldest son never backs down" },
    data: { data: { body: ["Line one.", "Line two."] } }
};
let builtDom;
try {
    builtDom = parser.buildChapter(sampleJson, CHAPTER_URL);
    assert("buildChapter succeeds without checkbox UI", !!builtDom);
} catch (e) {
    assert("buildChapter succeeds without checkbox UI", false, e.message);
}

if (builtDom) {
    const content = Parser.findConstrutedContent(builtDom);
    const h1 = content?.querySelector("h1")?.textContent;
    const paras = content?.querySelectorAll("p")?.length ?? 0;
    assert("buildChapter sets numbered title", h1 === "1: The eldest son never backs down", h1);
    assert("buildChapter has paragraphs", paras === 2, String(paras));
}

try {
    parser.slug = "the-eldest-son-never-backs-down";
    parser.magickey = undefined;
    const chapterDom = await parser.fetchChapter(CHAPTER_URL);
    const content = Parser.findConstrutedContent(chapterDom);
    const text = content?.textContent?.replace(/\s+/g, " ").trim() ?? "";
    const paraCount = content?.querySelectorAll("p")?.length ?? 0;
    assert("fetchChapter returns content", paraCount > 5, `paragraphs=${paraCount}`);
    assert("fetchChapter has readable text", text.length > 200, `len=${text.length}`);
} catch (e) {
    assert("fetchChapter returns content", false, e.message);
}

try {
    const res = await HttpClient.fetchJson("https://wtr-lab.com/api/chapters/12067");
    const count = res.json?.chapters?.length ?? 0;
    assert("chapters API returns list", count > 0, `count=${count}`);
} catch (e) {
    assert("chapters API returns list", false, e.message);
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
