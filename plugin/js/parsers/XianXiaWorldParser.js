/*
  parses www.xianxiaworld.net
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
        let menu = dom.querySelector("div#list");
        return Promise.resolve(util.hyperlinksToChapterList(menu));
    }

    findContent(dom) {
        return dom.querySelector("div#content");
    }

    extractTitle(dom) {
        let title = dom.querySelector("div#info h1");
        return (title === null) ? super.extractTitle(dom) : title.innerText;
    }

    extractAuthor(dom) {
        let author = dom.querySelector("meta[name='author']");
        return (author === null ) ? super.extractAuthor(dom) : author.getAttribute("content");
    }

    findChapterTitle(dom) {
        return dom.querySelector("h1");
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
        return util.getFirstImgSrc(dom, "div#fmimg");
    }
}
