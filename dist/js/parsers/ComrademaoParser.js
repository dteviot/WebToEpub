"use strict";

//dead url/ parser
parserFactory.register("comrademao.com", () => new ComrademaoParser());

class ComrademaoParser extends Parser {
    constructor() {
        super();
    }

    disabled() {
        return UIText.Warning.parserDisabledNotification;
    }

    populateUIImpl() {
        document.getElementById("removeOriginalRow").hidden = false; 
    }

    getChapterUrls(dom, chapterUrlsUI) {
        return this.getChapterUrlsFromMultipleTocPages(dom,
            ComrademaoParser.extractPartialChapterList,
            ComrademaoParser.getUrlsOfTocPages,
            chapterUrlsUI
        ).then(urls => urls.reverse());
    }

    static getUrlsOfTocPages(dom) {
        let pagination = dom.querySelector("nav.pagination");
        let tocUrls = [];
        if (pagination != null ) {
            let tocLinks = [...dom.querySelectorAll("a.page-numbers:not(.next)")]
                .map(a => a.href);
            if (0 < tocLinks.length) {
                let maxPageUrl = tocLinks[tocLinks.length - 1];
                let index = maxPageUrl.lastIndexOf("/", maxPageUrl.length - 2);
                let base = maxPageUrl.substring(0, index + 1);
                let maxPage = parseInt(maxPageUrl.substring(index + 1));
                if (1 < maxPage) {
                    for (let i = 2; i <= maxPage; ++i) {
                        tocUrls.push(`${base}${i}/`);
                    }
                }
            }
        }
        return tocUrls;
    }

    static extractPartialChapterList(dom) {
        let menu = dom.querySelector("table.table");
        return util.hyperlinksToChapterList(menu);
    }

    findContent(dom) {
        return dom.querySelector(".site-main article");
    }

    extractTitleImpl(dom) {
        return dom.querySelector(".entry-title");
    }

    removeUnwantedElementsFromContentElement(element) {
        util.removeChildElementsMatchingSelector(element, "button, nav, div#comments");
        super.removeUnwantedElementsFromContentElement(element);
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "#thumbnail");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("#Description")];
    }
}
