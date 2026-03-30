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
        let lastLink = dom.querySelector(".pages-nav li.last-page a.pages-nav-item")
            || [...dom.querySelectorAll(".pages-nav a.pages-nav-item")].slice(-1)[0];
        if (lastLink !== null) {
            let href = lastLink.href;
            // Extract the max page number safely
            let match = href.match(/page\/(\d+)\//);
            let max = match ? parseInt(match[1], 10) : 1;

            // Trim to the base ".../page/"
            let index = href.lastIndexOf("/", href.length - 2);
            let base = href.substring(0, index + 1);

            // Always include the index URL (page 1)
            // This works no matter what the path is
            let indexUrl = base.replace(/page\/$/, "");
            urls.push(indexUrl);

            // Then add page 2 through max
            for (let i = 2; i <= max; ++i) {
                urls.push(base + i + "/");
            }
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
