"use strict";

parserFactory.register("foxteller.com", () => new FoxtellerParser());

class FoxtellerParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        return [...dom.querySelectorAll(".card li a")]
            .map(link => util.hyperLinkToChapter(link));
    }

    findContent(dom) {
        return Parser.findConstrutedContent(dom);
    }

    extractTitleImpl(dom) {
        return dom.querySelector("div.novel-title h2");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "figure.novel-featureimg");
    }

    async fetchChapter(url) {
        let chapterDom = (await HttpClient.wrapFetch(url)).responseXML;
        let content = (await this.fetchContentForChapter(chapterDom));
        let newDoc = Parser.makeEmptyDocForContent(url);
        let header = newDoc.dom.createElement("h1");
        header.textContent = chapterDom.querySelector("div.page-header h3").textContent;
        newDoc.content.appendChild(header);
        newDoc.content.appendChild(content.querySelector("article"));
        return newDoc.dom;        
    }

    async fetchContentForChapter(dom) {
        let novelRegex = /.*?novel_id'\s?:\s?'([\w\s]+)'/i;
        let chapRegex = /.*?chapter_id'\s?:\s?'([\w\s]+)'/i;

        let html = dom.head.innerText;
        let storyID = html.match(novelRegex)[1];
        let chapterID = html.match(chapRegex)[1];
        let options = {
            method: "POST",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json"
            },
            credentials: "include",
            body: JSON.stringify({x1: storyID, x2: chapterID})
        };
        let json = (await HttpClient.fetchJson("https://www.foxteller.com/aux_dem", options)).json;
        let decoded = this.decodeFoxteller(json);
        let rawHtml = "<article>" + decoded + "</article>";
        return util.sanitize(rawHtml);
    }

    decodeFoxteller(json) {
        var n = json.aux.replace(/%Ra&/g, "A").replace(/%Rc&/g, "B").replace(/%Rb&/g, "C").replace(/%Rd&/g, "D").replace(/%Rf&/g, "E").replace(/%Re&/g, "F");
        return decodeURIComponent(Array.prototype.map.call(atob(n), function(e) {
            return "%" + ("00" + e.charCodeAt(0).toString(16)).slice(-2);
        }).join(""));   
    }    

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.novel-description")];
    }
}
