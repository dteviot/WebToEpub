/*
  Parses www.readlightnovel.com
*/
"use strict";

parserFactory.register("readlightnovel.com", function() { return new ReadLightNovelParser() });

class ReadLightNovelParser extends Parser {
    constructor() {
        super();
    }

    getChapterUrls(dom) {
        let that = this;
        let chaptersDiv = util.getElement(dom, "div", d => d.className.indexOf("chapters") !== -1);
        let chapters = [];
        if (chaptersDiv !== null) {
            chapters = util.hyperlinksToChapterList(chaptersDiv, that.isChapterHref, that.getChapterArc);
        } 
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
            let titleDiv = util.getElement(panelDiv, "div", d => d.className === "panel-heading");
            if (titleDiv !== null) {
                arc = titleDiv.innerText.trim();
            }
        }
        return arc;
    }

    extractTitle(dom) {
        let div = util.getElement(dom, "div", d => d.className === "block-title");
        return (div === null) ? "<unknown>" : div.innerText;
    }

    extractAuthor(dom) {
        let that = this;
        let div = util.getElement(dom, "div", d => (d.className === "novel-detail-item") && 
            (that.novelDetailHeaderName(d) === "Author(s)"));
        if (div !== null) {
            let li = util.getElement(div, "li");
            if (li != null) {
                return li.innerText;
            };
        };
        return "<unknown>";
    }
 
    novelDetailHeaderName(div) {
        let header = util.getElement(div, "div", h => h.className === "novel-detail-item-header");
        if (header !== null) {
            return header.innerText.trim();
        }
        return "";    
    }

    findCoverImageUrl(dom) {
        if (dom != null) {
            let coverDiv = util.getElement(dom, "div", d => d.className === "novel-cover");
            if (coverDiv != null) {
                let img = util.getElement(coverDiv, "img");
                if (img != null) {
                    return img.src;
                };
            };
        };
        return null;
    }

    // find the node(s) holding the story content
    findContent(dom) {
        return util.getElement(dom, "div", e => e.className === "chapter-content");
    }

    removeUnwantedElementsFromContentElement(element) {
        let that = this;
        super.removeUnwantedElementsFromContentElement(element);
        util.removeElements(util.getElements(element, "div", e => e.className === "row"));
        util.removeElements(util.getElements(element, "img", e => e.src.indexOf("/magnify-clip.png") !== -1));
        that.removeShareThisLinks(element);
        util.removeLeadingWhiteSpace(element);
    }

    removeShareThisLinks(element) {
        let shareLinks = util.getElements(element, "span", 
            e => (e.className === "st_facebook") || (e.className === "st_twitter") || (e.className === "st_googleplus")
        );
        for(let share of shareLinks) {
            let parent = share.parentNode;
            if (parent.tagName.toLowerCase() === "p") {
                util.removeNode(parent);
            }
            util.removeNode(share);
        }
    }

    populateUI(dom) {
        super.populateUI(dom);
        CoverImageUI.showCoverImageUrlInput(true);
    }
}
