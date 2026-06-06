"use strict";

parserFactory.register("idleturtle-translations.com", () => new IdleturtletranslationsParser());

class IdleturtletranslationsParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let menu = dom.querySelector("div.pt-cv-wrapper");
        return util.hyperlinksToChapterList(menu);
    }

    findContent(dom) {
        return dom.querySelector("div[itemprop='articleBody']");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("article h3");
    }

    findChapterTitle(dom) {
        return dom.querySelector("article h1");
    }

    preprocessRawDom(webPageDom) {
        let content = this.findContent(webPageDom);
        let footnotes = new FootnoteExtractor().scriptElementsToFootnotes(webPageDom);
        this.moveFootnotes(webPageDom, content, footnotes);
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "article");
    }
}
