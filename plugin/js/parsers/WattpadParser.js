/*
  Parser for www.wattpad.com
*/
"use strict";

parserFactory.register("wattpad.com", function() { return new WattpadParser() });

class WattpadParser extends Parser{
    constructor() {
        super();
    }

    getChapterUrls(dom) {
        let menu = dom.querySelector("ul.table-of-contents");
        return Promise.resolve(util.hyperlinksToChapterList(menu));        
    };

    findContent(dom) {
        return dom.querySelector("div[data-page-number]");
    };

    // title of the story  (not to be confused with title of each chapter)
    extractTitle(dom) {
        return dom.querySelector("div#story-landing h1").textContent.trim();
    };

    extractAuthor(dom) {
        let authorLabel = dom.querySelector("div.author-info a.on-navigate");
        if (authorLabel === null) {
            return super.extractAuthor(dom)
        }
        let path = authorLabel.getAttribute("href").split("/");
        return path[path.length - 1];
    };

    // custom cleanup of content
    removeUnwantedElementsFromContentElement(element) {
        for(let pre of [...element.querySelectorAll("pre")]) {
            util.moveElementsOutsideTag(pre);
            pre.remove();
        }
        super.removeUnwantedElementsFromContentElement(element);
    }

    // individual chapter titles are not inside the content element
    findChapterTitle(dom) {
        return dom.querySelector("h2");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.cover");
    }
}
