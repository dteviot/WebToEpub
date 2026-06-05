"use strict";

parserFactory.register("flying-lines.com", () => new FlyingLinesParser());

class FlyingLinesParser extends Parser {
    constructor() {
        super();
    }

    getChapterUrls(dom) {
        let menu = dom.querySelector("div.chapter-container");
        return Promise.resolve(util.hyperlinksToChapterList(menu));
    }

    findContent(dom) {
        return Parser.findConstrutedContent(dom);
    }

    extractTitleImpl(dom) {
        return dom.querySelector("div.title h2");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector("ul.profile li");
        if (authorLabel === null) {
            return super.extractAuthor(dom);
        }
        util.removeChildElementsMatchingSelector(authorLabel, "span");
        return authorLabel.textContent;
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.novel-thumb");
    }

    // this is basically identical to NovelSpread
    fetchChapter(url) {
        return HttpClient.wrapFetch(url).then(function(xhr) {
            let restUrl = FlyingLinesParser.extractRestUrl(xhr.responseXML);
            return HttpClient.fetchJson(restUrl);
        }).then(function(handler) {
            return FlyingLinesParser.buildChapter(handler.json.data);
        });
    }

    static extractRestUrl(dom) {
        let chapterId = dom.querySelector("div.main_body")
            .getAttribute("data-chapter-id");
        return `https://www.flying-lines.com/chapter/${chapterId}`;
    }

    static buildChapter(json) {
        let base = "https://www.flying-lines.com" + json.path;
        let newDoc = Parser.makeEmptyDocForContent(base);
        let title = newDoc.dom.createElement("h1");
        title.textContent = `${json.chapter_number}. ${json.chapter_title}`;
        newDoc.content.appendChild(title);
        let content = util.sanitize(json.chapter_content);
        for (let n of [...content.body.childNodes]) {
            if (n.className !== "siteCopyrightInfo") {
                newDoc.content.appendChild(n);
            }
        }
        return newDoc.dom;
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.novel-info, div.synopsis-detail")];
    }
}
