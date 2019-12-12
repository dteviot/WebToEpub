"use strict";

parserFactory.register("novel.babelchain.org", () => new BabelChainParser());
parserFactory.register("babelnovel.com", () => new BabelChainParser());

class BabelChainParser extends Parser{
    constructor() {
        super();
    }
    
    static getStateJson(dom) {
        let json = [...dom.querySelectorAll("script")]
            .map(s => s.textContent)
            .filter(t => t.includes("window.__STATE__"))
            .map(r => JSON.parse(decodeURIComponent(util.extactSubstring(r, "\"", "\""))));
        return json[0]; 
    }

    getBookEntity(dom) {
        let state = BabelChainParser.getStateJson(dom);
        return state.bookDetailStore.bookEntity;
    }

    getChapterUrls(dom) {
        let bookEntity = this.getBookEntity(dom);
        return Promise.resolve(BabelChainParser.guessChapterList(bookEntity));
    }

    static guessChapterList(bookEntity) {
        let list = [];
        for(let i = 1; i <= bookEntity.chapterCount; ++i) {
            let name = `c${i}`;
            list.push({
                sourceUrl: `https://babelnovel.com/books/${bookEntity.canonicalName}/chapters/${name}`,
                title: name
            });
        }
        return list;
    }

    extractTitleImpl(dom) {
        return this.getBookEntity(dom).name || null;
    }

    findContent(dom) {
        return Parser.findConstrutedContent(dom);
    }

    findCoverImageUrl(dom) {
        return this.getBookEntity(dom).cover || null;
    }

    getInformationEpubItemChildNodes(dom) {
        let synopsis = [];
        let entity = this.getBookEntity(dom);
        this.addTextToSynopsis(synopsis, entity.subTitle);
        this.addTextToSynopsis(synopsis, entity.synopsis);
        return synopsis;
    }

    addTextToSynopsis(synopsis, text) {
        if (text) {
            let p = document.createElement("p");
            p.textContent = text;
            synopsis.push(p);
        }
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