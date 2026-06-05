"use strict";

//dead url/ parser
parserFactory.register("novelspread.com", () => new NovelSpreadParser());
//dead url
parserFactory.register("m.novelspread.com", () => new MNovelSpreadParser());

class NovelSpreadParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let chapters = [...dom.querySelectorAll("div.volumeBox a")]
            .map(a => util.hyperLinkToChapter(a));
        for (let i = 0; i < chapters.length; ++i) {
            let chapter = chapters[i];
            chapter.title = `${i + 1}. ${chapter.title}`;
        }
        return chapters;
    }

    findContent(dom) {
        return Parser.findConstrutedContent(dom);
    }

    extractTitleImpl(dom) {
        return dom.title.split("-")[0];
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector("div.main-left div.person h4");
        return (authorLabel === null) ? super.extractAuthor(dom) : authorLabel.textContent;
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.novelimg");
    }

    async fetchChapter(url) {
        let restUrl = NovelSpreadParser.extractRestUrl(url);
        let data = (await HttpClient.fetchJson(restUrl)).json.data;
        return NovelSpreadParser.buildChapter(data);
    }

    static extractRestUrl(url) {
        // assumes url is like http://hostname/chapter/{title}/c-{chapterNum}-chapterTitle
        let path = new URL(url).pathname.split("/");
        let last = path.length - 1;
        let title = path[last - 1];
        let chapterNum = path[last].split("-")[1];
        return `https://api.novelspread.com/api/novel/${title}/chapter/${chapterNum}/content`;
    }

    static buildChapter(json) {
        let base = "https://www.novelspread.com" + json.path;
        let newDoc = Parser.makeEmptyDocForContent(base);
        let title = newDoc.dom.createElement("h1");
        title.textContent = `${json.chapter_number}. ${json.chapter_title}`;
        newDoc.content.appendChild(title);
        let content = util.sanitize(json.chapter_content);
        util.moveChildElements(content.body, newDoc.content);
        return newDoc.dom;
    }
    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.info, div.syn")];
    }
}

class MNovelSpreadParser extends NovelSpreadParser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let chapters = [...dom.querySelectorAll("a")]
            .filter(a => a.href.includes("/chapter/"))
            .map(a => util.hyperLinkToChapter(a));
        return chapters;
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.book");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.synopsis div")];
    }
}
