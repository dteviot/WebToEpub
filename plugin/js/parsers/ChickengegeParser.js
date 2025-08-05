"use strict";

parserFactory.register("chickengege.org", () => new ChickengegeParser());

class ChickengegeParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let menu = dom.querySelector("ul#novelList, ul#extraList, table#novelList");
        return util.hyperlinksToChapterList(menu);
    }

    findContent(dom) {
        return dom.querySelector("article div.entry-content");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1.entry-title");
    }

    removeUnwantedElementsFromContentElement(element) {
        util.removeChildElementsMatchingSelector(element, ".m-a-box, .m-a-box-container");
        super.removeUnwantedElementsFromContentElement(element);
    }

    findChapterTitle(dom) {
        return dom.querySelector("h1.entry-title");
    }

    preprocessRawDom(webPageDom) {
        let content = this.findContent(webPageDom);
        let footnotes = this.extractFootnotes(webPageDom);
        this.moveFootnotes(webPageDom, content, footnotes);
    }

    extractFootnotes(dom) {
        return [...dom.querySelectorAll("script")]
            .filter(s => s.textContent.includes("{ toolTips("))
            .map(s => this.scriptToSpan(s, dom));
    }

    scriptToSpan(script, dom) {
        let span = dom.createElement("span");
        span.textContent = this.extractFootnoteText(script);
        return span;
    }

    extractFootnoteText(script) {
        let content = script.textContent.replace("jQuery(\"document\")", "");
        let start = content.indexOf("\"") + 1;
        let end = content.lastIndexOf("\",'");
        return content.substring(start, end);
    }
}
