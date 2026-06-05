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

window.addEventListener('load', async () => {
    console.log("Window loaded");
    
    // We mock loadScripts just to see if the interaction tries to load them
    const profileLibraries = document.getElementById("profileLibraries");
    if (profileLibraries) {
        profileLibraries.click();
        console.log("Clicked Libraries Profile");
        
        // Wait for modules to load
        setTimeout(async () => {
            console.log("Is LibraryUI defined?", typeof window.libraryManager !== "undefined");
            
            // Now let's simulate the library calling parseEpubMetadata
            try {
                if (window.libraryManager) {
                    console.log("Trying to load zip and parse...");
                    await window.libraryManager.parseEpubMetadata("dummy", "title", "author", "cover");
                    console.log("Zip successfully loaded and parse method executed.");
                }
            } catch (e) {
                console.log("Error during parse:", e.message);
            }
            
            process.exit(0);
        }, 1500);
    } else {
        console.error("Could not find profileLibraries button");
    }
});
