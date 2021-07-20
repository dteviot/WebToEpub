"use strict";

parserFactory.register("ranobes.net", () => new RanobesParser());

class RanobesParser extends Parser{
    constructor() {
        super();
    }

    async getChapterUrls(dom, chapterUrlsUI) {
        let menu = dom.querySelector("ul.chapters-scroll-list");
        let chapters = util.hyperlinksToChapterList(menu);

        let tocLink = dom.querySelector("div.r-fullstory-chapters-foot a[title='Go to table of contents']");
        if (tocLink == null) {
            return chapters.reverse();
        }
        let tocDom = (await HttpClient.wrapFetch(tocLink.href)).responseXML;
        let urlsOfTocPages = this.extractTocPageUrls(tocDom, tocLink.href.replace("/novels/", "/"));
        return (await Parser.getChaptersFromAllTocPages(chapters, 
            this.extractPartialChapterList, urlsOfTocPages, chapterUrlsUI)).reverse();
    }

    extractTocPageUrls(dom, baseUrl) {
        let pages = [...dom.querySelectorAll("div.pages a")]
            .map(a => a.textContent);
        let max = 1 < pages.length
            ? parseInt(pages.pop())
            : 0;
        let tocUrls = [];
        for(let i = 2; i <= max; ++i) {
            tocUrls.push(`${baseUrl}page/${i}/`);
        }
        return tocUrls;
    }

    extractPartialChapterList(dom) {
        return [...dom.querySelectorAll("div#dle-content a[title]")]
            .map(a => ({
                sourceUrl:  a.href,
                title: a.getAttribute("title")
            }));
    }

    findContent(dom) {
        return dom.querySelector("div#arrticle");
    }

    extractTitleImpl(dom) {
        let title = dom.querySelector("h1.title");
        util.removeChildElementsMatchingCss(title, "span");
        return title;
    }

    findChapterTitle(dom) {
        return dom.querySelector("h1.title");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.r-fullstory-poster");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div[itemprop='description']")];
    }
}
