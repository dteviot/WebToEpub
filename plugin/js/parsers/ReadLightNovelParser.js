/*
  Parses www.readlightnovel.com
*/
"use strict";

parserFactory.register("readlightnovel.com", function() { return new ReadLightNovelParser() });
parserFactory.register("readlightnovel.org", function() { return new ReadLightNovelParser() });

class ReadLightNovelParser extends Parser {
    constructor() {
        super();
    }

    getChapterUrls(dom) {
        let that = this;
        let chaptersDiv = dom.querySelector("div.chapters");
        let chapters = util.hyperlinksToChapterList(chaptersDiv, that.isChapterHref, that.getChapterArc);
        if (0 < chapters.length) {
            return Promise.resolve(chapters);
        }
        else {
            return Promise.reject(new Error(chrome.i18n.getMessage("noChaptersFound")));
        }
    }

    isChapterHref(link) {
        return link.hash === "";
    }

    getChapterArc(link) {
        let parent = link.parentNode;
        let panelDiv = null;
        let arc = null;
        // find outermost <div> of panel
        while ((panelDiv === null) && (parent !== null)) {
            if ((parent.tagName.toLowerCase() === "div") && (parent.className === "panel panel-default")) {
                panelDiv = parent;
            } else {
                parent = parent.parentNode;
            };
        };
        
        // get the title
        if (panelDiv !== null) {
            let titleDiv = panelDiv.querySelector("div.panel-heading");
            if (titleDiv !== null) {
                arc = titleDiv.innerText.trim();
            }
        }
        return arc;
    }

    extractTitle(dom) {
        let div = dom.querySelector("div.block-title");
        return (div === null) ? "<unknown>" : div.innerText;
    }

    extractAuthor(dom) {
        let that = this;
        let div = util.getElement(dom, "div", d => (d.className === "novel-detail-item") && 
            (that.novelDetailHeaderName(d) === "Author(s)"));
        if (div !== null) {
            let li = div.querySelector("li");
            if (li != null) {
                return li.innerText;
            };
        };
        return "<unknown>";
    }
 
    novelDetailHeaderName(div) {
        let header = div.querySelector("div.novel-detail-item-header");
        if (header !== null) {
            return header.innerText.trim();
        }
        return "";    
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.novel-cover");
    }

    // find the node(s) holding the story content
    findContent(dom) {
        return dom.querySelector("div[class^='chapter-content']");
    }

    findChapterTitle(dom) {
        return dom.querySelector("h1");
    }

    removeUnwantedElementsFromContentElement(element) {
        super.removeUnwantedElementsFromContentElement(element);
        util.removeElements(element.querySelectorAll("div.row, " +
            "img[src*='/magnify-clip.png']"));
        this.removeShareThisLinks(element);
    }

    removeShareThisLinks(element) {
        let shareLinks = element.querySelectorAll("span.st_facebook, " +
            "span.st_twitter, span.st_googleplus");
        for(let share of shareLinks) {
            let parent = share.parentNode;
            if (parent.tagName.toLowerCase() === "p") {
                parent.remove();
            }
            share.remove();
        }
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.novel-details")];
    }
}
