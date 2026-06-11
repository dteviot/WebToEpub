"use strict";

//dead url/ parser
parserFactory.register("m.gzbpi.com", () => new GzbpParser());

class GzbpParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom, chapterUrlsUI) {
        let url = dom.baseURI.replace("/info/", "/wapbook/");
        let newDom = (await HttpClient.wrapFetch(url)).responseXML;
        return (await this.walkTocPages(newDom,
            this.getChapterUrlsFromTocPage,
            this.nextTocPageUrl,
            chapterUrlsUI
        ));
    }

    getChapterUrlsFromTocPage(dom) {
        return [...dom.querySelectorAll("ul.fk li a")]
            .filter(a => a.href.includes("wapbook"))
            .map(a => util.hyperLinkToChapter(a));
    }

    nextTocPageUrl(dom) {
        let link = dom.querySelector("div.xypa a");
        return link === null ? null : link.href;
    }

    findContent(dom) {
        return dom.querySelector("div#content-txt");
    }

    extractTitleImpl(dom) {
        let title = dom.querySelector("div.xx li");
        return title === null ? null : title.textContent;
    }

    // language used
    // Optional, if not provided, will default to ISO code for English "en"
    /*
    extractLanguage(dom) {
        return dom.querySelector("html").getAttribute("lang");
    }
    */

    removeUnwantedElementsFromContentElement(element) {
        let toRemove = [...element.querySelectorAll("div")]
            .filter(d => d.textContent.includes("本章未完，点击下一篇继续阅读！"));
        util.removeElements(toRemove);
        super.removeUnwantedElementsFromContentElement(element);
    }

    findChapterTitle(dom) {
        let title = dom.querySelector("div.c_title");
        return title === null ? null : title.textContent.trim();
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.xsfm");
    }

    async fetchChapter(url) {
        return this.walkPagesOfChapter(url, this.moreChapterTextUrl);
    }

    moreChapterTextUrl(dom, url, count) {
        // finding next page URL, need to sse if any script holds 
        // the expected value

        let nextUrl = url.replace(".html", "-" + count + ".html");
        let leaf = nextUrl.split("/").pop();

        let scripts = [...dom.querySelectorAll("script")]
            .filter(script => script.textContent.includes(leaf));
        
        return (0 < scripts.length) ? nextUrl : null;
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.jianjie")];
    }
}
