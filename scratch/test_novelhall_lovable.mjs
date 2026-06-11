import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';

const proxyBase = "https://loveable-proxy-forwebtoepub.lovable.app/api/proxy?url=";
const targetUrl = "https://www.novelhall.com/the-peerless-beauty-stuck-with-me-41316/19688316.html";

async function run() {
    console.log(`Fetching chapter 1: ${targetUrl}`);
    const cRes = await fetch(proxyBase + encodeURIComponent(targetUrl));
    const cHtml = await cRes.text();
    
    if (cHtml.includes("Cloudflare") && cHtml.includes("Just a moment...")) {
        console.error(`Cloudflare block!`);
    } else {
        const cDom = new JSDOM(cHtml);
        const content = cDom.window.document.querySelector('article div.entry-content') || 
                        cDom.window.document.querySelector('div.entry-content') || 
                        cDom.window.document.querySelector('article');
        if (content) {
            // Strip scripts and styles
            content.querySelectorAll('script, style').forEach(el => el.remove());
            
            console.log(` -> Success! Content length: ${content.textContent.trim().length}`);
            console.log(` -> Snippet:\n${content.textContent.trim().substring(0, 1000)}`);
        } else {
            console.log(` -> Failed to find content selector. HTML length: ${cHtml.length}`);
        }
    }
}

run();
