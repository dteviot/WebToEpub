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
        let chapters = util.hyperlinksToChapterList(content, that.isChapterHref);
        return Promise.resolve(chapters);
    }

    isChapterHref(link) {
        return (link.hostname === "www.wuxiaworld.com");
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

    removeNextAndPreviousChapterHyperlinks(element) {
        let that = this;
        for(let unwanted of util.getElements(element, "a", link => link.hash === "")
           .map(link => that.findParentNodeOfChapterLinkToRemoveAt(link))) {
           util.removeNode(unwanted);
        };
    }

    findParentNodeOfChapterLinkToRemoveAt(link) {
        // "previous" chapter is immediate child of <p> tag to remove
        // "next" chapter has a <span> tag wrapping it, then the <p> tag
        let parent = link.parentNode;
        return (parent.tagName === "P") ? parent : parent.parentNode;
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
