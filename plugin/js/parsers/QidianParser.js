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
        let menu = dom.querySelector("ul.content-list") ||
            dom.querySelector("ol.inline");
        let chapters = (menu === null) ? [] : this.buildChapterList(menu);
        return Promise.resolve(chapters);
    };

    buildChapterList(menu) {
        return [...menu.querySelectorAll("a")].map(a => this.cleanupChapterLink(a));
    };

    cleanupChapterLink(link) {
        let title = link.textContent;
        let element = link.querySelector("span");
        if (element !== null) {
            title = element.textContent;
            element = link.querySelector("i");
            if (element !== null) {
                title = element.textContent + ": " + title;
            }
        }
        return {sourceUrl: link.href, title: title}
    }
    
    findContent(dom) {
        return dom.querySelector("div.cha-content");
    };

    // title of the story
    extractTitle(dom) {
        return dom.querySelector("h2").textContent;
    };

    extractAuthor(dom) {
        let element = dom.querySelector("address");
        if (element !== null) {
            element = util.getElement(element, "p", p => p.textContent.startsWith("Author"));
            if (element !== null) {
                let author = element.textContent;
                let strong = element.querySelector("strong");
                if (strong !== null) {
                    author = author.substring(strong.textContent.length);
                }
                return author;
            }
        }
        return super.extractAuthor(dom);
    }
 
    removeUnwantedElementsFromContentElement(content) {
        util.removeElements(content.querySelectorAll("form.cha-score, div.cha-bts"));
        super.removeUnwantedElementsFromContentElement(content);
    }

    // Optional, supply if individual chapter titles are not inside the content element
    findChapterTitle(dom) {
        return dom.querySelector("h3");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.det-hd");
    }
}
