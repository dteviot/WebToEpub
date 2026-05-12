"use strict";

parserFactory.register("novelonomicon.com", () => new NovelonomiconParser());

class NovelonomiconParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom, chapterUrlsUI) {
        return (await this.getChapterUrlsFromMultipleTocPages(dom,
            this.extractPartialChapterList,
            this.getUrlsOfTocPages,
            chapterUrlsUI
        )).reverse();
    }

    getUrlsOfTocPages(dom) {
        let urls = [];
        let lastLink = [...dom.querySelectorAll("div.pages-nav a")];
        if (lastLink === undefined || lastLink.length == 0) {
            urls.push(dom.baseURI);
            return urls;
        }

        let indexUrl = lastLink.at(-1).baseURI;
        let href = lastLink.at(-1).href;
        if (lastLink.at(-1).href < lastLink.at(-2).href) {
            href = lastLink.at(-2).href;
        }
        // Extract the max page number safely
        let match = href.match(/page\/(\d+)\//);
        let max = match ? parseInt(match[1], 10) : 1;

        // Trim to the base ".../page/"
        let index = href.lastIndexOf("/", href.length - 2);
        let base = href.substring(0, index + 1);

        // Always include the index URL (page 1)
        // This works no matter what the path is
        urls.push(indexUrl);

        // Then add page 2 through max
        for (let i = 2; i <= max; ++i) {
            urls.push(base + i + "/");
        }
        return urls;
    }

    extractPartialChapterList(dom) {
        return [...dom.querySelectorAll("#masonry-grid .entry-archives-header h2 a")]
            .map(a => util.hyperLinkToChapter(a));
    }

    findContent(dom) {
        return dom.querySelector("#the-post div.entry-content.entry.clearfix");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1");
    }

    findChapterTitle(dom) {
        return dom.querySelector("h1");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, ".td-module-image a");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll(".taxonomy-description")];
    }

    removeUnwantedElementsFromContentElement(element) {
        util.removeChildElementsMatchingSelector(element,
            "#the-post .da-reactions-outer, #the-post .stream-item-below-post-content");
        super.removeUnwantedElementsFromContentElement(element);
    }

    cleanInformationNode(node) {
        util.removeChildElementsMatchingSelector(node, ".su-spoiler");
        return node;
    }
}
