const fs = require('fs');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

const html = fs.readFileSync('test_index.html', 'utf8');
const dom = new JSDOM(html).window.document;

console.log("Title: ", dom.querySelector("h1.tit")?.textContent);
console.log("Author: ", dom.querySelector("[title=Author]")?.parentNode?.querySelector("a")?.textContent);
console.log("Subject length: ", dom.querySelector("[title=Genre]")?.parentNode?.querySelectorAll("a")?.length);
console.log("Cover: ", dom.querySelector("div.pic img")?.src);
