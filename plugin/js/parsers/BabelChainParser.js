"use strict";

parserFactory.register("novel.babelchain.org", () => new BabelChainParser());
parserFactory.register("babelnovel.com", () => new BabelChainParser());

class BabelChainParser extends Parser{
    constructor() {
        super();
    }
    
    getBookEntity(dom) {
        let __STATE__ = decodeURIComponent(dom.body.innerHTML.match(/window\.__STATE__\s=\s"([^"]+)"/)[1]);
        let state = JSON.parse(__STATE__);
        return state.bookDetailStore.bookEntity;
    }

    getChapterUrls(dom) {
        let bookEntity = this.getBookEntity(dom);
        let chaptersUrl = `https://babelnovel.com/api/books/${bookEntity.id}/chapters?pageSize=50000&page=0`;

        return HttpClient.fetchJson(chaptersUrl).then((xhr) => {
            return xhr.json.data.map((chapter) => {
                return {
                    sourceUrl: `https://babelnovel.com/books/${bookEntity.canonicalName}/chapters/${chapter.canonicalName}`,
                    title: chapter.name
                };
            });
        }).catch(
            () => []
        );
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

    fetchChapter(url) {
        let fetchUrl = url.replace("/books/", "/api//books/");
        return HttpClient.fetchJson(fetchUrl).then(
            (xhr) => BabelChainParser.jsonToHtml(xhr.json)
        );
    }

    static jsonToHtml(json) {
        let newDoc = Parser.makeEmptyDocForContent();
        let header = newDoc.dom.createElement("h1");
        header.textContent = json.data.canonicalName;
        newDoc.content.appendChild(header);
        let pre = newDoc.dom.createElement("div");
        newDoc.content.appendChild(pre);
        pre.textContent = json.data.content.replace("<blockquote>", "").replace("</blockquote>", "");
        util.convertPreTagToPTags(newDoc.dom, pre, "\n\n");
        return newDoc.dom;
    }
}