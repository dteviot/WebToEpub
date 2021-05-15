"use strict";

parserFactory.register(
    "cclawtranslations.home.blog",
    () => new CClawTranslationsParser()
);
parserFactory.registerUrlRule(
    (url) => CClawTranslationsParser.urlMeetsSelectionCriteria(url),
    () => new CClawTranslationsParser()
);

class CClawTranslationsParser extends Parser {
    constructor() {
        super();
    }

    // copied and modified from WordpressBaseParser
    // get all links from table of contents page
    getChapterUrls(dom) {
        let that = this;
        let content = that.findContent(dom).cloneNode(true);
        that.removeUnwantedElementsFromContentElement(content);
        return Promise.resolve(
            util.hyperlinksToChapterList(content, that.isChapterHref)
        );
    }

    // copied and modified from ZirusMusingsParser
    // only link that satisfied condition
    isChapterHref(link) {
        let hostname = link.hostname;
        let href = link.href;
        return (
            hostname === "cclawtranslations.home.blog" ||
            !href.contains("facebook") ||
            !href.contains("twitter") ||
            !href.contains("discord")
        );
    }

    // returns the element holding the story content in a chapter
    findContent(dom) {
        return (
            dom.querySelector("div.entry-content") ||
            dom.querySelector("div.post-content")
        );
    }

    // title of the story  (not to be confused with title of each chapter)
    extractTitleImpl(dom) {
        const re = /( \(LN\))|( ToC)/g;
        // regex for removing ToC and (LN) from series title
        return dom.querySelector("h1.entry-title").innerText.replace(re, "");
    }

    // chapter title
    findChapterTitle(dom) {
        const re = /(\w.*)(?<=Volume \d )/g;
        // regex for removing series name from chapter title
        return dom.querySelector("h1.entry-title").innerText.replace(re, "");
    }

    removeUnwantedElementsFromContentElement(element) {
        super.removeUnwantedElementsFromContentElement(element);
        util.removeElements(
            Array.from(element.querySelectorAll("p")).filter(
                (el) =>
                    el.textContent.includes("discord") ||
                    el.textContent.includes("patreon") ||
                    el.textContent.includes("Discord") ||
                    el.textContent.includes("Patreon")
            ) // remove discord and patreon links in every chapter beginning
        );
    }
}
