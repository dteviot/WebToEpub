"use strict";
parserFactory.register("novelangel.com", () => new NovelAngelParser());

class NovelAngelParser extends Parser {
    constructor() {
        super();
        this.minimumThrottle = 2000;
    }

    static apiOrigin() {
        return "https://api.novelangel.com/api/v1/books";
    }

    static slugFromUrl(url) {
        let segments = new URL(url).pathname.split("/").filter(s => s !== "");
        let index = segments.indexOf("book");
        return segments[index + 1];
    }

    async ensureBookJson(url) {
        let slug = NovelAngelParser.slugFromUrl(url);
        if ((this.bookJson == null) || (this.bookJson.slug !== slug)) {
            this.bookJson = (await HttpClient.fetchJson(`${NovelAngelParser.apiOrigin()}/${slug}`)).json.data;
        }
        return this.bookJson;
    }

    async getChapterUrls(dom) {
        let book = await this.ensureBookJson(dom.baseURI);
        let bookUrl = new URL(dom.baseURI);
        let baseChapterUrl = `${bookUrl.origin}/book/${book.slug}/chapter/`;
        return book.chapters.map(c => ({
            sourceUrl: baseChapterUrl + c.chapterNo,
            title: `${c.chapterNo}. ${c.title}`,
            isIncludeable: !c.coinCost
        }));
    }

    async loadEpubMetaInfo(dom) {
        await this.ensureBookJson(dom.baseURI);
    }

    extractTitleImpl() {
        return this.bookJson?.title;
    }

    extractAuthor(dom) {
        return this.bookJson?.author ?? super.extractAuthor(dom);
    }

    extractSubject() {
        return this.bookJson?.tags?.join(", ") ?? "";
    }

    extractDescription() {
        return this.bookJson?.description?.trim() ?? "";
    }

    findCoverImageUrl() {
        return this.bookJson?.bookImage;
    }

    findContent(dom) {
        return Parser.findConstructedContent(dom);
    }

    async fetchChapter(url) {
        let book = await this.ensureBookJson(url);
        let chapterNo = url.split("/").pop();
        let json = (await HttpClient.fetchJson(`${NovelAngelParser.apiOrigin()}/${book._id}/chapters/${chapterNo}`)).json;
        return this.buildChapter(json, url);
    }

    buildChapter(json, url) {
        let newDoc = Parser.makeEmptyDocForContent(url);
        let title = newDoc.dom.createElement("h1");
        title.textContent = json.data.chapter.title;
        newDoc.content.appendChild(title);
        if (json.data.chapter.content == null) {
            let locked = newDoc.dom.createElement("p");
            locked.textContent = "[This chapter requires coins to unlock and could not be downloaded.]";
            newDoc.content.appendChild(locked);
            return newDoc.dom;
        }
        let content = util.sanitize(json.data.chapter.content);
        util.moveChildElements(content.body, newDoc.content);
        return newDoc.dom;
    }
}
