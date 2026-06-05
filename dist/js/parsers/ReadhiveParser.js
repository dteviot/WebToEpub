"use strict";

parserFactory.register("readhive.org", () => new ReadhiveParser());

class ReadhiveParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        const tab = this.getTab(dom, "releases"); 
        return [...tab.querySelectorAll("a")]
            .map(ReadhiveParser.linkToChapter)
            .reverse();
    }

    static linkToChapter(link) {
        return ({
            sourceUrl:  link.href,
            title: link.querySelector("span.ml-1").textContent.trim(),
        });
    }

    getTab(dom, filter) {
        return [...dom.querySelectorAll("main div[x-show]")]
            .filter(d => d.getAttribute("x-show")?.includes(filter))
            ?.pop();
    }

    findContent(dom) {
        return dom.querySelector("main div.justify-center:not([x-data])");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1");
    }

    findChapterTitle(dom) {
        return dom.querySelector("h1 strong");
    }

    customRawDomToContentStep(chapter, content) {
        for (let e of content.querySelectorAll("div")) {
            let toRemove = [];
            for (let attr of e.attributes) {
                if (attr.name.startsWith("@")) {
                    toRemove.push(attr.name);
                }
            }
            for (let attr of toRemove) {
                e.removeAttribute(attr);
            }
        }
    }

    removeUnwantedElementsFromContentElement(element) {
        util.removeChildElementsMatchingSelector(element, "div[x-data]");
        super.removeUnwantedElementsFromContentElement(element);
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "main");
    }

    getInformationEpubItemChildNodes(dom) {
        const tab = this.getTab(dom, "about"); 
        return tab == null
            ? []
            : [...tab.querySelectorAll("p")];
    }
}
