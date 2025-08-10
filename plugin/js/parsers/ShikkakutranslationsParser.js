/*
  parses shikkakutranslations.org
*/
"use strict";

parserFactory.register( "shikkakutranslations.org", function() { return new ShikkakutranslationsParser(); });

class ShikkakutranslationsImageCollector extends ImageCollector {
    constructor() {
        super();
    }

    isImageWrapperElement(element) {
        return ((element.tagName.toLowerCase() === "div") && element.className.startsWith("gallery-group")) ||
            super.isImageWrapperElement(element);
    }
}

//==============================================================

class ShikkakutranslationsParser extends Parser {
    constructor() {
        super(new ShikkakutranslationsImageCollector());
    }

    getChapterUrls(dom) {
        let menu = dom.querySelector("div.menu-header");
        return Promise.resolve(util.hyperlinksToChapterList(menu));
    }

    findContent(dom) {
        return dom.querySelector("div#content-body div.entry");
    }

    findChapterTitle(dom) {
        return dom.querySelector("h1.page-title");
    }

    removeNextAndPreviousChapterHyperlinks(webPage, element) {
        // override default, just remove all hyperlinks
        // due to links in chapters not matching links in menu.
        [...element.querySelectorAll("a")]
            .filter(l => l.querySelector("img") === null)
            .map(l => this.findParentNodeOfChapterLinkToRemoveAt(l))
            .forEach(u => u.remove());
    }

    findParentNodeOfChapterLinkToRemoveAt(link) {
        return util.moveIfParent(link, "p");
    }
}
