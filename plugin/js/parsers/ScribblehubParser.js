"use strict";

parserFactory.register("scribblehub.com", () => new ScribblehubParser());

class ScribblehubParser extends Parser {
    constructor() {
        super();
        this.minimumThrottle = 5000;
    }

    async getChapterUrls(dom, chapterUrlsUI) {
        let baseUrl = dom.baseURI;
        let nextTocIndex = 1;
        let numChapters = parseInt(dom.querySelector("span.cnt_toc").textContent);
        let nextTocPageUrl = function(_dom, chapters, lastFetch) {
            // site has bug, sometimes, won't return chapters, so 
            // don't loop forever when this happens
            return ((chapters.length < numChapters) && (0 < lastFetch.length))
                ? `${baseUrl}?toc=${++nextTocIndex}`
                : null;
        };
        let saveThrottle = this.minimumThrottle;
        this.minimumThrottle = 0;
        let chapters = (await this.walkTocPages(dom,
            ScribblehubParser.getChapterUrlsFromTocPage,
            nextTocPageUrl,
            chapterUrlsUI
        )).reverse();
        this.minimumThrottle = saveThrottle;
        return chapters;
    }

    static getChapterUrlsFromTocPage(dom) {
        return [...dom.querySelectorAll("a.toc_a")]
            .map(a => util.hyperLinkToChapter(a));
    }

    findContent(dom) {
        return dom.querySelector("div.fic_row, div#chp_raw");
    }

    populateUIImpl() {
        document.getElementById("removeAuthorNotesRow").hidden = false;
    }

    extractTitleImpl(dom) {
        return dom.querySelector("div.fic_title");
    }

    extractAuthor(dom) {
        let author = dom.querySelector("span.auth_name_fic");
        return (author === null) ? super.extractAuthor(dom) : author.textContent;
    }
    
    extractSubject(dom) {
        let selector = "[property='genre']";
        if (!document.getElementById("lesstagsCheckbox").checked) {
            selector += ", .stag";
        }
        let tags = [...dom.querySelectorAll(selector)];
        return tags.map(e => e.textContent.trim()).join(", ");
    }
    
    extractDescription(dom) {
        return dom.querySelector("div [property='description']").textContent.trim();
    }

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
