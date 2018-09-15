"use strict";

parserFactory.register("novelspread.com", function() { return new NovelSpreadParser() });

class NovelSpreadParser extends Parser{
    constructor() {
        super();
    }

    getChapterUrls(dom) {
        let url = NovelSpreadParser.findTocRestUri(dom);
        return HttpClient.fetchJson(url).then(function (handler) {
            return NovelSpreadParser.buildChaptersList(handler.json);
        })
    };

    static findTocRestUri(dom) {
        let div = dom.querySelector("div.main-body[data-novel]");
        let dataNovel = div.getAttribute("data-novel");
        return "https://www.novelspread.com/novel/catalog/" + dataNovel;
    };

    static buildChaptersList(json) {
        return Promise.resolve(json.data.map(
            j => ({
                sourceUrl: "https://www.novelspread.com/chapter/" + j.id,
                title: j.chapter_title,
                newArc: null
            })
        ));
    };

    findContent(dom) {
        return Parser.findConstrutedContent(dom);
    };

    extractTitleImpl(dom) {
        return dom.querySelector("div.main-right h3");
    };

    extractAuthor(dom) {
        let authorLabel = dom.querySelector("div.main-left div.person h4");
        return (authorLabel === null) ? super.extractAuthor(dom) : authorLabel.textContent;
    };

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.novelimg");
    }

    fetchChapter(url) {
        return HttpClient.fetchJson(url).then(function (handler) {
            return NovelSpreadParser.buildChapter(handler.json.data);
        })
    }

    static buildChapter(json) {
        let newDoc = Parser.makeEmptyDocForContent("");
        let base = "https://www.novelspread.com" + json.path;
        util.setBaseTag(base, newDoc.dom);        
        let title = newDoc.dom.createElement("h1");
        title.textContent = json.chapter_title;
        newDoc.content.appendChild(title);
        let content = new DOMParser().parseFromString(json.chapter_content, "text/html");
        for(let n of [...content.body.childNodes]) {
            newDoc.content.appendChild(n);
        }
        return newDoc.dom;
    }
    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.info, div.syn")];
    }
}
