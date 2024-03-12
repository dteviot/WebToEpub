"use strict";

parserFactory.register("novelonomicon.com", () => new NovelonomiconParser());

class NovelonomiconParser extends Parser{
    constructor() {
        super();
    }

    async getChapterUrls(dom, chapterUrlsUI) {
        return (await this.getChapterUrlsFromMultipleTocPages(dom,
            this.extractPartialChapterList,
            this.getUrlsOfTocPages,
            chapterUrlsUI
        )).reverse();
    }

    getUrlsOfTocPages(dom) {
        let urls = []
        let lastLink = dom.querySelector(".page-nav a.last")
            || [...dom.querySelectorAll(".page-nav a.page")].slice(-1)[0];
        if (lastLink !== null)
        {
            let max = parseInt(lastLink.textContent);
            let href = lastLink.href;
            let index = href.lastIndexOf("/", href.length - 2);
            href = href.substring(0, index + 1);
            for(let i = 2; i <= max; ++i) {
                urls.push(href + i + "/");
            }
        }
        return urls;
    }

    extractPartialChapterList(dom) {
        return [...dom.querySelectorAll(".td-block-span6 h3 a")]
            .map(a => util.hyperLinkToChapter(a));
    }

    findContent(dom) {
        return dom.querySelector(".tdi_48 .wpb_wrapper .tdb_single_content");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1");
    }

    findChapterTitle(dom) {
        return dom.querySelector("h1");
    }

    findCoverImageUrl(dom) {
        let span = dom.querySelector("#tdi_70 span.entry-thumb")?.getAttribute("data-img-url");
        return span == null
            ? null
            : "https:" + span;
    }
    
    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll(".td-main-content-wrap .tdb_category_description .tdb-block-inner")];
    }
}
