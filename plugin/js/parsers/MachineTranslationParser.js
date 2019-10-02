"use strict";

parserFactory.register("machine-translation.org", () => new MachineTranslationParser());

class MachineTranslationParser extends Parser{
    constructor() {
        super();
    }

    getChapterUrls(dom) {
        let toc = dom.querySelector("div.table-body");
        return Promise.resolve(util.hyperlinksToChapterList(toc).reverse());
    }

    findContent(dom) {
        return dom.querySelector("div.read-context");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("div.title b");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector("div.title span");
        return (authorLabel === null) ? super.extractAuthor(dom) : authorLabel.textContent;
    }

    findChapterTitle(dom) {
        return dom.querySelector(".read-title");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.book-img");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.book-info-bottom .context")];
    }
}
