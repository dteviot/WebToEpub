"use strict";

parserFactory.register("mimihui.com", () => new MimihuiParser());

class MimihuiParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let tocUrl = dom.querySelector(".chapter-more a").href;

        let tocPage = (await HttpClient.wrapFetch(tocUrl)).responseXML;

        let menu = tocPage.querySelector(".chapter-list");

        let chapters = util.hyperlinksToChapterList(menu, link => !link.textContent.trim().endsWith("VIP"));

        chapters = chapters.map(ch => { if (ch.title.endsWith("免费")) { return { ...ch, title: ch.title.slice(0, -2) }; } return ch; });

        return chapters;
    }

    extractSubject(dom) {
        let genres = [...dom.querySelectorAll(".info > dl:nth-child(4) > dd a")];
        let tags = [...dom.querySelectorAll(".info > dl:nth-child(5) > dd a")]; 
        return [...genres, ...tags].map(e => e.textContent).join(", ");
    }

    findContent(dom) {
        return dom.querySelector(".content");
    }

    findChapterTitle(dom) {
        return dom.querySelector(".title");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, ".cover");
    }

    extractLanguage(dom) {
        return dom.querySelector("html").getAttribute("lang");
    }

    extractTitleImpl(dom) {
        return dom.querySelector(".info > h1");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector(".info > dl:nth-child(2) > dd");
        return authorLabel?.textContent ?? super.extractAuthor(dom);
    }

    extractDescription(dom) {
        return dom.querySelector(".desc > p").textContent.trim();
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll(".info")];
    }
}
