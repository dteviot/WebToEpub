"use strict";

parserFactory.register("anythingnovel.com", function() { return new AnythingNovelParser() });

class AnythingNovelParser extends Parser{
    constructor() {
        super();
    }

    getChapterUrls(dom) {
        let links = [...dom.querySelectorAll("div#content li a")]
            .reverse()
            .map(link => util.hyperLinkToChapter(link, null));
        return Promise.resolve(links);        
    };

    findContent(dom) {
        return dom.querySelector("div#content");
    };

    extractTitle(dom) {
        return dom.querySelector("div#content h1").textContent.trim();
    };

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
        let node = dom.querySelector("div#content div:not(.clearfix)");
        if (node != null) {
            node = node.cloneNode(true);
            let strip = [...node.querySelectorAll("img")]
                .map(e => e.parentElement);
            util.removeElements(strip);
        }
        return [node];
    }
}
