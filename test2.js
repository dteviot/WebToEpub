const { JSDOM } = require("jsdom");
async function test() {
    const res = await fetch("https://www.wattpad.com/1397645361-strip-for-the-devil-ch-2-the-man-in-the-red-booth");
    const html = await res.text();
    const dom = new JSDOM(html).window.document;
    
    let content = dom.querySelector("div[data-page-number]") ||
            dom.querySelector("div.story-parts") ||
            dom.querySelector("div.content") ||
            dom.querySelector("article") ||
            dom.querySelector("main");
            
    if (content) {
        let text = content.textContent.trim();
        if (text === "Array") {
            console.log("FOUND ARRAY!!!");
        } else {
            console.log("Content starts with: " + text.substring(0, 50));
        }
    } else {
        console.log("Content not found");
    }
}
test();
