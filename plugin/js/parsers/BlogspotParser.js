/*
  parses *.blogspot.*
*/
"use strict";

parserFactory.registerRule(
    function(url) { return util.extractHostName(url).indexOf(".blogspot.") != -1 }, 
    function() { return new BlogspotParser() }
);

class BlogspotParser extends Parser {
    constructor() {
        super();
    }

    getChapterUrls(dom) {
        let menu = this.findContent(dom);
        let chapters = [];
        if (menu !== null) {
            chapters = util.hyperlinksToChapterList(menu);
        }
        return Promise.resolve(chapters);
    }

    findContent(dom) {
        let content = util.getElement(dom, "div", e => e.className.startsWith("post-body"));
        if (content == null) {
            content = util.getElement(dom, "div", e => e.className.startsWith("entry-content"));
        }
        return content;
    }

    customRawDomToContentStep(chapter, content) {
        this.addTitleToContent(chapter.rawDom, content);
        this.replaceWeirdPElements(content);
    }

    addTitleToContent(dom, content) {
        let title = this.findChapterTitle(dom);
        if (title !== null) {
            content.insertBefore(title, content.firstChild);
        };
    }

    findChapterTitle(dom) {
        let title = util.getElement(dom, "h3", e => e.className.startsWith("post-title"));
        if (title == null) {
            title = util.getElement(dom, "h1", e => e.className.startsWith("entry-title"));
        }
        return title;
    }

    removeUnwantedElementsFromContentElement(element) {
        super.removeUnwantedElementsFromContentElement(element);
        this.removeNextAndPreviousChapterHyperlinks(element);
    }

    /**
    *  http://skythewood.blogspot.com/ has <o:p> nodes
    *  I think they're supposed to be <p> nodes, but there's
    *  no 'o' namespace
    */
    replaceWeirdPElements(content) {
        for(let weird of util.getElements(content, "O:P")) {
            let newNode = content.ownerDocument.createElement("p");
            let previous = weird.previousSibling;
            if ((previous != null) && (previous.nodeType === Node.TEXT_NODE)) {
                newNode.appendChild(previous);
            }
            weird.parentElement.replaceChild(newNode, weird);
        }
    }

    findParentNodeOfChapterLinkToRemoveAt(link) {
        let toRemove = util.moveIfParent(link, "span");
        return util.moveIfParent(toRemove, "div");
    }

    populateUI(dom) {
        super.populateUI(dom);
        CoverImageUI.showCoverImageUrlInput(true);
    }
}
