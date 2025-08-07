"use strict";

parserFactory.register("re-library.com", function() { return new ReLibraryParser(); });

class ReLibraryParser extends WordpressBaseParser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        return [...dom.querySelectorAll("div.su-accordion div.su-spoiler-content li a")]
            .map(a => util.hyperLinkToChapter(a));
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("#synopsis+div div.su-box-content")];
    }
}
