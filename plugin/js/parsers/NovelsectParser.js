"use strict";

parserFactory.register("novelsect.com", () => new NovelsectParser());

class NovelsectParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom, chapterUrlsUI) {
        let menu = dom.querySelector("ul.scrollbar-medium");
        let chapters = util.hyperlinksToChapterList(menu);
        chapterUrlsUI.showTocProgress(chapters);

        let novelSlug = this.getNovelSlug(dom.baseURI);
        let urlsOfTocPages  = await this.getUrlsOfTocPages(novelSlug);
        for (let url of urlsOfTocPages) {
            await this.rateLimitDelay();
            let json = (await HttpClient.fetchJson(url)).json;
            let partialList = this.extractPartialChapterList(novelSlug, json.chapters);
            chapterUrlsUI.showTocProgress(partialList);
            chapters = chapters.concat(partialList);
        }
        return chapters;
    }

    async getUrlsOfTocPages(novelSlug) {
        let info = await this.getNovelIdAndChapterCount(novelSlug);
        let tocUrls = [];
        let maxPage = Math.ceil(info.chapter_count / 100);
        for (let i = 2; i <= maxPage; ++i) {
            tocUrls.push(`https://novelsect.com/api/fetchchapterlistbyindex?novelId=${info.id}&page=${i}`);
        }
        return tocUrls;
    }

    getNovelSlug(url) {
        let path = url.split("/");
        return path[path.length - 1];
    }

    async getNovelIdAndChapterCount(novelSlug) {
        let body = JSON.stringify({slug: novelSlug});
        let options = this.makeOptions(body);
        let novelRestUrl = "https://novelsect.com/api/fetchsinglenovel";
        return (await HttpClient.fetchJson(novelRestUrl, options)).json;
    }

    extractPartialChapterList(novelSlug, json) {
        return json.map(c => ({
            sourceUrl: `https://novelsect.com/novel/${novelSlug}/${c.slug}`,
            title: c.title 
        }));
    }

    findContent(dom) {
        return Parser.findConstrutedContent(dom);
    }

    extractTitleImpl(dom) {
        return dom.querySelector("div.text-2xl");
    }

    findCoverImageUrl(dom) {
        return dom.querySelector("img")?.src ?? null;
    }

    async fetchChapter(url) {
        let chapterRestUrl = "https://novelsect.com/api/singlechapter";
        let options = this.makeOptions(this.makeJsonBody(url));
        let json = (await HttpClient.fetchJson(chapterRestUrl, options)).json;
        return this.jsonToHtml(json.chapter, url);
    }

    makeOptions(body) {
        return ({
            method: "POST",
            credentials: "include",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json"
            },
            body: body
        });
    }

    makeJsonBody(url) {
        let path = url.split("/");
        return JSON.stringify({
            chapterSlug: path[path.length - 1], 
            novelSlug: path[path.length - 2]
        });
    }

    jsonToHtml(json) {
        let newDoc = Parser.makeEmptyDocForContent();
        this.appendElement(newDoc, "h1", json.title);
        let paragraphs = json.content
            .replace(/<p>/g, "").replace(/<\/p>/g, "")
            .split("\n\n")
            .filter(p => !util.isNullOrEmpty(p));
        for (let text of paragraphs) {
            this.appendElement(newDoc, "p", text);
        }
        return newDoc.dom;
    }

    appendElement(newDoc, tag, text) {
        let element = newDoc.dom.createElement(tag);
        element.textContent = text;
        newDoc.content.appendChild(element);
    }

    getInformationEpubItemChildNodes(dom) {
        let synopsis = dom.querySelector(".overflow-y-scroll");
        return synopsis === null
            ? []
            : [synopsis];
    }
}
