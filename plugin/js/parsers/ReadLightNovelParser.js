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

    extractTitleImpl(dom) {
        return dom.querySelector("div.block-title");
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
        let firstBr = element.querySelector('br:first-of-type');
        if(firstBr.nextSibling.data.includes("Chapter") &&
           firstBr.nextSibling.nextSibling.tagName == "BR") {
            util.removeElements([firstBr, firstBr.nextSibling,
                firstBr.nextSibling.nextSibling]);
        } else {
            util.log("missing chapter")
        }

        for(let a of element.querySelectorAll('.adsbyvli')) {
            let center = a.parentNode;
            let br2 = center.previousElementSibling;
            let br1 = br2.previousElementSibling;
            let br3 = center.nextElementSibling;
            let br4 = br3.nextElementSibling;
            let hr = br4.nextElementSibling;

            if(br1.tagName == "BR" &&
                br2.tagName == "BR" &&
                br3.tagName == "BR" &&
                br4.tagName == "BR" &&
                hr.tagName == "HR" &&
                center.tagName == "CENTER") {
                util.removeElements([br1, br2, center, br3, br4, hr]);
            } else {
                util.log("incorrect adsbyvli pattern")
            }
        }

        for(let small of element.querySelectorAll('.ads-title')) {
            let br1 = small.previousElementSibling;
            let br2 = small.nextElementSibling;
            let center = br2.nextElementSibling;
            let hr = center.nextElementSibling;

            if(br1.tagName == "BR" &&
                br2.tagName == "BR" &&
                hr.tagName == "HR" &&
                small.tagName == "SMALL" &&
                center.tagName == "CENTER") {
                util.removeElements([br1, small, br2, center, hr]);
            } else {
                util.log("incorrect ads-title pattern")
            }
        }

        for(let s of element.querySelectorAll('center > script')) {
            let center = s.parentNode;
            let hr = center.nextElementSibling;

            if(center.tagName == "CENTER") {
                util.removeElements([center]);
            } else {
                util.log("incorrect ads-title pattern")
            }
            if(hr.tagName == "HR") {
                util.removeElements([hr]);
            }

        }

        super.removeUnwantedElementsFromContentElement(element);
        util.removeChildElementsMatchingCss(element, "div.row, " +
            ".alert, img[src*='/magnify-clip.png'], div.hidden");
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
