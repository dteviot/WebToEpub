"use strict";

parserFactory.register("uukanshu.cc", () => new UukanshuParser());

class UukanshuParser extends Parser {
    constructor() {
        super();
    }

    /**
     * @override
     * @param { Document } dom 
     */
    async getChapterUrls(dom) {
        /** @type { NodeListOf<HTMLAnchorElement> } */
        const anchors = dom.querySelectorAll("#list-chapterAll div a");

        return Array.from(anchors, anchor => util.hyperLinkToChapter(anchor));
    }

    /**
     * @override
     * @param { Document } dom 
     */
    findContent(dom) {
        return dom.querySelector("div.readcotent");
    }

    /**
     * @override
     * @param { Document } dom 
     */
    findChapterTitle(dom) {
        return dom.querySelector("h1.pt10");
    }

    /**
     * @override
     * @param { Document } dom 
     */
    extractTitleImpl(dom) {
        return dom.querySelector("meta[property='og:title").content;
    }

    /**
     * @override
     * @param { Document } dom 
     */
    extractDescription(dom) {
        return dom.querySelector("meta[property='og:description")?.content
            ?.replace(/<span.*?>/, "");
    }

    /**
     * @override
     * @param { Document } dom 
     */
    extractSubject(dom) {
        return dom.querySelector("meta[property='og:novel:category")?.content;
    }

    /**
     * @override
     * @param { Document } dom 
     */
    extractAuthor(dom) {
        return dom.querySelector("meta[property='og:novel:author")?.content;
    }

    /**
     * @override
     */
    extractLanguage() {
        return "zh";
    }

    /**
     * @override
     * @param { Document } dom 
     */
    findCoverImageUrl(dom) {
        return dom.querySelector("meta[property='og:image']")?.content;
    }
}