"use strict";

parserFactory.register("watashiwasugoidesu.com", () => new WatashiwasugoidesuParser());

class WatashiwasugoidesuParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let menu = dom.querySelector("ul.display-posts-listing");
        return util.hyperlinksToChapterList(menu);
    }

    findContent(dom) {
        return dom.querySelector("div#wtr-content");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div#primary");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.wp-block-media-text__content p")];
    }
}
