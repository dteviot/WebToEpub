"use strict";

parserFactory.registerUrlRule(
    url => (util.extractHostName(url).includes("69shu")),
    () => new ShuParser()
);

class ShuParser extends Parser{
    constructor() {
        super();
        this.minimumThrottle = 1000;
    }

    async getChapterUrls(dom) {
        let tocUrl = dom.querySelector("a.more-btn").href;
        let toc = (await HttpClient.wrapFetch(tocUrl, this.makeOptions())).responseXML;
        let menu = toc.querySelector("#catalog ul");
        return util.hyperlinksToChapterList(menu).reverse();
    }

    findContent(dom) {
        return dom.querySelector("div.txtnav");
    };

    extractTitleImpl(dom) {
        return dom.querySelector("div.booknav2 h1").textContent;
    };

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.bookbox");
    }

    removeUnwantedElementsFromContentElement(element) {
        util.removeChildElementsMatchingCss(element, ".txtinfo, #txtright, .bottom-ad");
        super.removeUnwantedElementsFromContentElement(element);
    }

    async fetchChapter(url) {
        // site does not tell us gb18030 is used to encode text
        return (await HttpClient.wrapFetch(url, this.makeOptions())).responseXML;
    }

    makeOptions() {
        return ({
            makeTextDecoder: () => new TextDecoder("gb18030")
        });
    }
}
