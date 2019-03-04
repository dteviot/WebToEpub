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
        let links = Array.from(dom.querySelectorAll("ul.content-list a"));
        if (links.length === 0) {
            links = Array.from(dom.querySelectorAll("div.volume-item ol a"));
        }
        return Promise.resolve(links.map(QidianParser.linkToChapter));
    };

    static isLinkLocked(link) {
        let img = link.querySelector("svg > use");
        return (img != null)
            && (img.getAttribute("xlink:href") === "#i-lock");
    }

    static linkToChapter(link) {
        let title = link.textContent;
        let element = link.querySelector("strong");
        if (element !== null) {
            title = element.textContent.trim();
            element = link.querySelector("i");
            if (element !== null) {
                title = element.textContent + ": " + title;
            }
        }
        return {sourceUrl: link.href, title: title, 
            isIncludeable: !QidianParser.isLinkLocked(link)
        };
    }
    
    findContent(dom) {
        return dom.querySelector("div.cha-content");
    };

    // title of the story
    extractTitleImpl(dom) {
        return dom.querySelector("h2").childNodes[0];
    };

    extractAuthor(dom) {
        let element = dom.querySelector("address p span");
        return (element === null) ? super.extractAuthor(dom) : element.textContent;
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

    removeUnusedElementsToReduceMemoryConsumption(webPageDom) {
        super.removeUnusedElementsToReduceMemoryConsumption(webPageDom);
        for(let e of [...webPageDom.querySelectorAll("div.j_bottom_comment_area, div.user-links-wrap, div.g_ad_ph")]) {
            e.remove()
        }
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div._mn, div.det-abt")];
    }

    cleanInformationNode(node) {
        util.removeChildElementsMatchingCss(node, "div._ft, span.g_star");
    }
}
