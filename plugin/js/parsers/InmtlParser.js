/*
  parses lnmtl.com
*/
"use strict";

parserFactory.register("lnmtl.com", function() { return new InmtlParser() });

class InmtlParser extends Parser {
    constructor() {
        super();
    }

    getChapterUrls(dom) {
        let volumesContainer = dom.getElementById("volumes-container");
        let chapters = [];
        if (volumesContainer !== null) {
            let table = util.getElement(volumesContainer, "table");
            if (table !== null) {
                chapters = util.hyperlinksToChapterList(table);
            }
        }
        return Promise.resolve(chapters);
    }

    extractTitle(dom) {
        let title = util.getElement(dom, "meta", e => (e.getAttribute("property") === "og:title"));
        return (title === null) ? super.extractTitle(dom) : title.getAttribute("content");
    }

    findContent(dom) {
        return util.getElement(dom, "div", e => e.className.startsWith("chapter-body"));
    }

    customRawDomToContentStep(chapter, content) {
        let sentences = util.getElements(content, "sentence");
        for(let s of sentences) {
            if (s.className === "original") {
                s.remove();
            } else {
                let p = s.ownerDocument.createElement("p");
                p.innerText = s.innerText;
                s.parentNode.replaceChild(p, s);
            }
        } 
    }

    populateUI(dom) {
        super.populateUI(dom);
        CoverImageUI.showCoverImageUrlInput(true);
    }
}
