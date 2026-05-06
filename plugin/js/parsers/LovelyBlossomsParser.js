"use strict";

parserFactory.register("lovelyblossoms.com", () => new LovelyBlossomsParser());

class LovelyBlossomsParser extends MadaraParser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        return [...dom.querySelectorAll("li.wp-manga-chapter a")]
            .map(a => util.hyperLinkToChapter(a))
            .reverse();
    }

    findContent(dom) {
        let content = dom.querySelector(".reading-content.text-left") ||
            dom.querySelector(".reading-content") ||
            super.findContent(dom);
        return content;
    }

    findChapterTitle(dom) {
        let title = dom.querySelector("h1#chapter-heading");
        return title ? title.textContent.trim() : super.findChapterTitle(dom);
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, ".summary_image img") || super.findCoverImageUrl(dom);
    }

    removeUnwantedElementsFromContentElement(element) {
        util.removeChildElementsMatchingSelector(element,
            ".nav-previous, .nav-next, .breadcrumb, h1#chapter-heading, .c-ads, .code-block, img[alt*='Advertise'], .wp-manga-chapter-img"
        );
        super.removeUnwantedElementsFromContentElement(element);
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll(".summary__content p")];
    }
}
