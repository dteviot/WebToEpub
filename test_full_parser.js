const fs = require('fs');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const html = fs.readFileSync('test_chapter.html', 'utf8');
const dom = new JSDOM(html).window.document;

const util = {
    removeChildElementsMatchingSelector: (dom, selector) => {
        let elements = dom ? dom.querySelectorAll(selector) : [];
        for(let el of elements) el.parentNode.removeChild(el);
    }
};
global.util = util;

class Parser {
    removeUnwantedElementsFromContentElement(content) {}
}
class FreeWebNovelParser extends Parser {
    findContent(dom) {
        return dom.querySelector("div#article") || dom.querySelector("div.txt");
    }
    removeUnwantedElementsFromContentElement(content) {
        super.removeUnwantedElementsFromContentElement(content);
    }
}
class FreeWebNovelComParser extends FreeWebNovelParser {
    removeUnwantedElementsFromContentElement(content) {
        util.removeChildElementsMatchingSelector(content, "p sub");
        super.removeUnwantedElementsFromContentElement(content);
    }
}

const parser = new FreeWebNovelComParser();
const content = parser.findContent(dom);
parser.removeUnwantedElementsFromContentElement(content);
console.log("Content length:", content.innerHTML.length);
console.log("First 100 chars of text:", content.textContent.trim().substring(0, 100));
