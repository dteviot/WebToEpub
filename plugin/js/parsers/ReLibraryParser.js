"use strict";

parserFactory.register("re-library.com", function() { return new ReLibraryParser() });

class ReLibraryParser extends WordpressBaseParser{
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        return [...dom.querySelectorAll("li.page_item a")]
            .map(a => util.hyperLinkToChapter(a))
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.entry-content >  p")];
    }
}
