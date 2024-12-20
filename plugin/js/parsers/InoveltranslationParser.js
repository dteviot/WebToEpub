"use strict";

parserFactory.register("inoveltranslation.com", () => new InoveltranslationParser());

class InoveltranslationParser extends Parser{
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        return Array.from(dom.querySelectorAll("main > section > div > section > section div:has(>a):not(:has(> div))"))
             .map(x => { return {title: x.innerText, sourceUrl: x.querySelector("a")?.href} }).reverse();
    }

    findContent(dom) {
        const main = dom.querySelector('main');

        if (main) {
            [...main.children].forEach(child => {
                if (child.tagName !== 'P') {
                main.removeChild(child);
                }
            });
        }

        return main
    }

    findChapterTitle(dom) {
        return dom.querySelector("h1");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "article");
    }
}
