"use strict";

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
            : element.querySelector("img")
        return img.src;
    }
}

class NovelNaverParser extends Parser{
    constructor() {
        super(new NovelNaverImageCollector());
    }

    async getChapterUrls(dom, chapterUrlsUI) {
        let chapters = this.extractPartialChapterList(dom);
        let urlsOfTocPages = this.extractTocPageUrls(dom);
        return (await Parser.getChaptersFromAllTocPages(chapters, 
            this.extractPartialChapterList, urlsOfTocPages, chapterUrlsUI)).reverse();
    }

    extractTocPageUrls(dom) {
        let tocLinks = [...dom.querySelectorAll("div.paging a:not(.paging_next)")];
        let pages = tocLinks
            .map(a => a.textContent);
        if (pages.length <= 1) {
            return [];
        }
        let max = parseInt(pages.pop());
        let baseUrl = tocLinks[0].href;
        baseUrl = baseUrl.substring(0, baseUrl.length - 1);

        // might be more ToC pages than given in paging control
        // so check against num chapters
        let volume = dom.querySelector("div.cont_sub > ul.list_type2 li.volumeComment");
        if (volume != null) {
            let maxChapters = parseInt(volume.getAttribute("value"));
            max = Math.floor(maxChapters + 9) / 10;
        }

        let tocUrls = [];
        for(let i = 2; i <= max; ++i) {
            tocUrls.push(baseUrl + i);
        }
        return tocUrls;
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
        return [...dom.querySelectorAll("div.section_area_info p.dsc")];
    }
}
