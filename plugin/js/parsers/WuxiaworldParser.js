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
                let strong = parent.querySelector("strong");
                if (strong != null) {
                    arc = strong.innerText;
                };
            };
        };
        return arc;
    }

    extractTitle(dom) {
        let title = dom.querySelector("meta[property='og:title']");
        return title === null ? super.extractTitle(dom) : title.getAttribute("content");
    }

    // find the node(s) holding the story content
    findContent(dom) {
        return dom.querySelector("div[itemprop='articleBody']");
    }

    removeUnwantedElementsFromContentElement(element) {
        let that = this;
        super.removeUnwantedElementsFromContentElement(element);
        that.removeEmoji(element);
        WuxiaworldParser.cleanCollapseomatic(element);
    }

    findParentNodeOfChapterLinkToRemoveAt(link) {
        // "previous" chapter may be immediate child of <p> tag to remove
        // "next" chapter has a <span> tag wrapping it, then the maybe a <p> tag
        let toRemove = util.moveIfParent(link, "span");
        return util.moveIfParent(toRemove, "p");
    }

    findChapterTitle(dom) {
        return WordpressBaseParser.findChapterTitleElement(dom);
    }

    removeEmoji(contentElement) {
        for(let img of contentElement.querySelectorAll("img.emoji")) {
            let text = img.getAttribute("alt") || "back to reference";
            let textNode = contentElement.ownerDocument.createTextNode(text);
            img.replaceWith(textNode);
        }
    }

    static cleanCollapseomatic(content) {
        for(let e of content.querySelectorAll("[class^='collapseomatic']")) {
            if (e.className.startsWith("collapseomatic_content")) {
                e.removeAttribute("style");
            } else {
                e.remove();
            }
        }
    }
}
