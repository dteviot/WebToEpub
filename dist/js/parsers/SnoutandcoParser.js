"use strict";

parserFactory.register("snoutandco.ca", () => new SnoutandcoParser());

class SnoutandcoParser extends Parser { // eslint-disable-line no-unused-vars
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let menu = dom.querySelector("ul.list-group");
        let chapterList = util.hyperlinksToChapterList(menu);

        // save titles to add back when fetch chapter content
        SnoutandcoParser.titles = new Map();
        chapterList.forEach(l => SnoutandcoParser.titles.set(l.sourceUrl, l.title));

        return chapterList;
    }

    findContent(dom) {
        return Parser.findConstrutedContent(dom);
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1#book-title");
    }

    async fetchChapter(url) {
        let params = new URL(url).searchParams;
        let folder = params.get("folder");
        let chapter = params.get("chapter");
        let contentUrl = `https://snoutandco.ca/${folder}/chapters/${chapter}`;
        let contentText = (await HttpClient.fetchText(contentUrl));
        return this.buildChapter(contentText, url);
    }

    buildChapter(contentText, url) {
        let newDoc = Parser.makeEmptyDocForContent(url);
        let title = newDoc.dom.createElement("h1");
        title.textContent = SnoutandcoParser.titles.get(url);
        newDoc.content.appendChild(title);
        Parser.addTextToChapterContent(newDoc, contentText);
        return newDoc.dom;
    }
}
