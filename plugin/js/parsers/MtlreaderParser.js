"use strict";

parserFactory.register("mtlreader.com", () => new MtlreaderParser());

class MtlreaderParser extends Parser{
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let menu = dom.querySelector("table.table-responsive");
        return util.hyperlinksToChapterList(menu);
    }

    findContent(dom) {
        return Parser.findConstrutedContent(dom);
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h3");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.container");
    }

    async fetchChapter(url) {
        var dom = (await HttpClient.wrapFetch(url)).responseXML;
        var chapterId = new URL(url).pathname.split("/").pop();
        var contentUrl = "https://www.mtlreader.com/api/chapter-content/" + chapterId;
        var rawContent = (await HttpClient.fetchJson(contentUrl)).json;
        var chapterDom = new DOMParser().parseFromString(rawContent, "text/html");
        let newDoc = Parser.makeEmptyDocForContent(contentUrl);
        let title = dom.querySelector("h1");
        newDoc.content.appendChild(title);
        for(let e of [...chapterDom.body.childNodes]) {
            newDoc.content.appendChild(e);
        }
        return newDoc.dom;        
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div#editdescription")];
    }
}
