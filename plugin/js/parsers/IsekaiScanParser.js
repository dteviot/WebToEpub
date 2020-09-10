"use strict";

parserFactory.register("isekaiscan.com", () => new IsekaiScanParser());

class IsekaiScanParser extends Parser{
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let menu = dom.querySelector("ul.version-chap");
        return util.hyperlinksToChapterList(menu).reverse();
    }

    findContent(dom) {
        var content = dom.querySelector("div.reading-content");
        for(let i of content.querySelectorAll("img")) {
            var data_src = i.getAttribute("data-src");
            if (!util.isNullOrEmpty(data_src)) {
                i.src = data_src;
            }
        }
        return content;
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1");
    }

    findChapterTitle(dom) {
        return dom.querySelector("h1");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.summary_image");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("divsummary__content")];
    }
}
