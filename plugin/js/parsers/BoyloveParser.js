"use strict";

parserFactory.register("boylove.cc", () => new BoyloveParser());

class BoyloveParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        return [...dom.querySelectorAll("ul#playlist__item_title_1_url li:not(.chapterOff) a")]
            .map(a => util.hyperLinkToChapter(a));
    }

    findContent(dom) {
        return dom.querySelector("section.reader-cartoon-chapter");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("div.stui-content div.title");
    }

    findChapterTitle(dom) {
        return dom.querySelector("div.title");
    }

    findCoverImageUrl(dom) {
        let div = dom.querySelector("div.stui-content__thumb [style*=background-image]");
        return "https://boylove.cc" + util.extractUrlFromBackgroundImage(div);
    }

    preprocessRawDom(webPageDom) {
        util.resolveLazyLoadedImages(webPageDom, "article img.lazy", "data-original");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("p.desc")];
    }
}
