"use strict";

parserFactory.register("novelusb.com", () => new NovelUsbParser());
parserFactory.register("novelusb.net", () => new NovelUsbParser());
parserFactory.register("novelbin.me", () => new NovelUsbParser());

class NovelUsbParser extends Parser{
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let menu = dom.querySelector("#list-chapter");
        return util.hyperlinksToChapterList(menu);
    }

    findContent(dom) {
        return dom.querySelector("#chr-content");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h3.title");
    }

    extractAuthor(dom) {
        let items = [...dom.querySelectorAll("ul.info-meta li")]
            .filter(u => u.querySelector("h3")?.textContent === "Author:")
            .map(u => u.querySelector("a")?.textContent)
        return 0 < items.length 
            ? items[0]
            : super.extractAuthor(dom);
    }

    findChapterTitle(dom) {
        return dom.querySelector("h2");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.book");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll(".desc-text")];
    }
}
