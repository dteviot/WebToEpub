/*
  Template to use to create a new parser
*/
"use strict";

//dead url/ parser
parserFactory.register("shinsori.com", () => new ShinsoriParser());

class ShinsoriParser extends Parser {
    constructor() {
        super();
    }

    getChapterUrls(dom, chapterUrlsUI) {
        return this.getChapterUrlsFromMultipleTocPages(dom,
            ShinsoriParser.extractPartialChapterList,
            ShinsoriParser.getUrlsOfTocPages,
            chapterUrlsUI
        );
    }

    static getUrlsOfTocPages(dom) {
        return [...dom.querySelectorAll("ul.lcp_paginator a:not(.lcp_nextlink)")]
            .map(link => link.href);
    }

    static extractPartialChapterList(dom) {
        let lists = [...dom.querySelectorAll("ul.lcp_catlist")];
        return (0 === lists.length) 
            ? [] 
            : util.hyperlinksToChapterList(lists[lists.length - 1]);
    }

    findContent(dom) {
        return dom.querySelector("div.entry-content");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h2.section-title");
    }

    extractAuthor(dom) {
        let authorLabel = util.getElement(dom, "strong", e => e.textContent === "Author:");
        return (authorLabel === null) ? super.extractAuthor(dom) : authorLabel.nextSibling.textContent;
    }

    removeUnwantedElementsFromContentElement(content) {
        util.removeElements(content.querySelectorAll("div.stream-item-below-post-content, div.post-bottom-meta"));
        super.removeUnwantedElementsFromContentElement(content);
    }

    findChapterTitle(dom) {
        let title = dom.querySelector("div.entry-header");
        if (title != null) {
            let junk = title.querySelector("h5");
            if (junk !=  null) {
                junk.remove();
            }
            return title;
        }
        return dom.querySelector("h1");
    }

    findParentNodeOfChapterLinkToRemoveAt(link) {
        return util.moveIfParent(link, "p");    
    }
    
    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "li.post-item");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.block-custom-content, div.first-half-box")];
    }

    cleanInformationNode(node) {
        util.removeChildElementsMatchingSelector(node, "a");
    }
}
