/*
  Parser for World Literature Publishing websites
*/

"use strict";

parserFactory.register("finestories.com", () => new WLPublishingParser());
parserFactory.register("scifistories.com", () => new WLPublishingParser());
parserFactory.register("storiesonline.net", () => new WLPublishingParser());

parserFactory.registerManualSelect(
    "WLPublishing",
    () => new WLPublishingParser()
);

class WLPublishingParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let index = dom.querySelector("div#index-list");
        if (index === null) {
            let baseUrl = this.getBaseUrl(dom);
            return this.singleChapterStory(baseUrl, dom);
        }
        for (let link of index.querySelectorAll("a")) {
            if (link.hasAttribute("title") && (link.getAttribute("title") === "download")) {
                link.remove();
            }
        }
        return util.hyperlinksToChapterList(index);
    }

    findContent(dom) {
        return dom.querySelector("article");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1");
    }

    extractAuthor(dom) {
        let title = dom.querySelector("title").textContent;
        if (title != null) {
            return title.substring(0, title.indexOf(":"));
        }
        return super.extractAuthor(dom);
    }

    removeUnwantedElementsFromContentElement(element) {
        util.removeChildElementsMatchingSelector(element, "div.date");
        util.removeChildElementsMatchingSelector(element, "span.conTag");
        util.removeChildElementsMatchingSelector(element, "span.curr");
        util.removeChildElementsMatchingSelector(element, "div.pager");
        util.removeChildElementsMatchingSelector(element, "div.end-note");
        util.removeChildElementsMatchingSelector(element, "div.vform");
        util.removeChildElementsMatchingSelector(element, "div.sale-link");
        util.removeChildElementsMatchingSelector(element, "div.reco");
        util.removeChildElementsMatchingSelector(element, ".end");
        util.removeChildElementsMatchingSelector(element, "h4.c");
        util.removeMicrosoftWordCrapElements(element);
        util.removeScriptableElements(element);
        util.removeComments(element);
        super.removeUnwantedElementsFromContentElement(element);
    }

    findChapterTitle(dom) {
        return dom.querySelector("h2");
    }

    async fetchChapter(url) {
        let chapterDom = (await HttpClient.wrapFetch(url)).responseXML;
        let extraURLs = WLPublishingParser.findURLsOfChapterPages(chapterDom);
        for (let pageUrl of extraURLs) {
            let pageDom = (await HttpClient.wrapFetch(pageUrl)).responseXML;
            chapterDom = this.addPageToChapter(chapterDom, pageDom);
        }
        return chapterDom;
    }

    /*
      Chapters are composed of multiple pages.
      There are links to all of the pages in the chapter at the top and bottom of each page.
      Along with the link to each page of the chapter, there is a link to the next page, which is a duplicate.
      Single page chapters have no pager element.
    */
    static findURLsOfChapterPages(dom) {
        let urls = [];
        let pager = dom.querySelector("div.pager");
        if (pager) {
            for (let link of pager.querySelectorAll("a")) {
                if (link.textContent != "Next") {
                    urls.push(link.href);
                }
            }
        }
        return urls;
    }

    addPageToChapter(chapterDom, pageDom) {
        let chapterContent = this.findContent(chapterDom);
        let pageContent = this.findContent(pageDom);
        while (pageContent.childNodes.length > 0) {
            let child = pageContent.childNodes[0];
            // The chapter title appears on each page in the chapter and we only want it from the first.
            if ((child.tagName == "H1") || (child.tagName == "H2")) {
                child.remove();
            } else {
                chapterContent.appendChild(child);
            }
        }
        return chapterDom;
    }
}
