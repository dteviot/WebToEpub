"use strict";

parserFactory.register("www.dudushuge.com", () => new DudushugeParser());

class DudushugeParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom, chapterUrlsUI) {
        let tocPage1chapters = DudushugeParser.extractPartialChapterList(dom);
        let urlsOfTocPages  = DudushugeParser.getUrlsOfTocPages(dom);
        return (await this.getChaptersFromAllTocPages(tocPage1chapters,
            DudushugeParser.extractPartialChapterList,
            urlsOfTocPages,
            chapterUrlsUI
        ));
    }

    static getUrlsOfTocPages(dom) {
        return [...dom.querySelectorAll(".middle > select:nth-child(1) option")]
            .map(opt => new URL(opt.value, dom.baseURI).href);
    }

    static extractPartialChapterList(dom) {
        return [...dom.querySelectorAll("div.section-box:nth-child(4) > ul:nth-child(1) li a")]
            .map(a => util.hyperLinkToChapter(a));
    }
    
    findContent(dom) {
        return dom.querySelector("#content");
    }
        
    extractTitleImpl(dom) {
        return dom.querySelector(".top > h1:nth-child(1)");
    }
    
    extractAuthor(dom) {
        let authorLabel = dom.querySelector("div.fix > p:nth-child(1)");
        
        return authorLabel?.textContent.replace("作者：", "").trim() ?? super.extractAuthor(dom);
    }
    
    extractLanguage() {
        return "zh-CN";
    }
    
    extractDescription(dom) {
        return dom.querySelector(".desc").textContent.trim();
    }
    
    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, ".imgbox");
    }
}
