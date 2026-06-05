/*
  Parses www.readlightnovel.com
*/
"use strict";

parserFactory.register("readlightnovel.me", () => new ReadLightNovelParser());
parserFactory.register("readlightnovel.meme", () => new ReadLightNovelParser());
//dead url
parserFactory.register("readlightnovel.org", () => new ReadLightNovelParser());
//dead url
parserFactory.register("readlightnovel.today", () => new ReadLightNovelParser());

class ReadLightNovelParser extends Parser {
    constructor() {
        super();
    }

    getChapterUrls(dom) {
        let chaptersDiv = dom.querySelector("div.chapters");
        let chapters = util.hyperlinksToChapterList(chaptersDiv, this.isChapterHref, this.getChapterArc);
        if (0 < chapters.length) {
            return Promise.resolve(chapters);
        }
        else {
            return Promise.reject(new Error(UIText.Error.noChaptersFound));
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
            }
        }

        // get the title
        if (panelDiv !== null) {
            let titleDiv = panelDiv.querySelector("div.panel-heading");
            if (titleDiv !== null) {
                arc = titleDiv.innerText.trim();
            }
        }
        return arc;
    }

    extractTitleImpl(dom) {
        return dom.querySelector("div.block-title");
    }

    extractAuthor(dom) {
        let div = util.getElement(dom, "div", d => (d.className === "novel-detail-item") &&
            (this.novelDetailHeaderName(d) === "Author(s)"));
        if (div !== null) {
            let li = div.querySelector("li");
            if (li != null) {
                return li.innerText;
            }
        }
        return super.extractAuthor(dom);
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
        let firstBr = element.querySelector("br:first-of-type");
        let ch = firstBr.nextSibling;
        if (ch && ch.data.includes("Chapter")) {
            let secondBr = ch.nextSibling;
            if (secondBr && secondBr.tagName == "BR") {
                util.removeElements([firstBr, ch, secondBr]);
            }
        }

        for (let a of element.querySelectorAll(".adsbyvli")) {
            let toDelete = [];
            let center = a.parentNode;
            let temp =  this.addPreviousSiblingIfMatches(center, "BR", toDelete);
            this.addPreviousSiblingIfMatches(temp, "BR", toDelete);
            temp = this.addNextSiblingIfMatches(center, "BR", toDelete);
            temp = this.addNextSiblingIfMatches(temp, "BR", toDelete);
            this.addNextSiblingIfMatches(temp, "HR", toDelete);

            if (center.tagName == "CENTER") {
                center.remove();
            }
            util.removeElements(toDelete);
        }

        for (let small of element.querySelectorAll(".ads-title")) {
            let toDelete = [];
            this.addPreviousSiblingIfMatches(small, "BR", toDelete);
            let temp = this.addNextSiblingIfMatches(small, "BR", toDelete);
            temp = this.addNextSiblingIfMatches(temp, "CENTER", toDelete);
            this.addNextSiblingIfMatches(temp, "HR", toDelete);

            small.remove();
            util.removeElements(toDelete);
        }

        for (let s of element.querySelectorAll("center > script")) {
            let toDelete = [];
            let center = s.parentNode;
            this.addNextSiblingIfMatches(center, "HR", toDelete);

            center.remove();
            util.removeElements(toDelete);
        }

        super.removeUnwantedElementsFromContentElement(element);
        util.removeChildElementsMatchingSelector(element, "div.row, " +
            ".alert, img[src*='/magnify-clip.png'], div.hidden, p.hid");
        this.removeShareThisLinks(element);
    }

    addPreviousSiblingIfMatches(element, tagName, list) {
        return this.addSiblingIfMatches(element, tagName, list, e => e.previousElementSibling);
    }

    addNextSiblingIfMatches(element, tagName, list) {
        return this.addSiblingIfMatches(element, tagName, list, e => e.nextElementSibling);
    }

    addSiblingIfMatches(element, tagName, list, op) {
        if (element === null) {
            return null;
        }
        let sibling = op(element);

        if (!sibling && (element.parentNode !== null)) {
            sibling = op(element.parentNode);
        }

        if (sibling !== null) {
            if (sibling.tagName === tagName) {
                list.push(sibling);
            } else {
                sibling = null;
            }
        }
        return sibling;
    }

    removeShareThisLinks(element) {
        let shareLinks = element.querySelectorAll("span.st_facebook, " +
            "span.st_twitter, span.st_googleplus");
        for (let share of shareLinks) {
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
