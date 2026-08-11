"use strict";

parserFactory.register("athenatls.com", () => new AthenaTlsParser());

class AthenaTlsParser extends Parser { 
    constructor() {
        super();

        this.minimumThrottle = 3000;
    }

    async getChapterUrls(dom) {
        return [...dom.querySelectorAll("a.nv-mokuji__row")]
            .map(a => {
                // Remove other unnecessary `span` elements in `a` element.
                a.innerText = a.querySelector("span.nv-mokuji__t").innerText;
                return a;
            })
            .map(a => util.hyperLinkToChapter(a));
    }

    findContent(dom) {
        return dom.querySelector("article#chapter-content");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1.nv-title");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector("div.nv-byline span b");

        return authorLabel?.textContent ?? super.extractAuthor(dom);
    }

    extractSubject(dom) {
        let tags = [...dom.querySelectorAll(".nv-genres a")];
        return tags.map(e => {
            // Remove kanji (?) on the first Genre in Genre List
            if (e.className === "lead") {
                // Use Regex pattern in case having more than one kanji in Japanese brackets.
                e.textContent = e.textContent.replace(/【[^】]*】/,"");
            }
            return e.textContent.trim();
        }).join(", ");
    }
    
    extractDescription(dom) {
        return dom.querySelector("section.nv-syn").textContent.trim();
    }
   
    findCoverImageUrl(dom) {
        let div = dom.querySelector("div.nv-front__img img");
        let imgUrl = div?.src || null;

        return imgUrl;
    }
}
