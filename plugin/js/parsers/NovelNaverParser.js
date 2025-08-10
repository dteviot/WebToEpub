"use strict";

//dead url/ parser
parserFactory.register("novel.naver.com", () => new NovelNaverParser());

class NovelNaverImageCollector extends ImageCollector {
    constructor() {
        super();
    }

    //  Ignore address of hyperlink that wraps an image tag
    extractWrappingUrl(element) {
        let tagName = element.tagName.toLowerCase();
        let img = (tagName === "img")
            ? element
            : element.querySelector("img");
        return img.src;
    }
}

class NovelNaverParser extends Parser {
    constructor() {
        super(new NovelNaverImageCollector());
    }

    async getChapterUrls(dom, chapterUrlsUI) {
        let chapters = this.extractPartialChapterList(dom);
        let urlsOfTocPages = await this.extractTocPageUrls(dom);
        return (await this.getChaptersFromAllTocPages(chapters, 
            this.extractPartialChapterList, urlsOfTocPages, chapterUrlsUI));
    }

    async extractTocPageUrls(dom) {
        let found = new Set();
        let urls = this.extractPartialTocPages(dom, found);
        let nextTocPageUrl = null;
        while ((nextTocPageUrl = dom.querySelector("div.default_paging a.ico_next")?.href) != null) {
            dom = (await HttpClient.wrapFetch(nextTocPageUrl)).responseXML;
            urls = urls.concat(this.extractPartialTocPages(dom, found));
        }
        return urls;
    }

    extractPartialTocPages(dom, found) {
        let urls = [...dom.querySelectorAll("div.default_paging a")]
            .map(l => l.href)
            .filter(u => !found.has(u));
        for (let u of urls) {
            found.add(u);
        }
        return urls;
    }

    extractPartialChapterList(dom) {
        let menu = dom.querySelector("div.cont_sub > ul.list_type2");
        return [...menu.querySelectorAll("a")]
            .map(a => ({
                sourceUrl:  a.href,
                title: a.querySelector("p.subj").textContent.trim()
            }));
    }

    findContent(dom) {
        return dom.querySelector("div.viewer_container");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h2.book_title");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.section_area_info");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("#summaryText")];
    }
}
