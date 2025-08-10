"use strict";

parserFactory.register("peachygardens.blogspot.com", () => new PeachygardensBlogspotParser());

class PeachygardensBlogspotParser extends Parser {
    constructor() {
        super();
        this.ChacheChapterContent = new Map();
    }

    async getChapterUrls(dom, chapterUrlsUI) {
        //doing this allows me to get the book id from an script element
        dom = (await HttpClient.wrapFetch(dom.baseURI)).responseXML;
        // eslint-disable-next-line
        let regex = new RegExp("clwd\.run.\'.+\'.;");
        let script = [...dom.scripts].map(a => a.innerHTML);
        let Bookid = script.filter(a => a.match(regex))?.[0].match(regex)?.[0];
        Bookid = Bookid.slice(10, Bookid.length-3);

        let pageCount = 2;
        let Chapterjsons;
        let chapters = [];
        let partialList;
        for (let i = 1; i < pageCount; i=i+50) {
            await this.rateLimitDelay();
            Chapterjsons = (await HttpClient.fetchJson("https://peachygardens.blogspot.com/feeds/posts/default/-/" + Bookid + "?alt=json&start-index=" + i + "&max-results=50")).json;
            partialList = this.chaptersFromJson(Chapterjsons);
            this.chacheChapter(Chapterjsons);
            chapterUrlsUI.showTocProgress(partialList);
            chapters = chapters.concat(partialList);
            if (i == 1) {
                pageCount = Chapterjsons.feed.openSearch$totalResults.$t;
            }
        }
        chapters = chapters.filter(a => a.sourceUrl != dom.baseURI);
        return chapters.reverse();
    }

    chaptersFromJson(json) {
        return json.feed.entry.map(a => ({
            sourceUrl: a.link[2].href, 
            title: a.link[2].title
        }));
    }

    chacheChapter(json) {
        json.feed.entry.map(a => (this.ChacheChapterContent.set(a.link[2].href, [a.link[2].title, a.content.$t])));
    }

    findContent(dom) {
        return Parser.findConstrutedContent(dom);
    }

    findCoverImageUrl(dom) {
        let coverImage = dom.querySelector("header");
        return coverImage === null
            ? null
            : coverImage.querySelector("img").src;
    }

    async fetchChapter(url) {
        return this.buildChapter(this.ChacheChapterContent.get(url), url);
    }

    buildChapter(json, url) {
        let newDoc = Parser.makeEmptyDocForContent(url);
        let title = newDoc.dom.createElement("h1");
        title.textContent = json[0];
        newDoc.content.appendChild(title);
        let content = util.sanitize(json[1]);
        util.moveChildElements(content.body, newDoc.content);
        return newDoc.dom;
    }
}
