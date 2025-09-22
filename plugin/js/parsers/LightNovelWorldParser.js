"use strict";

parserFactory.register("lightnovelcave.com", () => new LightNovelWorldParser());
parserFactory.register("lightnovelworld.co", () => new LightNovelWorldParser());
parserFactory.register("lightnovelworld.com", () => new LightNovelWorldParser());
parserFactory.register("lightnovelpub.com", () => new LightNovelPubParser());
parserFactory.register("lightnovelpub.fan", () => new LightNovelWorldParser());
parserFactory.register("novelfire.docsachhay.net", () => new LightNovelWorldParser());
parserFactory.register("novelbob.org", () => new LightNovelWorldParser());
parserFactory.register("novelpub.com", () => new LightNovelWorldParser());
parserFactory.register("novelfire.net", () => new NovelfireParser());
parserFactory.register("webnovelpub.com", () => new LightNovelWorldParser());
parserFactory.register("webnovelpub.pro", () => new LightNovelWorldParser());
parserFactory.register("pandanovel.co", () => new LightNovelWorldParser());

class LightNovelWorldParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom, chapterUrlsUI) {
        if (!dom.baseURI.endsWith("/chapters")) {
            dom = (await HttpClient.wrapFetch(dom.baseURI + "/chapters")).responseXML;
        }
        let chapters = this.extractPartialChapterList(dom);
        let urlsOfTocPages  = this.getUrlsOfTocPages(dom);

        for (let url of urlsOfTocPages) {
            await this.rateLimitDelay();
            let newDom = (await HttpClient.wrapFetch(url)).responseXML;
            let partialList = this.extractPartialChapterList(newDom);
            chapterUrlsUI.showTocProgress(partialList);
            chapters = chapters.concat(partialList);
        }
        return chapters;
    }

    getVerificationToken(dom) {
        let element = dom.querySelector("input[name='__RequestVerificationToken']");
        return element.getAttribute("value");
    }

    extractPartialChapterList(dom) {
        return [...dom.querySelectorAll("ul.chapter-list a")]
            .map(this.linkToChapterIfo);
    }

    linkToChapterIfo(link) {
        let title = link.querySelector(".chapter-title").textContent.trim();
        const isChapter = title.toLowerCase().includes("chapter");
        let chaperNo = link.querySelector(".chapter-no")?.textContent?.trim() ?? "";
        if (!isChapter && chaperNo !== "") {
            chaperNo += ": ";
        } else {
            chaperNo = "";
        }
        return {
            sourceUrl:  link.href,
            title: chaperNo + title,
            newArc: null
        };
    }

    getUrlsOfTocPages(dom) {
        let urls = [];
        let paginateUrls = [...dom.querySelectorAll("ul.pagination li a")]
            .map(a => a.href);
        if (0 < paginateUrls.length) {
            let maxPage = this.maxPageId(paginateUrls);
            let url = new URL(paginateUrls[0]);
            for (let i = 2; i <= maxPage; ++i) {
                url.searchParams.set("page", i);
                urls.push(url.href);
            }
        }
        return urls;
    }

    // last URL isn't always last ToC page
    maxPageId(urls) {
        let pageNum = function(url) {
            let pageNo = new URL(url).searchParams.get("page");
            return parseInt(pageNo);
        };
        return urls.reduce((p, c) => Math.max(p, pageNum(c)), 0);
    }

    findContent(dom) {
        return dom.querySelector("div.chapter-content")
            || dom.querySelector("div#content");
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
        util.removeChildElementsMatchingSelector(node, "nav.links");
    }
}

class LightNovelPubParser extends LightNovelWorldParser {
    constructor() {
        super();
        this.minimumThrottle = 1200;
    }
}

class NovelfireParser extends LightNovelWorldParser {
    constructor() {
        super();
    }
    
    removeUnwantedElementsFromContentElement(element) {
        util.removeHTMLUnknownElement(element);
        super.removeUnwantedElementsFromContentElement(element);
    }
}