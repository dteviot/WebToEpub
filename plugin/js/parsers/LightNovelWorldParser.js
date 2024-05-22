"use strict";

parserFactory.register("lightnovelcave.com", () => new LightNovelWorldParser());
parserFactory.register("lightnovelworld.co", () => new LightNovelWorldParser());
parserFactory.register("lightnovelworld.com", () => new LightNovelWorldParser());
parserFactory.register("lightnovelpub.com", () => new LightNovelWorldParser());
parserFactory.register("lightnovelpub.fan", () => new LightNovelWorldParser());
parserFactory.register("novelpub.com", () => new LightNovelWorldParser());
parserFactory.register("webnovelpub.com", () => new LightNovelWorldParser());
parserFactory.register("webnovelpub.pro", () => new LightNovelWorldParser());

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
        let paginateUrls = [...dom.querySelectorAll("ul.pagination li a")]
            .map(a => a.href);
        if (0 < paginateUrls.length) {
            let maxPage = LightNovelWorldParser.maxPageId(paginateUrls);
            let url = new URL(paginateUrls[0]);
            for(let i = 2; i <= maxPage; ++i) {
                url.searchParams.set("page", i);
                urls.push(url.href);
            }
        }
        return urls;
    }

    // last URL isn't always last ToC page
    static maxPageId(urls) {
        let pageNum = function(url) {
            let pageNo = new URL(url).searchParams.get("page");
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

    extractAuthor(dom) {
        let authorLabel = dom.querySelector("span[itemprop='author']");
        return authorLabel?.textContent ?? super.extractAuthor(dom);
    }

    removeUnwantedElementsFromContentElement(element) {
        let toRemove = [...element.querySelectorAll("p")]
            .filter(this.isWatermark);
        util.removeElements(toRemove);

        toRemove = [...element.querySelectorAll("strong")]
            .filter(e => e.parentNode.tagName == "STRONG")
            .map(e => e.parentNode);
        util.removeElements(toRemove);

        toRemove = [...element.querySelectorAll("div > dl > dt")]
            .map(e => e.parentNode.parentNode);
        util.removeElements(toRemove);

        super.removeUnwantedElementsFromContentElement(element);
    }

    isWatermark(element) {
        return !!element.className;
    }

    findChapterTitle(dom) {
        return dom.querySelector("span.chapter-title");
    }

    findCoverImageUrl(dom) {
        let metaImage = dom.querySelector("meta[property*='og:image']");
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
