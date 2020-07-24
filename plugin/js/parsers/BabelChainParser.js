"use strict";

parserFactory.register("novel.babelchain.org", () => new BabelChainParser());
parserFactory.register("babelnovel.com", () => new BabelChainParser());

class BabelChainParser extends Parser{
    constructor() {
        super();
    }
    
    async getChapterUrls(dom) {
        let chaptersPerTocPage = 100;
        let bookId = new URL(dom.querySelector("link[rel='chapters'").href).pathname.split("/")[3];
        let chapterUrlBase = dom.querySelector("link[rel='canonical'").href + "/chapters/";
        let numChapters = [...dom.querySelectorAll("div.PC_item-tag-box___3zJQx")]
            .map(d => d.textContent)
            .filter(c => c.includes("Chapters"))
            .map(c => parseInt(c))[0];
        let numTocPages = Math.ceil(numChapters / chaptersPerTocPage);
        let chapters = [];
        for (let page = 0; page < numTocPages; ++page) {
            let restUrl = `https://babelnovel.com/api/books/${bookId}/chapters?bookId=${bookId}&pageSize=${chaptersPerTocPage}&page=${page}&fields=id,name,canonicalName`;
            let json = (await HttpClient.fetchJson(restUrl)).json;
            chapters = chapters.concat(BabelChainParser.jsonToChapters(json, chapterUrlBase));
        }
        return chapters;
    }

    static jsonToChapters(json, chapterUrlBase) {
        return json.data.map(e => ({
            sourceUrl: chapterUrlBase + e.canonicalName,
            title: e.name,
            newArc: null
        }));
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1");
    }

    findContent(dom) {
        return Parser.findConstrutedContent(dom);
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.Image_image-wrapper___30T8h.PC_cover___u9Mov");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.PC_synopsis-section___2GSXe")];
    }

    // rate limit site
    clampSimultanousFetchSize() {
        return 1;
    }

    async fetchChapter(url) {
        const rateLimitTo20PagePerMinute = 3000;
        await util.sleep(rateLimitTo20PagePerMinute);
        let contentUrl = url.replace("/books/", "/api/books/") + "/content";
        let xhr = await HttpClient.fetchJson(contentUrl);
        let doc = BabelChainParser.jsonToHtml(xhr.json);
        return doc;
    }
 
    static jsonToHtml(json) {
        let newDoc = Parser.makeEmptyDocForContent();
        let header = newDoc.dom.createElement("h1");
        header.textContent = json.data.name || json.data.canonicalName;
        newDoc.content.appendChild(header);
        let paragraphs = json.data.content.split("\n\n")
            .filter(p => !util.isNullOrEmpty(p));
        for (let text of paragraphs) {
            let p = newDoc.dom.createElement("p");
            p.appendChild(newDoc.dom.createTextNode(text))
            newDoc.content.appendChild(p);
        }
        return newDoc.dom;
    }
}