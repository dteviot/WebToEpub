const fs = require('fs');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const html = fs.readFileSync('test_chapter.html', 'utf8');

// Simulate DOMParser behavior (jsdom's JSDOM does this basically, but let's see if there's a difference if parsed as text/html)
const dom = new JSDOM(html).window.document;
const content = dom.querySelector("div.txt");
console.log("div.txt outerHTML snippet: ", content.outerHTML.substring(0, 300));
