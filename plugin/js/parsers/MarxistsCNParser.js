"use strict";

parserFactory.register("marxists.org", () => new MarxistsCNParser());

class MarxistsCNParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let menu = dom.querySelector("table[border='0']");
        let chapterUrls = [];
        let links = menu.querySelectorAll("a");
        for (let link of links) {
            if (link.href && link.href.endsWith(".htm")) {
                chapterUrls.push({ 
                    sourceUrl: link.href, 
                    title: link.textContent 
                });
            }
        }
        return chapterUrls;
    }

    findContent(dom) {
        return dom.querySelector("body");
    }
    
    extractTitleImpl(dom) {
        return dom.querySelector("title0");
    }

    extractLanguage() {
        return "cn";
    }
    
    extractAuthor(dom) {
        let element = dom.querySelector("author");
        return (element === null) ? "" : element.textContent;
    }

    findChapterTitle(dom) {
        return dom.querySelector("title");
    }

    async fetchChapter(url) {
        // site does not tell us gbk is used to encode text
        let options = { 
            makeTextDecoder: () => new TextDecoder("gbk") 
        };
        return (await HttpClient.wrapFetch(url, options)).responseXML;
    }
}
