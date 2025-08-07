"use strict";

parserFactory.register("erofus.com", function() { return new ErofusParser(); });

class ErofusParserImageCollector extends ImageCollector {
    constructor() {
        super();
    }

    selectImageUrlFromImagePage(dom) {
        let img = dom.querySelector("div#picture-full img");
        if (img != null)
        {
            return dom.querySelector("div#picture-full img").src;
        }
    }
}

class ErofusParser extends Parser {
    constructor() {
        super(new ErofusParserImageCollector());
    }

    async getChapterUrls(dom) {
        return [...dom.querySelectorAll("div a div.thumbnail")]
            .map(div => util.hyperLinkToChapter(div.parentElement))
            .filter(c => !util.isNullOrEmpty(c.title));
    }

    findContent(dom) {
        return dom.querySelector("div.content");
    }

    findCoverImageUrl() {
        return null;
    }
}
