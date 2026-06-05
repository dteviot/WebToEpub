"use strict";

parserFactory.register("shmtranslations.com", () => new ShmtranslationsParser());

class ShmtranslationsParser extends WordpressBaseParser {
    constructor() {
        super();
    }

    findContent(dom) {
        let content = super.findContent(dom);
        if (content !== null) {
            return content;
        }

        // site changed 2019-10-27.  Look for new content and clean
        content = dom.querySelector("article");
        if (content !== null) {
            ShmtranslationsParser.cleanLaterContent(content);
        }
        return content;
    }

    findChapterTitle(dom) {
        return dom.querySelector(".entry-title");
    }

    static cleanLaterContent(content) {
        let junk = [...content.querySelectorAll("span[style='color: #ffffff;']")]
            .map(s => s.parentElement)
            .filter(p => p.tagName.toLowerCase() === "p")
            .concat([...content.querySelectorAll("footer, div.awac-wrapper")]);
        util.removeElements(junk);
    }
}
