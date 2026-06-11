"use strict";

parserFactory.register("yeduge.com", () => new YedugeParser());

class YedugeParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let menu = [...dom.querySelectorAll(".chapter-list a")];

        return menu.map(YedugeParser.linkToChapter);
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

    findContent(dom) {
        return dom.querySelector(".content");
    }

    removeUnwantedElementsFromContentElement(element) {
        util.removeChildElementsMatchingSelector(element, "lock");
        super.removeUnwantedElementsFromContentElement(element);
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
        let authorLabel = dom.querySelector(".info > p:nth-child(2)");
        return authorLabel?.textContent.replace("作者：", "").trim() ?? super.extractAuthor(dom);
    }

    extractSubject(dom) {
        let genres = [...dom.querySelectorAll(".info > p:nth-child(4) a")];
        let tags = [...dom.querySelectorAll(".info > p:nth-child(5) a")];
        return [...genres, ...tags].map(e => e.textContent).join(", ");
    }

    extractDescription(dom) {
        return dom.querySelector(".desc").textContent.trim();
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll(".novel")];
    }
}