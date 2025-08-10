"use strict";

parserFactory.register("requiemtls.com", function() { return new RequiemtlsParser(); });

class RequiemtlsParser extends Parser {
    constructor() {
        super();
    }
    
    async getChapterUrls(dom) {
        let table = [...dom.querySelectorAll("div.eplisterfull a")];
        let chapters = table.map(a => ({
            sourceUrl: a.href, 
            title: a.querySelector(".epl-num").textContent +" "+ a.querySelector(".epl-title").textContent
        }));
        return chapters.reverse();
    }

    findContent(dom) {
        return Parser.findConstrutedContent(dom);
    }

    extractSubject(dom) {
        let tags = ([...dom.querySelectorAll("div.info-content .genxed a")]);
        return tags.map(e => e.textContent.trim()).join(", ");
    }

    extractDescription(dom) {
        return dom.querySelector("div.entry-content").textContent.trim();
    }

    extractTitleImpl(dom) {
        return dom.querySelector(".entry-title");
    }

    findCoverImageUrl(dom) {
        return dom.querySelector("div.thumbook img.ts-post-image")?.src ?? null;
    }

    async fetchChapter(url) {
        let site = (await HttpClient.wrapFetch(url)).responseXML;
        return this.buildChapter(site, url);
    }

    buildChapter(dom, url) {
        let newDoc = Parser.makeEmptyDocForContent(url);
        let title = newDoc.dom.createElement("h1");
        title.textContent = dom.querySelector(".entry-title").textContent;
        newDoc.content.appendChild(title);
        let divret = newDoc.dom.createElement("div");
        let content = dom.querySelector(".entry-content");
        for (let n of [...content.childNodes]) {
            divret.appendChild(n);
        }
        let regex = new RegExp(/requiem_tnr_.*?(,|")/, "s");
        let font = dom.querySelector(".entry-content").outerHTML.match(regex)?.[0];
        font = font.replaceAll("\n", "").replaceAll("'", "").replaceAll(" ", "").slice(0,-1);
        divret.style.fontFamily = font;
        newDoc.content.appendChild(divret);
        return newDoc.dom;
    }
}