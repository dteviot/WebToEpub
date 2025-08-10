"use strict";

//dead url/ parser
parserFactory.register("anythingnovel.com", function() { return new AnythingNovelParser(); });

class AnythingNovelParser extends Parser {
    constructor() {
        super();
    }

    getChapterUrls(dom) {
        let links = [...dom.querySelectorAll("div#content li a")]
            .reverse()
            .map(link => util.hyperLinkToChapter(link));
        return Promise.resolve(links);        
    }

    findContent(dom) {
        return dom.querySelector("div#content");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("div#content h1");
    }

    removeUnwantedElementsFromContentElement(element) {
        super.removeUnwantedElementsFromContentElement(element);
        util.removeElements(element.querySelectorAll("div.ads, div#pagination, div.sharebar"));
        this.removeShareThisChapterLink(element);
    }

    removeShareThisChapterLink(element) {
        let share = element.querySelector("a h2");
        if (share != null) {
            share.parentElement.remove();
        }
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div#content div:not(.clearfix)")];
    }

    cleanInformationNode(node) {
        let strip = [...node.querySelectorAll("img")]
            .map(e => e.parentElement);
        util.removeElements(strip);
    }
}
