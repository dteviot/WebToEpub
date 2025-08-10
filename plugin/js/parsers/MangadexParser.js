"use strict";

parserFactory.register("mangadex.org", function() { return new MangadexParser(); });

class MangadexParser extends Parser {
    constructor() {
        super();
    }

    getChapterUrls(dom) {
        let chapters = [...dom.querySelectorAll("div.chapter-row")]
            .filter(row => (row.querySelector("img[alt='English']") != null))
            .map(row => util.hyperLinkToChapter(row.querySelector("a")));
        return Promise.resolve(chapters.reverse());
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h3.panel-title");
    }

    findContent(dom) {
        return Parser.findConstrutedContent(dom);
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.card-body");
    }
    
    fetchChapter(url) {
        let restUrl = MangadexParser.chapterImagesRestUrl(url);
        return HttpClient.fetchJson(restUrl).then(function(xhr) {
            return MangadexParser.jsonToHtmlWithImgTags(url, xhr.json);
        });
    }

    static jsonToHtmlWithImgTags(pageUrl, json) {
        let newDoc = Parser.makeEmptyDocForContent(pageUrl);
        let server = json.server;
        if (server === "/data/") {
            let hostName = util.extractHostName(pageUrl);
            server = `https://${hostName}/data/`;
        }
        for (let page of json.page_array) {
            let img = newDoc.dom.createElement("img");
            img.src = `${server}${json.hash}/${page}`;
            newDoc.content.appendChild(img);
        }
        return newDoc.dom;
    }

    static chapterImagesRestUrl(url) {
        let fragments = url.split("/");
        let last = fragments[fragments.length - 1];
        return `https://mangadex.org/api/chapter/${last}`;
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.card-body div.row")]
            .filter(row => (row.querySelector("img, button") === null));
    }
}
