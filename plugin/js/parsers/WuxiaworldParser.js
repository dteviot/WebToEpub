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
        return (link.hostname === "www.wuxiaworld.com");
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

    extractAuthor(dom) {
        return "<unknown>";
    }

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
        that.removeOnClick(element);
        that.removeEmoji(element);
    }

    normalizeUrl(url) {
        // remove trailing '/'
        return (url[url.length - 1] === '/') ? url.substring(0, url.length - 1) : url;
    }

    removeNextAndPreviousChapterHyperlinks(element) {
        let that = this;
        let chapterLinks = new Set();
        for(let c of that.chapters) { 
            chapterLinks.add(that.normalizeUrl(c.sourceUrl));
        };

        for(let unwanted of util.getElements(element, "a", link => chapterLinks.has(that.normalizeUrl(link.href)))
           .map(link => that.findParentNodeOfChapterLinkToRemoveAt(link))) {
           util.removeNode(unwanted);
        };
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

    removeOnClick(contentElement) {
        let walker = contentElement.ownerDocument.createTreeWalker(contentElement, NodeFilter.SHOW_ELEMENT);
        let element = contentElement;
        while (element != null) {
            element.removeAttribute("onclick");
            element = walker.nextNode();
        };
    }

    removeEmoji(contentElement) {
        for(let img of util.getElements(contentElement, "img", i => i.className === "emoji")) {
            let text = img.getAttribute("alt") || "back to reference";
            let textNode = contentElement.ownerDocument.createTextNode(text);
            img.parentNode.replaceChild(textNode, img);
        }
    }
}
