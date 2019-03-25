"use strict";

parserFactory.register("novelspread.com", function() { return new NovelSpreadParser() });

class NovelSpreadParser extends Parser{
    constructor() {
        super();
    }

    getChapterUrls(dom) {
        let chapters = [...dom.querySelectorAll("div.volumeBox a")]
            .map(a => util.hyperLinkToChapter(a));
        for (let i = 0; i < chapters.length; ++i) {
            let chapter = chapters[i];
            chapter.title = `${i + 1}. ${chapter.title}`;
        }
        return Promise.resolve(chapters);
    };

    findContent(dom) {
        return Parser.findConstrutedContent(dom);
    };

    extractTitleImpl(dom) {
        return dom.title.split("-")[0];
    };

    extractAuthor(dom) {
        let authorLabel = dom.querySelector("div.main-left div.person h4");
        return (authorLabel === null) ? super.extractAuthor(dom) : authorLabel.textContent;
    };

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.novelimg");
    }

    fetchChapter(url) {
        return HttpClient.wrapFetch(url).then(function (xhr) {
            let restUrl = NovelSpreadParser.extractRestUrl(xhr.responseXML);
            return HttpClient.fetchJson(restUrl);
        }).then(function (handler) {
            return NovelSpreadParser.buildChapter(handler.json.data);
        });
    }

    static extractRestUrl(dom) {
        let div = dom.querySelector("div.text-body");
        let chapterId = div.getAttribute("data-chapter-id");
        return `https://www.novelspread.com/chapter/${chapterId}`;
    }

    static buildChapter(json) {
        let newDoc = Parser.makeEmptyDocForContent();
        let base = "https://www.novelspread.com" + json.path;
        util.setBaseTag(base, newDoc.dom);        
        let title = newDoc.dom.createElement("h1");
        title.textContent = `${json.chapter_number}. ${json.chapter_title}`;
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
