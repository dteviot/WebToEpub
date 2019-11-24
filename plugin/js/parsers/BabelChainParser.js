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

    static getstylesToDelete(css) {
        let lines = css.split("}")
           .filter(l => l.includes("width:0; height:0;"));
        return (0 < lines.length)
           ? lines[0].split("{")[0]
           : null;
    }

    getBookEntity(dom) {
        let state = BabelChainParser.getStateJson(dom);
        return state.bookDetailStore.bookEntity;
    }

    getChapterUrls(dom) {
        let bookEntity = this.getBookEntity(dom);
        let chaptersUrl = `https://babelnovel.com/api/books/${bookEntity.id}/chapters?bookId=${bookEntity.id}&pageSize=${bookEntity.chapterCount}&page=0&fields=id,name,canonicalName,hasContent,type,translateStatus,publishTime`;

        return HttpClient.fetchJson(chaptersUrl).then((xhr) => {
            return xhr.json.data.map((chapter) => {
                return {
                    sourceUrl: `https://babelnovel.com/books/${bookEntity.canonicalName}/chapters/${chapter.canonicalName}`,
                    title: chapter.name
                };
            });
        }).catch(
            () => BabelChainParser.guessChapterList(bookEntity)
        );
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
        let cssFilter = await BabelChainParser.fetchCcsFilter(url);
        let contentUrl = url.replace("/books/", "/api/books/") + "/content";
        let xhr = await HttpClient.fetchJson(contentUrl);
        let doc = BabelChainParser.jsonToHtml(xhr.json, cssFilter);
        return doc;
    }
 
    static async fetchCcsFilter(url) {
        let xhr = await HttpClient.wrapFetch(url);
        let state = BabelChainParser.getStateJson(xhr.responseXML);
        let cssUrl = "https://babelnovel.com" + state.chapterDetailStore.cssUrl;
        let css = await HttpClient.fetchText(cssUrl);
        return BabelChainParser.getstylesToDelete(css);
    }

    static jsonToHtml(json, cssFilter) {
        let newDoc = Parser.makeEmptyDocForContent();
        let header = newDoc.dom.createElement("h1");
        header.textContent = json.data.name || json.data.canonicalName;
        newDoc.content.appendChild(header);

        let textContent = "<body>" + json.data.content + "</body>";
        let imported = new DOMParser().parseFromString(textContent, "text/html");
        util.removeChildElementsMatchingCss(imported.body, cssFilter);
        for(let e of imported.body.children) {
            let p = newDoc.dom.createElement("p");
            p.appendChild(newDoc.dom.createTextNode(e.textContent))
            newDoc.content.appendChild(p);
        }
        return newDoc.dom;
    }
}