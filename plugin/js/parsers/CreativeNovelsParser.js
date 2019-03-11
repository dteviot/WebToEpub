/*
  https://fantasy-books.live/ was renamed to creativenovels.com
*/
"use strict";
parserFactory.register("creativenovels.com", function() { return new CreativeNovelsParser() });
class CreativeNovelsParser extends Parser{
    constructor() {
        super();
    }

    getChapterUrls(dom) {
        let chapters = [...dom.querySelectorAll("div.post_box a")]
            .map(a => util.hyperLinkToChapter(a));
        return Promise.resolve(chapters);
    }

    findContent(dom) {
        return dom.querySelector("div.content");
    };

    removeUnwantedElementsFromContentElement(element) {
        util.removeElements(element.querySelectorAll("div.team, div.x-donate-1,"+
            " div.navigation, div.navi, header.entry-header"));
        super.removeUnwantedElementsFromContentElement(element);
    }

    findChapterTitle(dom) {
        return dom.querySelector("header.entry-header h1");
    }

    findCoverImageUrl(dom) {
        let img = dom.querySelector("img.book_cover");
        return (img === null) ? util.getFirstImgSrc(dom, "header") : img.src;
    }

    makeHiddenNodesVisible(node) {
        node.removeAttribute("style");
    }
}
