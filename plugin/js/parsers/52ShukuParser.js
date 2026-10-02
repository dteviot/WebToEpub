"use strict";

parserFactory.register("52shuku.net", () => new Shuku52Parser());

class Shuku52Parser extends Parser {
    constructor() {
        super();
        // 52书库 uses Cloudflare and is strict about concurrent requests.
        this.minimumThrottle = 1000;
        this.maxSimultanousFetchSize = 1;
    }

    async getChapterUrls(dom) {
        const links = [...dom.querySelectorAll("ul.list > li.mulu > a")];
        return links.map(link => util.hyperLinkToChapter(link));
    }

    findContent(dom) {
        return dom.querySelector("article#nr1.article-content");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1.article-title");
    }

    findChapterTitle(dom) {
        const content = this.findContent(dom);
        if (content == null) {
            return null;
        }

        return [...content.querySelectorAll("h1, h2, h3, h4, h5, h6")]
            .find(heading => /^第\s*\d+\s*章/.test(heading.textContent.trim())) ?? null;
    }

    extractLanguage() {
        return "zh";
    }

    extractDescription(dom) {
        return dom.querySelector("article.article-content > p:nth-of-type(2)")?.textContent.trim()
            ?? super.extractDescription(dom);
    }

    removeUnwantedElementsFromContentElement(element) {
        util.removeChildElementsMatchingSelector(
            element,
            'a[href*="52shuku"], a[href*="ranking"], a[href*="search"], .script, .style, .nav, .footer, .page, #lineCorrect'
        );
        super.removeUnwantedElementsFromContentElement(element);
    }
}
