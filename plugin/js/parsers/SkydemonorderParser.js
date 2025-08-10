"use strict";

parserFactory.register("skydemonorder.com", () => new SkydemonorderParser());

class SkydemonorderParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        return [...dom.querySelectorAll("div[x-show='expanded'] a")]
            .map(a => this.hyperLinkToChapter(a))
            .reverse();
    }

    hyperLinkToChapter(link) {
        let episode = link.parentElement.parentElement
            .querySelector("[x-text='chapter.episode']")
            ?.textContent;
        let titleText = link.querySelector("span").textContent.trim();

        return {
            sourceUrl: link.href,
            title: `Episode ${episode}: ${titleText}`,
        };
    }

    findContent(dom) {
        return dom.querySelector("[wire\\:ignore]");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1");
    }

    findChapterTitle(dom) {
        let h1 = dom.querySelector("h1");
        return h1.textContent.trim() + ": " + h1.nextElementSibling.textContent;
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.w-full");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll(".lg\\:col-span-2 .text-primary-500")];
    }
}
