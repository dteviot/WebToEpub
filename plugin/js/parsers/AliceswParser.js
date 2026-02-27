"use strict";

parserFactory.register("alicesw.com", () => new AliceswParser());

class AliceswParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let tocUrl = dom.querySelector(".tit a").href;

        let tocPage = (await HttpClient.wrapFetch(tocUrl)).responseXML;

        let menu = tocPage.querySelector(".mulu_list");
        return util.hyperlinksToChapterList(menu);
    }

    extractSubject(dom) {
        let genres = [...dom.querySelectorAll(".novel_info > p:nth-child(2) a")];
        let tags = [...dom.querySelectorAll(".tags_list a")]; 
        return [...genres, ...tags].map(e => e.textContent).join(", ");
    }

    findContent(dom) {
        return dom.querySelector(".read-content");
    }

    findChapterTitle(dom) {
        return dom.querySelector(".j_chapterName");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, ".pic");
    }

    extractLanguage() {
        return "zh-CN";
    }

    extractTitleImpl(dom) {
        return dom.querySelector(".novel_title");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector(".novel_info > p:nth-child(1) > a");
        return authorLabel?.textContent ?? super.extractAuthor(dom);
    }

    extractDescription(dom) {
        return dom.querySelector(".jianjie p").textContent.trim();
    }
}