"use strict";

parserFactory.register("lightnovelworld.com", () => new LightNovelWorldParser());
parserFactory.register("lightnovelpub.com", () => new LightNovelWorldParser());

class LightNovelWorldParser extends Parser{
    constructor() {
        super();
    }

    clampSimultanousFetchSize() {
        return 1;
    }

    async getChapterUrls(dom, chapterUrlsUI) {
        if (!dom.baseURI.endsWith("/chapters")) {
            dom = (await HttpClient.wrapFetch(dom.baseURI + "/chapters")).responseXML;
        }
        let chapters = LightNovelWorldParser.extractPartialChapterList(dom);
        let urlsOfTocPages  = LightNovelWorldParser.getUrlsOfTocPages(dom);

        for(let url of urlsOfTocPages) {
            let newDom = (await HttpClient.wrapFetch(url)).responseXML;
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
                urls.push(url.href.replace(/page-\d+/g, `page-${i}`));
            }
        }
        return urls;
    }

    // last URL isn't always last ToC page
    static maxPageId(urls) {
        let pageNum = function(url) {
            let pageNo = new URL(url).searchParams.get("page");
            pageNo = parseInt(pageNo);
            if (!pageNo)
            {
                let regExResult = /page-(\d+)/g.exec(url);
                if (regExResult.length > 1)
                    return parseInt(regExResult[1]);
            }
            return pageNo;
        }
        return urls.reduce((p, c) => Math.max(p, pageNum(c)), 0);
    }

    findContent(dom) {
        return dom.querySelector("div.chapter-content");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("div.novel-info h1");
    }

    removeUnwantedElementsFromContentElement(element) {
        let toRemove = [...element.querySelectorAll("p")]
            .filter(this.isWatermark);
        util.removeElements(toRemove);
        super.removeUnwantedElementsFromContentElement(element);
    }

    isWatermark(element) {
        return !!element.className;
    }

    findChapterTitle(dom) {
        return dom.querySelector("h2");
    }

    findCoverImageUrl(dom) {
        var metaImage = dom.querySelector("meta[property*='og:image']");
        if (metaImage)
        {
            metaImage = metaImage.content;
        }
        return metaImage || util.getFirstImgSrc(dom, "div.header-body");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.novel-info, section#info")];
    }

    cleanInformationNode(node) {
        util.removeChildElementsMatchingCss(node, "nav.links");
    }
}
