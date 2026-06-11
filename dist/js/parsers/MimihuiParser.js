"use strict";

parserFactory.register("mimihui.com", () => new MimihuiParser());

class MimihuiParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let tocUrl = dom.querySelector(".chapter-more a").href;

        let tocPage = (await HttpClient.wrapFetch(tocUrl)).responseXML;

        let menu = [...tocPage.querySelectorAll(".chapter-list a")];

        return menu.map(MimihuiParser.linkToChapter);
    }

    static linkToChapter(link) {
        let title = link.textContent.trim();

        let isIncludeable = !title.endsWith("VIP");

        if (title.endsWith("VIP")) {
            title = title.slice(0, -3).trim();
        }
        else if (title.endsWith("免费")) {
            title = title.slice(0, -2).trim();
        }

        return {
            sourceUrl: link.href, 
            title: title, 
            isIncludeable: isIncludeable
        };
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
