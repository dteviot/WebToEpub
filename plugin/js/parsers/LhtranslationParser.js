"use strict";

parserFactory.register("lhtranslation.net", () => new LhtranslationParser());

class LhtranslationParser extends Parser{
    constructor() {
        super();
    }

    getChapterUrls(dom) {
        let menu = dom.querySelector("div.list-chapters");
        return Promise.resolve(util.hyperlinksToChapterList(menu).reverse());
    };

    findContent(dom) {
        return dom.querySelector("article#content");
    };

    extractTitleImpl(dom) {
        return dom.querySelector("ul.manga-info h1");
    };

    findChapterTitle(dom) {
        return dom.querySelector("h1");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.info-cover");
    }

    getInformationEpubItemChildNodes(dom) {
        let info = dom.querySelector("ul.manga-info");
        let desc = dom.querySelector("#listchapter")
            .previousElementSibling
            .previousElementSibling
            .previousElementSibling;
        return [info, desc];
    }
}
