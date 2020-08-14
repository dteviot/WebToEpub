"use strict";

parserFactory.register("lightnovelworld.com", () => new LightNovelWorldParser());

class LightNovelWorldParser extends Parser{
    constructor() {
        super();
    }

    clampSimultanousFetchSize() {
        return 1;
    }

    async getChapterUrls(dom, chapterUrlsUI) {
        let chapters = LightNovelWorldParser.extractPartialChapterList(dom);
        let urlsOfTocPages  = LightNovelWorldParser.getUrlsOfTocPages(dom);

        chapterUrlsUI.showTocProgress(chapters);
        let options = {
            method: "POST",
            credentials: "include",
            headers: {
                "x-requested-with": "XMLHttpRequest",
                "requestverificationtoken": this.getVerificationToken(dom)
            }
        };
        for(let url of urlsOfTocPages) {
            let newDom = (await HttpClient.wrapFetch(url, {fetchOptions: options})).responseXML;
            let partialList = LightNovelWorldParser.extractPartialChapterList(newDom);
            chapterUrlsUI.showTocProgress(partialList);
            chapters = chapters.concat(partialList);
        }
        return chapters;
    }

    getVerificationToken(dom) {
        let element = dom.querySelector("input[name='__RequestVerificationToken']");
        return element.getAttribute("value");
    }

    static extractPartialChapterList(dom) {
        return [...dom.querySelectorAll("ul.chapter-list a")]
            .map(LightNovelWorldParser.linkToChapterIfo);
    }

    static linkToChapterIfo(link) {
        let chaperNo = link.querySelector(".chapter-no").textContent.trim();
        let title = link.querySelector(".chapter-title").textContent.trim();
        return {
            sourceUrl:  link.href,
            title: `${chaperNo}: ${title}`,
            newArc: null
        };
    }

    static getUrlsOfTocPages(dom) {
        let urls = []
        let paginateUrls = [...dom.querySelectorAll("ul.pagination li a")];
        if (0 < paginateUrls.length) {
            let maxPage = LightNovelWorldParser.maxPageId(paginateUrls);
            let url = new URL(paginateUrls.pop().href);
            for(let i = 2; i <= maxPage; ++i) {
                url.searchParams.set("pageNo", i);
                urls.push(url.href);
            }
        }
        return urls;
    }

    // last URL isn't always last ToC page
    static maxPageId(urls) {
        let pageNum = function(url) {
            let pageNo = new URL(url).searchParams.get("pageNo");
            return parseInt(pageNo);
        }
        return urls.reduce((p, c) => Math.max(p, pageNum(c)), 0);
    }

    findContent(dom) {
        return dom.querySelector("div.chapter-content");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("div.novel-info h1");
    }

    findChapterTitle(dom) {
        return dom.querySelector("h2");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.header-body");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.novel-info, section#info")];
    }

    cleanInformationNode(node) {
        util.removeChildElementsMatchingCss(node, "nav.links");
    }
}
