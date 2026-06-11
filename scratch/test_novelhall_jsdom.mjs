import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { JSDOM } from 'jsdom';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const htmlPath = path.resolve(__dirname, '../test_novelhall.html');
const htmlUrl = pathToFileURL(htmlPath).href;

const html = fs.readFileSync(htmlPath, 'utf-8');
const dom = new JSDOM(html, {
    url: htmlUrl,
    runScripts: "dangerously",
    resources: "usable"
});

dom.window.fetch = fetch;
dom.window.console = console;

setTimeout(() => {
    console.log("JSDOM finished scripts execution. Exiting.");
    process.exit(0);
}, 10000);
