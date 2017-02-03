/*
  parses xianxiaworld.net
*/
"use strict";

parserFactory.register("xianxiaworld.net", function() { 
    return new XianXiaWorldParser() 
});

class XianXiaWorldParser extends Parser {
    constructor() {
        super();
    }

    getChapterUrls(dom) {
        let menu = util.getElement(dom, "div", e => e.id === "list");;
        let chapters = [];
        if (menu !== null) {
            chapters = util.hyperlinksToChapterList(menu);
        };
        return Promise.resolve(chapters);
    }

    findContent(dom) {
        return util.getElement(dom, "div", e => e.id === "content");
    }

    extractTitle(dom) {
        let title = util.getElement(dom, "div", e => (e.id === "info"));
        if (title !== null) {
            title = util.getElement(title, "h1");
        } 
        return (title === null) ? super.extractTitle(dom) : title.innerText;
    }

    extractAuthor(dom) {
        let author = util.getElement(dom, "meta", e => (e.getAttribute("name") === "author"));
        return (author === null ) ? super.extractAuthor(dom) : author.getAttribute("content");
    }

    findChapterTitle(dom) {
        return util.getElement(dom, "h1");
    }

    removeUnwantedElementsFromContentElement(element) {
        super.removeUnwantedElementsFromContentElement(element);
        this.removeFeedbackMessage(element);
    }

    removeFeedbackMessage(element) {
        let walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
        
        let message = [];
        while (walker.nextNode()) {
            let node = walker.currentNode; 
            if (0 <= node.nodeValue.indexOf("xianxiaworldnet@gmail.com")) {
                message.push(node);
            }
        };
        util.removeElements(message);
    }

    populateUI(dom) {
        super.populateUI(dom);
        CoverImageUI.showCoverImageUrlInput(true);
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div", d => d.id === "fmimg");
    }
}
