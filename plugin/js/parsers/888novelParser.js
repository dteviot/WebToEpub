"use strict";

//dead url/ parser
parserFactory.register("888novel.com", () => new _888novelParser());

class _888novelParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom, chapterUrlsUI) {
        return this.getChapterUrlsFromMultipleTocPages(dom,
            _888novelParser.extractPartialChapterList,
            _888novelParser.getUrlsOfTocPages,
            chapterUrlsUI
        );
    }

    static getUrlsOfTocPages(dom) {
        let pagination = dom.querySelector("ul.pagination");
        let tocUrls = [];
        if (pagination != null ) {
            let tocLinks = [...pagination.querySelectorAll("a")]
                .filter(a => a.textContent !== "»");
            if (0 < tocLinks.length) {
                let maxPageUrl = tocLinks.pop().href;
                let index = maxPageUrl.lastIndexOf("/", maxPageUrl.length - 2);
                let base = maxPageUrl.substring(0, index + 1);
                let maxPage = parseInt(maxPageUrl.substring(index + 1).replace("#dsc", ""));
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
        let menu = dom.querySelector("#dsc ul.listchap");
        return util.hyperlinksToChapterList(menu);
    }

    findContent(dom) {
        return dom.querySelector("div.reading");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1");
    }

    findChapterTitle(dom) {
        return dom.querySelector("h2");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, ".book3d");
    }

    getInformationEpubItemChildNodes(dom) {
        let nodes = [...dom.querySelectorAll("div.tabs1")];
        for (let n of nodes) {
            n.setAttribute("style", null);
        }
        return nodes;
    }
}
