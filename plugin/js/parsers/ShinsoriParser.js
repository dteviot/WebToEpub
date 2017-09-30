/*
  Template to use to create a new parser
*/
"use strict";

parserFactory.register("shinsori.com", function() { return new ShinsoriParser() });

class ShinsoriParser extends Parser{
    constructor() {
        super();
    }

    getChapterUrls(dom) {
        let menu = dom.querySelector("div.su-tabs-panes");
        return Promise.resolve(util.hyperlinksToChapterList(menu));
    };

    findContent(dom) {
        return dom.querySelector("div.td-ss-main-content, div.td-page-content");
    };

    extractTitle(dom) {
        return dom.querySelector("h1").textContent.trim();
    };

    extractAuthor(dom) {
        let authorLabel = util.getElement(dom, "strong", e => e.textContent === "Author:");
        return (authorLabel === null) ? super.extractAuthor(dom) : authorLabel.nextSibling.textContent;
    };

    removeUnwantedElementsFromContentElement(content) {
        util.removeElements(content.querySelectorAll("div.shins-after-content-1"));
        super.removeUnwantedElementsFromContentElement(content);
    }

    findChapterTitle(dom) {
        return dom.querySelector("h1");
    }

    findParentNodeOfChapterLinkToRemoveAt(link) {
        return util.moveIfParent(link, "p");    
    }
    
    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.td-ss-main-sidebar");
    }
}
