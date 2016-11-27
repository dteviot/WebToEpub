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
        let div = util.getElement(dom, "div", e => (e.className === "the_attachment"));
        if (div !== null) {
            let img = util.getElement(div, "img");
            if (img !== null) {
                let src = util.resolveRelativeUrl(dom.baseURI, img.src);
                return ImageCollector.removeSizeParamsFromWordPressQuery(src);
            }
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
        let menu = util.getElement(dom, "div", e => e.className === "menu-header");
        let chapters = [];
        if (menu !== null) {
            chapters = util.hyperlinksToChapterList(menu);
        }
        return Promise.resolve(chapters);
    }

    findContent(dom) {
        let content = util.getElement(dom, "div", e => (e.id === "content-body"));
        if (content !== null) {
            content = util.getElement(content, "div", e => e.className === "entry");
        }
        return content;
    }

    findChapterTitle(dom) {
        return util.getElement(dom, "h1", e => e.className.startsWith("page-title"));
    }

    removeNextAndPreviousChapterHyperlinks(element) {
        // override default, just remove all hyperlinks
        // due to links in chapters not matching links in menu.
        let that = this;
        util.getElements(element, "a")
            .filter(l => util.getElements(l, "img").length === 0)
            .map(l => that.findParentNodeOfChapterLinkToRemoveAt(l))
            .forEach(u => util.removeNode(u));
    }

    findParentNodeOfChapterLinkToRemoveAt(link) {
        return util.moveIfParent(link, "p");
    }

    populateUI(dom) {
        super.populateUI(dom);
        CoverImageUI.showCoverImageUrlInput(true);
    }
}
