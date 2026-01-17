"use strict";

parserFactory.register("findnovel.net", () => new FindNovelParser());
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

class FindNovelParser extends LightNovelWorldParser {
    constructor() {
        super();
    }
    
    removeUnwantedElementsFromContentElement(element) {
        util.removeHTMLUnknownElement(element);
        super.removeUnwantedElementsFromContentElement(element);
    }
}

class NovelfireParser extends FindNovelParser {
    constructor() {
        super();
    }

    async getChapterUrls(dom, chapterUrlsUI) {
        if (!dom.baseURI.endsWith("/chapters")) {
            dom = (await HttpClient.wrapFetch(dom.baseURI + "/chapters")).responseXML;
        }

        let chapterListUrl = this.buildChapterListRequestUrl(dom);
        if (chapterListUrl == null) {
            return super.getChapterUrls(dom, chapterUrlsUI);
        }
        let json = (await HttpClient.fetchJson(chapterListUrl)).json;

        let root = this.getChapterUrlRoot(dom);
        return json.data.map(d => NovelfireParser.dataToChapter(d, root));
    }

    buildChapterListRequestUrl(dom) {
        let prefix = "/listChapterDataAjax";
        let script = [...dom.querySelectorAll("script")]
            .filter(s => s.textContent.includes(prefix))
            .map(s => s.textContent)[0];
        if (script) {
            let startIndex = script.indexOf(prefix);
            let endIndex = script.indexOf("\",", startIndex);
            let fragment = script.substring(startIndex, endIndex);

            let host = new URL(dom.baseURI).hostname;
            return "https://" + host + fragment +
                "&draw=1&columns%5B0%5D%5Bdata%5D=title&columns%5B0%5D%5Bname%5D=&columns%5B0%5D%5Bsearchable%5D=true&columns%5B0%5D%5Borderable%5D=false&columns%5B0%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B0%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B1%5D%5Bdata%5D=created_at&columns%5B1%5D%5Bname%5D=&columns%5B1%5D%5Bsearchable%5D=true&columns%5B1%5D%5Borderable%5D=true&columns%5B1%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B1%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B2%5D%5Bdata%5D=n_sort&columns%5B2%5D%5Bname%5D=&columns%5B2%5D%5Bsearchable%5D=false&columns%5B2%5D%5Borderable%5D=true&columns%5B2%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B2%5D%5Bsearch%5D%5Bregex%5D=false&order%5B0%5D%5Bcolumn%5D=2&order%5B0%5D%5Bdir%5D=asc&start=0&length=-1&search%5Bvalue%5D=&search%5Bregex%5D=false";
        }
        return null;
    }

    getChapterUrlRoot(dom) {
        let root = dom.baseURI;
        return root.endsWith("/chapters")
            ? root.replace("/chapters", "" )
            : root;
    }

    static dataToChapter(data, root) {
        return ({
            sourceUrl: root + "/chapter-" + data.n_sort,
            title: data.title,
        });
    }
}