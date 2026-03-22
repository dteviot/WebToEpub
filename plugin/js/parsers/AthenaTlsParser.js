"use strict";

parserFactory.register("athenatls.com", () => new AthenaTlsParser());

class AthenaTlsParser extends Parser { 
    constructor() {
        super();

        this.minimumThrottle = 3000;
    }

    async getChapterUrls(dom) {
        return [...dom.querySelectorAll(".volume-container a")]
            .map(a => util.hyperLinkToChapter(a));
    }

    findContent(dom) {
        return dom.querySelector("div.chapter-text-content");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1.novel-main-title");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector("span.creator-name");

        return authorLabel?.textContent ?? super.extractAuthor(dom);
    }

    extractSubject(dom) {
        let tags = [...dom.querySelectorAll(".genre-tag")];
        return tags.map(e => e.textContent.trim()).join(", ");
    }
    
    extractDescription(dom) {
        return dom.querySelector("div.synopsis-content").textContent.trim();
    }
   
    findCoverImageUrl(dom) {
        let div = dom.querySelector("div.novel-cover-large");
        
        let re = /(^url)|[("|")]/g;
        let imgUrl = div?.style.backgroundImage.replace(re, "") || null;

        return imgUrl;
    }
}
