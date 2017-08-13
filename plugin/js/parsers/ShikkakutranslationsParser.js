/*
  parses shikkakutranslations.org
*/
"use strict";

parserFactory.register( "shikkakutranslations.org", function() { return new ShikkakutranslationsParser() });

class ShikkakutranslationsImageCollector extends ImageCollector {
    constructor() {
        super();
    }

    selectImageUrlFromImagePage(dom) {
        let img = dom.querySelector("div.the_attachment img");
        if (img !== null) {
            let src = util.resolveRelativeUrl(dom.baseURI, img.src);
            return ImageCollector.removeSizeParamsFromWordPressQuery(src);
        }
        return null;
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

    removeNextAndPreviousChapterHyperlinks(element) {
        // override default, just remove all hyperlinks
        // due to links in chapters not matching links in menu.
        [...element.querySelectAll("a")]
            .filter(l => l.querySelector("img").length === null)
            .map(l => this.findParentNodeOfChapterLinkToRemoveAt(l))
            .forEach(u => u.remove());
    }

    findParentNodeOfChapterLinkToRemoveAt(link) {
        return util.moveIfParent(link, "p");
    }

    populateUI(dom) {
        super.populateUI(dom);
        CoverImageUI.showCoverImageUrlInput(true);
    }
}
