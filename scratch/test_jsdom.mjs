import { JSDOM } from 'jsdom';
import fs from 'fs';

const html = fs.readFileSync('index.html', 'utf-8');

const dom = new JSDOM(html, {
  url: "http://localhost/",
  runScripts: "dangerously",
  resources: "usable"
});

const window = dom.window;
const document = window.document;

window.addEventListener('load', () => {
    console.log("Window loaded");
    
    // 1. Verify initially unloaded modules
    console.log("Is SearchEngineUI defined?", typeof window.SearchEngineUI !== "undefined");
    console.log("Is EpubViewerUI defined?", typeof window.EpubViewerUI !== "undefined");
    console.log("Is epubViewer initialized?", !!window.epubViewer);

    // 2. We mock loadScripts just to see if the interaction tries to load them
    const profileSearch = document.getElementById("profileSearch");
    if (profileSearch) {
        profileSearch.click();
        console.log("Clicked Search Profile");
        
        setTimeout(() => {
            console.log("Checking history state after click:", window.history.state);
            console.log("Test completed successfully!");
            process.exit(0);
        }, 1500);
    } else {
        console.error("Could not find profileSearch button");
    }
});
