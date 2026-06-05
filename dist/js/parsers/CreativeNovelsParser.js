"use strict";
parserFactory.register("creativenovels.com", () => new CreativeNovelsParser());
class CreativeNovelsParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        return [...dom.querySelectorAll("div#chapter_list_novel_page, div.post_box a")]
            .map(a => util.hyperLinkToChapter(a));
    }

    findContent(dom) {
        return dom.querySelector("div.entry-content.content");
    }

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
