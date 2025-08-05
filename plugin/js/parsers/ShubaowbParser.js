"use strict";

parserFactory.register("shubaowb.com", () => new ShubaowbParser());

class ShubaowbParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom, chapterUrlsUI) {
        let urlsOfTocPages  = this.getUrlsOfTocPages(dom);
        return (await this.getChaptersFromAllTocPages([],
            this.chaptersFromDom,
            urlsOfTocPages,
            chapterUrlsUI
        ));
    }

    chaptersFromDom(dom) {
        return [...dom.querySelectorAll(".book_last dd a")]
            .map(a => util.hyperLinkToChapter(a));
    }

    getUrlsOfTocPages(dom) {
        let optionToUrl = (o) => {
            let v = o.value;
            if (!v.startsWith("/novel")) {
                v = "/novel" + v;
            }
            return "https://shubaowb.com" + v; 
        };

        let listpage = dom.querySelector(".listpage");
        return [...listpage.querySelectorAll("option")]
            .map(optionToUrl);
    }    

    findContent(dom) {
        return dom.querySelector("#chaptercontent");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("span.title1");
    }

    findChapterTitle(dom) {
        return dom.querySelector("span.title1");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll(".book_about")];
    }
}
