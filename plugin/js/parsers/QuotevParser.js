"use strict";

parserFactory.register("quotev.com", () => new QuotevParser());

class QuotevParser extends Parser{
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let baseUrl = dom.baseURI;
        if (!baseUrl.endsWith("/")) {
            baseUrl += "/";
        }
        let select = dom.querySelector("div#footer_pages select");
        return [...select.querySelectorAll("option")]
            .map(o => this.optionToChapter(o, baseUrl));
    }

    optionToChapter(option, baseUrl) {
        return {
            sourceUrl:  baseUrl + option.getAttribute("value"),
            title: option.textContent,
        }
    }

    findContent(dom) {
        return dom.querySelector("div#quizResArea");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("div#quizHeaderTitle h1");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector("div.quizAuthorList a");
        return (authorLabel === null) ? super.extractAuthor(dom) : authorLabel.textContent;
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div#quizResArea");
    }
}
