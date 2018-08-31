"use strict";

parserFactory.register("mangadex.org", function() { return new MangadexParser() });

class MangadexParser extends Parser{
    constructor() {
        super();
    }

    getChapterUrls(dom) {
        let chapters = [...dom.querySelectorAll("div.chapter-row")]
            .filter(row => (row.querySelector("img[alt='English']") != null))
            .map(row => util.hyperLinkToChapter(row.querySelector("a")));
        return Promise.resolve(chapters.reverse());
    };

    extractTitleImpl(dom) {
        return dom.querySelector("h3.panel-title");
    };

    findContent(dom) {
        return dom.querySelector("div." + Parser.WEB_TO_EPUB_CLASS_NAME);
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.card-body");
    }
    
    fetchChapter(url) {
        let restUrl = MangadexParser.chapterImagesRestUrl(url);
        return HttpClient.fetchJson(restUrl).then(function (xhr) {
            return MangadexParser.jsonToHtmlWithImgTags(url, xhr.json);
        });
    }

    static jsonToHtmlWithImgTags(pageUrl, json) {
        let dom = document.implementation.createHTMLDocument("");
        let content = MangadexParser.makeContentElement(dom);
        let server = json.server;
        if (server === "/data/") {
            let hostName = util.extractHostName(pageUrl);
            server = `https://${hostName}/data/`;
        }
        for(let page of json.page_array) {
            let img = dom.createElement("img");
            img.src = `${server}${json.hash}/${page}`;
            content.appendChild(img);
        };
        return dom;
    }

    static chapterImagesRestUrl(url) {
        let fragments = url.split("/");
        let last = fragments[fragments.length - 1];
        return `https://mangadex.org/api/chapter/${last}`;
    }

    static makeContentElement(dom) {
        let content = dom.createElement("div");
        content.className = Parser.WEB_TO_EPUB_CLASS_NAME;
        dom.body.appendChild(content);
        return content;
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.card-body div.row")]
            .filter(row => (row.querySelector("img, button") === null))
    }
}
