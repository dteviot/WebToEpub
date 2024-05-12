"use strict";

parserFactory.register("kemono.su", () => new KemonopartyParser());

class KemonopartyParser extends Parser{
    constructor() {
        super();
    }

    async getChapterUrls(dom, chapterUrlsUI) {
        return (await this.getChapterUrlsFromMultipleTocPages(dom,
            this.extractPartialChapterList,
            this.getUrlsOfTocPages,
            chapterUrlsUI
        )).reverse();
    };

    getUrlsOfTocPages(dom) {
        let urls = [];
        let paginator = dom.querySelector("div.paginator menu");
        if (paginator === null) {
            return urls;
        }
        let pages = [...paginator.querySelectorAll("a:not(.next)")];
        let url = new URL(pages[pages.length - 1]);
        let lastPageOffset = url.searchParams.get("o");
        for(let i = 50; i <= lastPageOffset; i += 50) {
            url.searchParams.set("o", i);
            urls.push(url.href);
        }
        return urls;
    }
    
    extractPartialChapterList(dom) {
        let links = [...dom.querySelectorAll(".card-list__items a")];
        return links.map(l => ({
            sourceUrl: l.href,
            title: l.querySelector("header").textContent.trim()
        }));
    }

    preprocessRawDom(webPageDom) {
        util.removeChildElementsMatchingCss(webPageDom, ".ad-container");
        this.copyImagesIntoContent(webPageDom);
    }

    findContent(dom) {
        //the text of the chapter is always in .post__content, but if there is no chapter(e.g. only files), return .post__body instead of throwing an error
        return dom.querySelector(".post__content") ?? dom.querySelector(".post__body");
    }

    copyImagesIntoContent(dom) {
        let content = this.findContent(dom);
        let images = [...dom.querySelectorAll("div.post__files div.post__thumbnail figure a img")];
        for(let img of images) {
            content.append(img);
        }
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1");
    }

    findChapterTitle(dom) {
        return dom.querySelector("h1.post__title > span");
    }
}
