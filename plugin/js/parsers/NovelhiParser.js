"use strict";

parserFactory.register("novelhi.com", () => new NovelhiParser());

class NovelhiParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let tocUrl = dom.querySelector("div.bookChapter a.fr");
        let tocDom = (await HttpClient.wrapFetch(tocUrl)).responseXML;
        return [...tocDom.querySelectorAll("div.dirList a")]
            .map(a => NovelhiParser.LinkToChapter(a, dom.baseURI));
    }

    static LinkToChapter(link, baseURI) {
        let onclick = link.getAttribute("onClick").split("'");
        return {
            sourceUrl: baseURI + "/" + onclick[1],
            title: link.querySelector("span").textContent            
        };
    }

    findContent(dom) {
        return dom.querySelector("#readcontent #showReading");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("div.tit h1");
    }

    findChapterTitle(dom) {
        return dom.querySelector("#readcontent .book_title h1");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.bookCover");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.intro_txt")];
    }

    cleanInformationNode(node) {
        util.removeChildElementsMatchingSelector(node, "a");        
        return node;
    }    
}
