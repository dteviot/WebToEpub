"use strict";

parserFactory.register("listnovel.com", () => new ListNovelParser());
parserFactory.register("readwebnovel.xyz", () => new ListNovelParser());
parserFactory.register("wuxiaworld.site", () => new ListNovelParser());
parserFactory.register("pery.info", () => new ListNovelParser());
parserFactory.register("morenovel.net", () => new ListNovelParser());

class ListNovelParser extends WordpressBaseParser{
    constructor() {
        super();
    }

    getChapterUrls(dom) {
        let chapters = [...dom.querySelectorAll("li.wp-manga-chapter a:not([title])")]
            .map(a => util.hyperLinkToChapter(a));
        return Promise.resolve(chapters.reverse());
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector("div.author-content a");
        return (authorLabel === null) ? super.extractAuthor(dom) : authorLabel.textContent;
    }

    removeUnwantedElementsFromContentElement(element) {
        util.removeChildElementsMatchingCss(element, "div.addtoany_share_save_container");
        super.removeUnwantedElementsFromContentElement(element);
    }

    findChapterTitle(dom) {
        return dom.querySelector("ol.breadcrumb li.active").textContent;
    }
 
    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.summary_image");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.summary__content")];
    }

    cleanInformationNode(node) {
        util.removeChildElementsMatchingCss(node, "script");
    }
}
