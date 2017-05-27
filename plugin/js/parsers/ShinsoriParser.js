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
        let menu = util.getElement(dom, "div", e => e.className === "su-tabs-panes");
        let chapters = [];
        if (menu !== null) {
            chapters = util.hyperlinksToChapterList(menu);
        }
        return Promise.resolve(chapters);
    };

    findContent(dom) {
        return util.getElement(dom, "div", e => e.className === "td-ss-main-content");
    };

    extractTitle(dom) {
        return util.getElement(dom, "h1").textContent.trim();
    };

    extractAuthor(dom) {
        let authorLabel = util.getElement(dom, "strong", e => e.textContent === "Author:");
        return (authorLabel === null) ? super.extractAuthor(dom) : authorLabel.nextElementSibling.textContent;
    };

    findParentNodeOfChapterLinkToRemoveAt(link) {
        return util.moveIfParent(link, "p");    
    }
    
    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div", e => e.className === "td-ss-main-sidebar");
    }

    // Optional, supply if user should be able to specify a cover image
    populateUI(dom) {
        super.populateUI(dom);
        CoverImageUI.showCoverImageUrlInput(true);
    }
}
