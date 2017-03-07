/*
   parses Qidian International site
*/
"use strict";

parserFactory.register("webnovel.com", function() { return new QidianParser() });

class QidianParser extends Parser{
    constructor() {
        super();
    }

    getChapterUrls(dom) {
        let menu = util.getElement(dom, "ol", e => e.className === "inline")
        let chapters = (menu === null) ? [] : this.buildChapterList(menu);
        return Promise.resolve(chapters);
    };

    buildChapterList(menu) {
        let that = this;
        return util.getElements(menu, "a").map(a => that.cleanupChapterLink(a));
    };

    cleanupChapterLink(link) {
        let title = link.textContent;
        let element = util.getElement(link, "span");
        if (element !== null) {
            title = element.textContent;
            element = util.getElement(link, "i");
            if (element !== null) {
                title = element.textContent + ": " + title;
            }
        }
        return {sourceUrl: link.href, title: title}
    }
    
    findContent(dom) {
        return util.getElement(dom.body, "div", e => e.className.startsWith("cha-content"));
    };

    // title of the story
    extractTitle(dom) {
        return util.getElement(dom.body, "h2").textContent;
    };

    extractAuthor(dom) {
        let element = util.getElement(dom, "address");
        if (element !== null) {
            element = util.getElement(element, "p", p => p.textContent.startsWith("Author"));
            if (element !== null) {
                let author = element.textContent;
                let strong = util.getElement(element, "strong");
                if (strong !== null) {
                    author = author.substring(strong.textContent.length);
                }
                return author;
            }
        }
        return super.extractAuthor(dom);
    }
 
    // Optional, supply if individual chapter titles are not inside the content element
    findChapterTitle(dom) {
        return util.getElement(dom.body, "h3");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div", d => d.className.startsWith("det-hd"));
    }

    populateUI(dom) {
        super.populateUI(dom);
        CoverImageUI.showCoverImageUrlInput(true);    
    }
}
