"use strict";

//dead url/ parser
parserFactory.register("novel.babelchain.org", () => new BabelChainParser());
//dead url
parserFactory.register("babelnovel.com", () => new BabelChainParser());

class BabelChainParser extends Parser {
    constructor() {
        super();
    }
    
    async getChapterUrls(dom) {
        let chapters = this.extractChapterList(dom);
        if (chapters.length === 0) {
            let url = dom.baseURI + "/chapters";
            let chapterDom = (await HttpClient.wrapFetch(url)).responseXML;
            chapters = this.extractChapterList(chapterDom);
        }
        return chapters;
    }

    findDiv(element, classPrefix) {
        let candidates = [...element.querySelectorAll("div")]
            .filter(e => e.className.startsWith(classPrefix));
        return 0 < candidates.length ? candidates[0] : null;
    }

    extractChapterList(dom) {
        let menu = this.findDiv(dom, "chapters_list__ttW1Q");
        return (menu === null)
            ? []
            :  util.hyperlinksToChapterList(menu);
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
        let coverImage = this.findDiv(dom, "book-info_wrapper");
        return coverImage === null
            ? null
            : coverImage.querySelector("img").src;
    }

    getInformationEpubItemChildNodes(dom) {
        let synopsis = this.findDiv(dom, "book-info_synopsis-wrapper");
        return synopsis === null ? [] : [synopsis];
    }

    async fetchChapter(url) {
        const rateLimitTo20PagePerMinute = 3000;
        await util.sleep(rateLimitTo20PagePerMinute);
        let contentUrl = url.replace("//babelnovel.com/", "//api.babelnovel.com/v1/") + "/content";
        let xhr = await HttpClient.fetchJson(contentUrl);
        let doc = BabelChainParser.jsonToHtml(xhr.json, contentUrl);
        return doc;
    }
 
    static jsonToHtml(json, contentUrl) {
        let newDoc = Parser.makeEmptyDocForContent(contentUrl);
        let header = newDoc.dom.createElement("h1");
        header.textContent = json.data.name || json.data.canonicalName;
        newDoc.content.appendChild(header);
        let paragraphs = json.data.content.split("\n\n")
            .filter(p => !util.isNullOrEmpty(p));
        for (let text of paragraphs) {
            let p = newDoc.dom.createElement("p");
            p.appendChild(newDoc.dom.createTextNode(text));
            newDoc.content.appendChild(p);
        }
        return newDoc.dom;
    }
}