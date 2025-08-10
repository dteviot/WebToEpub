"use strict";

//dead url
parserFactory.register("readnoveldaily.com", () => new ReadnoveldailyParser());
parserFactory.register("allnovelbook.com", () => new ReadnoveldailyParser());

class ReadnoveldailyParser extends Parser {
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
        let urls = [];
        let paginateUrls = [...dom.querySelectorAll("ul.pagination li a:not([rel])")];
        if (0 < paginateUrls.length) {
            let url = new URL(paginateUrls.pop().href);
            let maxPage = url.searchParams.get("page");
            for (let i = 2; i <= maxPage; ++i) {
                url.searchParams.set("page", i);
                urls.push(url.href);
            }
        }
        return urls;
    }
    
    extractPartialChapterList(dom) {
        let menu = [...dom.querySelectorAll("#viewchapter .row a")];
        return menu.map(a => util.hyperLinkToChapter(a));
    }

    findContent(dom) {
        return dom.querySelector("#content");
    }

    isHTMLUnknownElement(element) {
        return (element instanceof HTMLUnknownElement);
    }
    //removes the watermark that is wraped in custom xml tag -> no valid HTML tag
    removeUnknownElement(element) {
        for (let node of element.childNodes) {
            if (this.isHTMLUnknownElement(node)) {
                node.remove();
            } else {
                this.removeUnknownElement(node);
            }
        }
    }

    removeUnwantedElementsFromContentElement(content) {
        util.removeElements(content.querySelectorAll("div.box-ads"));
        this.removeUnknownElement(content);
        super.removeUnwantedElementsFromContentElement(content);
    }

    extractSubject(dom) {
        let tags = ([...dom.querySelectorAll("div.fiction-info span.tags .label")]);
        return tags.map(e => e.textContent.trim()).join(", ");
    }

    extractTitleImpl(dom) {
        return dom.querySelector(".detail-post h2");
    }

    extractAuthor(dom) {
        return dom.querySelector(".author a")?.textContent ?? super.extractAuthor(dom);
    }

    findChapterTitle(dom) {
        return dom.querySelector(".chapter-title");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, ".book");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll(".m-desc .inner")];
    }
}
