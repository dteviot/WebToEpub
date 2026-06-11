const fs = require('fs');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const html = fs.readFileSync('test_index.html', 'utf8');
const dom = new JSDOM(html).window.document;

class FreeWebNovelParser {
    async getChapterUrls(dom) {
        let menu = dom.querySelector("ul#idData");
        // simulating util.hyperlinksToChapterList(menu)
        let links = menu ? Array.from(menu.querySelectorAll("a")) : [];
        return links.map(a => a.href);
    }
}
const parser = new FreeWebNovelParser();
parser.getChapterUrls(dom).then(urls => console.log("URLs found: ", urls.length, urls.slice(0, 3)));
