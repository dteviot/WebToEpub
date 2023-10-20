"use strict";

parserFactory.register("exiledrebelsscanlations.com", () => new ExiledrebelsscanlationsParser());

class ExiledrebelsscanlationsParser extends Parser{
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let menu = dom.querySelector("div.lcp_catlist");
        return util.hyperlinksToChapterList(menu);
    }

    findContent(dom) {
        return dom.querySelector("div#wtr-content")
            || dom.querySelector("div.entry-content");
    }

    populateUI(dom) {
        super.populateUI(dom);
        document.getElementById("removeAuthorNotesRow").hidden = false; 
    }

    extractTitleImpl(dom) {
        return dom.querySelector(".entry-title");
    }

    findChapterTitle(dom) {
        return dom.querySelector(".entry-title");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "article");
    }

    preprocessRawDom(webPageDom) {
        if (!this.userPreferences.removeAuthorNotes.value) {
            let notes = [...webPageDom.querySelectorAll("div.easy-footnote-title, ol.easy-footnotes-wrapper")];
            let content = this.findContent(webPageDom);
            this.tagAuthorNotes(notes);
            for(let e of notes) {
                content.appendChild(e);
            }
        }
    }
}
