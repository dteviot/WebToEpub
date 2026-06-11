const { JSDOM } = require("jsdom");
async function test() {
    const res = await fetch("https://www.wattpad.com/1397644914-strip-for-the-devil-ch-1-the-strip-club");
    const html = await res.text();
    const doc = new JSDOM(html).window.document;
    
    let el = doc.querySelector("div[data-page-number]") ||
             doc.querySelector("div.story-parts") ||
             doc.querySelector("div.content") ||
             doc.querySelector("article") ||
             doc.querySelector("main");
             
    console.log(el ? el.outerHTML.substring(0, 500) : "not found");
}
test();
