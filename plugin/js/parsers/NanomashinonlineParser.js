"use strict";
parserFactory.register("nanomashin.online", () => new NanomashinonlineParser());

class NanomashinonlineParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom, chapterUrlsUI) {
        return (await this.walkTocPages(dom,
            NanomashinonlineParser.chaptersFromDom,
            NanomashinonlineParser.nextTocPageUrl,
            chapterUrlsUI
        )).reverse();
    }

    static chaptersFromDom(dom) {
        return [...dom.querySelectorAll("h3 a")]
            .map(a => util.hyperLinkToChapter(a));
    }

    static nextTocPageUrl(dom) {
        return dom.querySelector("nav button[rel='next']")?.parentNode?.href ?? null;
    }

    findContent(dom) {
        return dom.querySelector("article div.pt-10");
    }

    findChapterTitle(dom) {
        return dom.querySelector("h1");
    }

    findCoverImageUrl(dom) {
        return dom.querySelector("body img[decoding]")?.src ?? null;
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.pt-2")];
    }
}
