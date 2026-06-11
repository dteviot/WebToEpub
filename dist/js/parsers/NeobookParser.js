"use strict";

parserFactory.register("neobook.org", () => new NeobookParser());

class NeobookParser extends Parser { // eslint-disable-line no-unused-vars
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let menu = dom.querySelector("div#book-about-chapters");
        return util.hyperlinksToChapterList(menu);
    }

    findContent(dom) {
        return Parser.findConstrutedContent(dom);
    }

    extractTitleImpl(dom) {
        return dom.querySelector("div.book-title");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.book-cover-wrapper");
    }

    async fetchChapter(url) {
        let rawHTML = (await HttpClient.fetchHtml(url)).responseXML;
        let json = this.extractJson(rawHTML);
        return this.buildChapter(json, url);
    }

    extractJson(rawHTML) {
        let prefix = "var data = ";
        let script = [...rawHTML.querySelectorAll("script")]
            .filter(s => s.textContent.includes(prefix))
            .map(s => s.textContent)[0];
        return util.locateAndExtractJson(script, prefix);
    }

    buildChapter(json, url) {
        let chapter = json.chapters
            .filter(c => c?.data?.html != null)[0];
        let newDoc = Parser.makeEmptyDocForContent(url);
        let title = newDoc.dom.createElement("h1");
        title.textContent = chapter.data.title;
        newDoc.content.appendChild(title);
        let content = util.sanitize(chapter.data.html);
        util.moveChildElements(content.body, newDoc.content);
        return newDoc.dom;
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("#book-about-description")];
    }
}
