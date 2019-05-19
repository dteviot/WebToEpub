"use strict";

parserFactory.register("tapread.com", () => new TapreadParser());

class TapreadParser extends Parser{
    constructor() {
        super();
    }

    getChapterUrls(dom) {
        let chapters = [...dom.querySelectorAll("a.chapter-item")]
            .map(TapreadParser.linkToChapter);
        return Promise.resolve(chapters);
    };

    static linkToChapter(link) {
        let title = link.querySelector("p");
        title.querySelector("span").remove();
        return ({
            sourceUrl: link.href,
            title: title.textContent
        });
    }

    findContent(dom) {
        return Parser.findConstrutedContent(dom);
    };

    extractTitleImpl(dom) {
        return dom.querySelector("div.book-name");
    };

    extractAuthor(dom) {
        let authorLabel = dom.querySelector("div.author > span.name");
        return (authorLabel === null) ? super.extractAuthor(dom) : authorLabel.textContent;
    };

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.book-img");
    }

    fetchChapter(url) {
        let index = url.indexOf("?");
        let fetchUrl = "https://www.tapread.com/book/chapter" + url.substring(index);
        let options = {
            method: "POST",
            credentials: "include"
        };
        return HttpClient.fetchJson(fetchUrl, options).then(function (xhr) {
            return TapreadParser.jsonToHtml(url, xhr.json);
        });
    }

    static jsonToHtml(pageUrl, json) {
        let newDoc = Parser.makeEmptyDocForContent();
        let header = newDoc.dom.createElement("h1");
        header.textContent = json.result.chapterName;
        newDoc.content.appendChild(header);
        let content = new DOMParser().parseFromString(json.result.content, "text/html");
        for(let n of [...content.body.childNodes]){
            newDoc.content.appendChild(n);
        }
        return newDoc.dom;
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.synopsis p.desc")];
    }
}
