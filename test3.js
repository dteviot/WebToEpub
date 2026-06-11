const { JSDOM } = require("jsdom");

// Create a dummy document
const doc = new JSDOM('<html><body><div class="story-parts"><p>Content</p></div></body></html>').window.document;

// Simulate WattpadParser findContent
const el = doc.querySelector("div.story-parts");
const cloned = el.cloneNode(true);
let html = cloned.innerHTML;

const temp = doc.createElement("div");
temp.innerHTML = html;

console.log("HTML:", temp.innerHTML);
