"use strict";

parserFactory.register("scribblehub.com", () => new ScribblehubParser());

class ScribblehubParser extends Parser {
    constructor() {
        super();
        this.minimumThrottle = 3000;
    }

    async getChapterUrls(dom, chapterUrlsUI) {
        let baseUrl = dom.baseURI;
        let nextTocIndex = 1;
        let numChapters = parseInt(dom.querySelector("span.cnt_toc").textContent);
        let nextTocPageUrl = function (_dom, chapters, lastFetch) {
            // site has bug, sometimes, won't return chapters, so 
            // don't loop forever when this happens
            return ((chapters.length < numChapters) && (0 < lastFetch.length))
                ? `${baseUrl}?toc=${++nextTocIndex}`
                : null;
        };

        return (await this.walkTocPages(dom,
            ScribblehubParser.getChapterUrlsFromTocPage,
            nextTocPageUrl,
            chapterUrlsUI
        )).reverse();
    };

    static getChapterUrlsFromTocPage(dom) {
        return [...dom.querySelectorAll("a.toc_a")]
            .map(a => util.hyperLinkToChapter(a))
    }

    findContent(dom) {
        return dom.querySelector("div.fic_row, div#chp_raw");
    };

    populateUI(dom) {
        super.populateUI(dom);
        document.getElementById("removeAuthorNotesRow").hidden = false;
    }

    extractTitleImpl(dom) {
        return dom.querySelector("div.fic_title");
    };

    extractAuthor(dom) {
        let author = dom.querySelector("span.auth_name_fic");
        return (author === null) ? super.extractAuthor(dom) : author.textContent;
    };

    findChapterTitle(dom) {
        return dom.querySelector("div.chapter-title").textContent;
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.fic_image");
    }

    preprocessRawDom(webPageDom) {
        this.tagAuthorNotesBySelector(webPageDom, ".wi_authornotes", ".wi_news");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.fic_row.details")];
    }
}
