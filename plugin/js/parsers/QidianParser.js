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
        let chapters = Array.from(dom.querySelectorAll("ul.content-list a"));
        if (chapters.length === 0) {
            chapters = Array.from(dom.querySelectorAll("div.volume-item ol a"));
        }
        return Promise.resolve(chapters.map(QidianParser.cleanupChapterLink));
    };

    static cleanupChapterLink(link) {
        let title = link.textContent;
        let element = link.querySelector("strong");
        if (element !== null) {
            title = element.textContent.trim();
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
    extractTitleImpl(dom) {
        return dom.querySelector("h2");
    };

    extractAuthor(dom) {
        let element = dom.querySelector("address p strong");
        if (element !== null) {
            console.log(element.nextSibling.textContent);
            return element.nextSibling.textContent;
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

    removeUnusedElementsToReduceMemoryConsumption(webPageDom) {
        super.removeUnusedElementsToReduceMemoryConsumption(webPageDom);
        for(let e of [...webPageDom.querySelectorAll("div.j_bottom_comment_area, div.user-links-wrap, div.g_ad_ph")]) {
            e.remove()
        }
    }

    getInformationEpubItemChildNodes(dom) {
        let nodes = [];
        let summary = dom.querySelector("div._mn");
        if (summary != null) {
            summary = summary.cloneNode(true);
            util.removeElements(summary.querySelectorAll("div._ft, span.g_star"));
            nodes.push(summary);
        }
        return nodes.concat([...dom.querySelectorAll("div.det-abt")]);
    }
}
