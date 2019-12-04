"use strict";

parserFactory.register("asianhobbyist.com", () => new AsianHobbyistParser());

class AsianHobbyistParser extends WordpressBaseParser{
    constructor() {
        super();
    }

    getChapterUrls(dom) {
        let items = [...dom.querySelectorAll("#content .tabs div.wuji-row ul a")]
            .map(a => util.hyperLinkToChapter(a));
        return Promise.resolve(items);
    };

    extractTitleImpl(dom) {
        return dom.querySelector(".post-title.entry-title a");
    };

    removeUnwantedElementsFromContentElement(element) {
        util.removeChildElementsMatchingCss(element, "div.code-block, div.osny-nightmode");
        super.removeUnwantedElementsFromContentElement(element);
    }

    findChapterTitle(dom) {
        let crumbs = [...dom.querySelectorAll("ol.breadcrumb li")]
            .map(li => li.textContent);
        return (0 < crumbs.length) ? crumbs[crumbs.length - 1] : null;
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.entry-content");
    }
}
