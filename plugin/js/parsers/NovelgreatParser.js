"use strict";

//dead url/ parser
parserFactory.register("novelgreat.net", function() { return new NovelgreatParser(); });

class NovelgreatParser extends NovelfullParser {
    constructor() {
        super();
    }

    getUrlsOfTocPages(dom) {
        let link = [...dom.querySelectorAll("ul.pagination li:not(.page-nav) a")].pop();
        let urls = [];
        if (link != null) {
            let limit = link.href.split("=")[1];
            limit = parseInt(limit);
            for (let i = 1; i <= limit; ++i) {
                urls.push(NovelfullParser.buildUrlForTocPage(link, i));
            }
        }
        return urls;
    }

    findContent(dom) {
        return dom.querySelector("div#chapter-c");
    }
}
