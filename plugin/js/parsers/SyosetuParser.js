"use strict";

parserFactory.register("ncode.syosetu.com", () => new SyosetuParser());
parserFactory.register("novel18.syosetu.com", () => new SyosetuParser());

class SyosetuParser extends Parser{
    constructor() {
        super();
    }

    async getChapterUrls(dom, chapterUrlsUI) {
        return this.getChapterUrlsFromMultipleTocPages(dom,
            this.extractPartialChapterList,
            this.getUrlsOfTocPages,
            chapterUrlsUI
        );
    }

    getUrlsOfTocPages(dom) {
        let lastPage = dom.querySelector("a.novelview_pager-last");
        let urls = [];
        if (lastPage) {
            const lastPageNumber = parseInt(lastPage.href.split('?p=')[1]);
            const baseUrl = lastPage.href.substring(0, lastPage.href.lastIndexOf('?p='));
            for (let i = 2; i <= lastPageNumber; i++) {
                urls.push(`${baseUrl}?p=${i}`);
            }
        }
        return urls;
    }

    extractPartialChapterList(dom) {
        let chapterList = dom.querySelector("div.index_box") || dom.querySelector("div.novel_sublist");
        return [...chapterList.querySelectorAll("a")].map(a => util.hyperLinkToChapter(a));
    }

    findContent(dom) {
        return dom.querySelector("div#novel_honbun");
    };

    extractTitleImpl(dom) {
        return dom.querySelector(".novel_title");
    };

    extractAuthor(dom) {
        const authorDiv = dom.querySelector("div.novel_writername");
        if (authorDiv) {
            const authorText = authorDiv.textContent.trim().replace(/^作者：/, "");
            return authorDiv.querySelector("a")?.textContent.trim() || authorText;
        }
        return super.extractAuthor(dom);
    }

    findChapterTitle(dom) {
        let element = dom.querySelector(".novel_subtitle");
        return (element === null) ? null : element.textContent;
    }
}
