"use strict";

parserFactory.register("www.8muses.com", function() { return new EightMusesParser(); });
parserFactory.register("comics.8muses.com", function() { return new EightMusesParser(); });

class EightMusesParserImageCollector extends ImageCollector {
    constructor() {
        super();
    }

    initialUrlToTry(imageInfo) {
        return imageInfo.sourceUrl.replace(/\/th\//, "/fl/");
    }
}

class EightMusesParser extends Parser {
    constructor() {
        super(new EightMusesParserImageCollector());
    }

    async getChapterUrls(dom) {
        return [...dom.querySelectorAll("div.gallery a")]
            .map(link => util.hyperLinkToChapter(link))
            .filter(c => !util.isNullOrEmpty(c.title));
    }

    findContent(dom) {
        let content = dom.querySelector("div#content");
        // this.removeOldPages(content);
        for (let i of content.querySelectorAll("img")) {
            if (i.src === "") {
                i.src = i.getAttribute("data-src");
            }
        }
        return content;
    }

    removeOldPages(content) {
        for (let a of [...content.querySelectorAll("a")]) {
            let path = a.href.split("/");
            let file = parseInt(path[path.length - 1]);
            if (file < 63) {
                a.remove();
            }
        }
    }

    findCoverImageUrl() {
        return null;
    }
}
