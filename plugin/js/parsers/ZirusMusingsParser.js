/*
  Parses the Lazy Dungeon Master story on https://zirusmusings.com/ldm-ch84/
*/
"use strict";

parserFactory.register("zirusmusings.com", function() { return new ZirusMusingsParser() });

class ZirusMusingsParser extends Parser {
    constructor() {
        super();
    }

    getChapterUrls(dom) {
        let that = this;
        let content = that.findContent(dom);

        let getChapterArc = undefined;
        if (dom.baseURI === "https://zirusmusings.com/ldm-toc/") {
            getChapterArc = that.getChapterArc;
        } 
        let chapters = util.hyperlinksToChapterList(content, that.isChapterHref, getChapterArc);
        return Promise.resolve(chapters);
    }

    isChapterHref(link) {
        let hostname = link.hostname;
        return (hostname === "pirateyoshi.wordpress.com") ||
            (hostname === "zirusmusings.com") ||
            (hostname === "imgur.com");
    }

    getChapterArc(link) {
        let arc = null;
        if (link.parentNode !== null) {
            let parent = link.parentNode;
            if (parent.tagName === "P") {
                let strong = util.getElement(parent, "strong");
                if (strong != null) {
                    arc = strong.innerText;
                };
            };
        };
        return arc;
    }

    extractTitle(dom) {
        return util.getElement(dom, "meta", e => (e.getAttribute("property") === "og:title")).getAttribute("content");
    }

    // find the node(s) holding the story content
    findContent(dom) {

        // Ziru's Musings has links to imgur galleries.
        // So when one of them, create whole new page and return link to that.
        // ToDo: Fix this ugly hack.
        if (ImgurParser.isImgurGallery(dom)) {
            return ImgurParser.convertGalleryToConventionalForm(dom);
        } else {
            let article = util.getElement(dom, "article", e => e.className !== "comment-body");
            let div = util.getElement(article, "div", e => e.className.startsWith("entry-content"));
            return div;
        }
    }

    removeUnwantedElementsFromContentElement(element) {
        super.removeUnwantedElementsFromContentElement(element);

        // remove the previous | TOC | Next hyperlinks
        let toc = this.findTocElement(element);
        if (toc !== null) {
            toc.parentNode.remove();
        };
    }

    findTocElement(div) {
        return util.getElement(div, "a", a => (0 < a.href.indexOf("toc/")));
    }

    populateUI(dom) {
        super.populateUI(dom);
        CoverImageUI.showCoverImageUrlInput(true);
    }
}
