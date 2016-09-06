/*
  Parses www.wuxiaworld.com
*/
"use strict";

parserFactory.register("wuxiaworld.com", function() { return new WuxiaworldParser() });

class WuxiaworldParser extends Parser {
    constructor() {
        super();
    }

    getChapterUrls(dom) {
        let that = this;
        let content = that.findContent(dom);
        let chapters = util.hyperlinksToChapterList(content, that.isChapterHref, that.getChapterArc);
        return Promise.resolve(chapters);
    }

    isChapterHref(link) {
        return (link.hostname === "www.wuxiaworld.com") &&
            (link.hash === "");
    }

    getChapterArc(link) {
        let arc = null;
        if ((link.parentNode !== null) && (link.parentNode.parentNode !== null)) {
            let parent = link.parentNode.parentNode;
            if (parent.tagName === "DIV" && parent.className.startsWith("collapseomatic")) {
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

    extractLanguage(dom) {
        return util.getElement(dom, "meta", e => (e.getAttribute("property") === "og:locale")).getAttribute("content");
    };

    // find the node(s) holding the story content
    findContent(dom) {
        let that = this;
        let div = util.getElement(dom, "div", e => e.getAttribute("itemprop") === "articleBody");
        return div;
    }

    removeUnwantedElementsFromContentElement(element) {
        let that = this;
        super.removeUnwantedElementsFromContentElement(element);

        that.removeNextAndPreviousChapterHyperlinks(element);
        util.removeLeadingWhiteSpace(element);
        that.removeEmoji(element);
    }

    findParentNodeOfChapterLinkToRemoveAt(link) {
        // "previous" chapter may be immediate child of <p> tag to remove
        // "next" chapter has a <span> tag wrapping it, then the maybe a <p> tag
        let toRemove = link;
        if (toRemove.parentNode.tagName.toLowerCase() === "span") {
            toRemove = link.parentNode;
        };
        if (toRemove.parentNode.tagName.toLowerCase() === "p") {
            toRemove = toRemove.parentNode;
        };
        return toRemove;
    }

    removeEmoji(contentElement) {
        for(let img of util.getElements(contentElement, "img", i => i.className === "emoji")) {
            let text = img.getAttribute("alt") || "back to reference";
            let textNode = contentElement.ownerDocument.createTextNode(text);
            img.parentNode.replaceChild(textNode, img);
        }
    }

    populateUI(dom) {
        super.populateUI(dom);
        CoverImageUI.showCoverImageUrlInput(true);
    }
}
