"use strict";

//dead url/ parser
parserFactory.register("gamefaqs.gamespot.com", () => new GamefaqsGamespotParser());

class GamefaqsGamespotParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let toc = dom.querySelector(".ftoc");
        if (toc !== null) {
            return this.linksToChapters(dom.baseURI, toc);
        }
        toc = dom.querySelector("div.main_content");
        if (toc !== null) {
            util.removeChildElementsMatchingSelector(toc, "nav.content_nav_wrap");
            return this.linksToChapters(dom.baseURI, toc);
        }
        return [];
    }

    linksToChapters(base, toc) {
        if (!base.endsWith("/")) {
            base += "/";
        }
        let baseUrl = new URL(base);
        return [...toc.querySelectorAll("a")].map(link => ({
            sourceUrl:  new URL(link.getAttribute("href"), baseUrl).toString(),
            title: link.innerText.trim(),
        }));
    }

    findContent(dom) {
        return dom.querySelector("#faqwrap");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h3.platform-title");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector("a.contrib1");
        return (authorLabel === null) ? super.extractAuthor(dom) : authorLabel.textContent;
    }

    removeUnwantedElementsFromContentElement(element) {
        util.removeChildElementsMatchingSelector(element, ".ftoc");
        super.removeUnwantedElementsFromContentElement(element);
    }
}
