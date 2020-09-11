"use strict";

parserFactory.register("machine-translation.org", () => new MachineTranslationParser());

class MachineTranslationParser extends Parser{
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let toc = dom.querySelector("div.table-body, div.chapter-list");
        return util.hyperlinksToChapterList(toc).reverse();
    }

    findContent(dom) {
        return dom.querySelector("div.read-context");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("div.title b, h2.title");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector("div.title span, p.author");
        return (authorLabel === null) ? super.extractAuthor(dom) : authorLabel.textContent;
    }

    findChapterTitle(dom) {
        return dom.querySelector(".read-title");
    }

    findCoverImageUrl(dom) {
        let bookimg = dom.querySelector("div.book-img");
        if (bookimg.querySelector("img")) {
            return util.getFirstImgSrc(dom, "div.book-img");
        }
        let img = bookimg.style.backgroundImage;
        return (img != null)
            ? util.extractUrlFromBackgroundImage(img)
            : null;
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.book-info-bottom .context")];
    }
}
