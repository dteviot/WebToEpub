"use strict";

parserFactory.register("novelingua.com", () => new NovelinguaParser());

class NovelinguaParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        return [...dom.querySelectorAll(".pagelayer-text-holder a")]
            .map(a => util.hyperLinkToChapter(a));
    }

    findContent(dom) {
        // More specific selectors are not consistently reliable even though these have more junk than I'd like
        return dom.querySelector(".entry-content") ||
            dom.querySelector("article");
    }

    customRawDomToContentStep(chapter, content) {
        this.cleanup(content);
    }

    cleanInformationNode(node) {
        this.cleanup(node);
    }

    cleanup(content) {
        content.querySelectorAll("*").forEach(element => {
            element.removeAttribute("dir");
            util.replaceSemanticInlineStylesWithTags(element, true);
            if (element.id?.startsWith("docs-internal-guid-")) {
                element.removeAttribute("id");
            }
        });
    }

    // title of the story (not title of each chapter)
    extractTitleImpl(dom) {
        return dom.querySelector(".pagelayer-heading-holder h2");
    }

    findChapterTitle(dom) {
        let canonical = dom.querySelector("link[rel='canonical']").href.split("/");
        let title = canonical.pop();
        if (title === "") {
            title = canonical.pop();
        }
        title = title.split("-").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
        return title;
    }

    findCoverImageUrl(dom) {
        let img = dom.querySelector("img.pagelayer-img");
        return (img === null) ? img : img.src;
    }

    removeUnwantedElementsFromContentElement(element) {
        util.removeElements(element.querySelectorAll(
            "style, .pagelayer-btn-holder, .pagelayer-share, .pagelayer-image_slider, .pagelayer-embed"));
        super.removeUnwantedElementsFromContentElement(element);
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll(".entry-content .pagelayer-text-holder")];
    }
}

