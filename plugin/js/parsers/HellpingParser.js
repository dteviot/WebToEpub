/*
  parses hellping.org
*/
"use strict";

//dead url/ parser
parserFactory.register("hellping.org", function() { return new HellpingParser(); });

class HellpingParser extends WordpressBaseParser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let tocEntries = [...dom.querySelectorAll("div.entry-content a")]
            .filter(a => a.textContent.trim() !== "");
        let menuEntries = [...dom.querySelectorAll("#primary-menu a")];
        return tocEntries.concat(menuEntries)
            .map(a => util.hyperLinkToChapter(a));
    }
}
