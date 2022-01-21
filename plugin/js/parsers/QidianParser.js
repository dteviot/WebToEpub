/*
   parses Qidian International site
*/
"use strict";

parserFactory.register("webnovel.com", function() { return new QidianParser() });

class QidianParser extends Parser{
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let links = Array.from(dom.querySelectorAll("ul.content-list a"));
        if (links.length === 0) {
            links = Array.from(dom.querySelectorAll("div.volume-item ol a"));
        }
        return links.map(QidianParser.linkToChapter);
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

    populateUI(dom) {
        super.populateUI(dom);
        document.getElementById("removeAuthorNotesRow").hidden = false; 
    }

    // title of the story
    extractTitleImpl(dom) {
        let title = dom.querySelector("div.page h2");
        if (title !== null) {
            util.removeChildElementsMatchingCss(title, "small");
        }
        return title;
    };

    extractAuthor(dom) {
        return dom.querySelector("a.c_primary")?.textContent ?? super.extractAuthor(dom);
    }
 
    removeUnwantedElementsFromContentElement(content) {
        util.removeChildElementsMatchingCss(content, "form.cha-score, div.cha-bts, pirate");
        if (this.userPreferences.removeAuthorNotes.value) {
            util.removeChildElementsMatchingCss(content, "div.m-thou");
        }
        super.removeUnwantedElementsFromContentElement(content);
    }

    // Optional, supply if individual chapter titles are not inside the content element
    findChapterTitle(dom) {
        return dom.querySelector("h3");
    }

    findCoverImageUrl(dom) {
        let imgs = [...dom.querySelectorAll("div.det-hd i.g_thumb img")];
        return 0 === imgs.length 
            ? util.getFirstImgSrc(dom, "div.det-hd")
            : imgs.pop().src;
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
