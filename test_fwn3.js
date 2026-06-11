const fs = require('fs');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

const html = fs.readFileSync('test_chapter.html', 'utf8');
const dom = new JSDOM(html).window.document;

console.log("div.txt text: ", dom.querySelector("div.txt")?.textContent?.substring(0, 100));
console.log("div.txt innerHTML: ", dom.querySelector("div.txt")?.innerHTML?.substring(0, 100));
console.log("div#article text: ", dom.querySelector("div#article")?.textContent?.substring(0, 100));
console.log("div#article innerHTML: ", dom.querySelector("div#article")?.innerHTML?.substring(0, 100));
