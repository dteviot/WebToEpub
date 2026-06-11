/*
  parses nanodesu
*/
"use strict";

// nanodesu URLs have hostnames like '*thetranslation.wordpress.com'
parserFactory.registerUrlRule(
    url => util.extractHostName(url).endsWith("thetranslation.wordpress.com"), 
    () => new NanodesuParser()
);

class NanodesuParser extends Parser {
    constructor() {
        super();
    }

    getChapterUrls(dom) {
        let menu = dom.querySelector("ul#nav");
        return Promise.resolve(util.hyperlinksToChapterList(menu));
    }

    findContent(dom) {
        return dom.querySelector("div.page-body");
    }

    findChapterTitle(dom) {
        return dom.querySelector("h2.page-title");
    }

    findParentNodeOfChapterLinkToRemoveAt(link) {
        return util.moveIfParent(link, "p");
    }
}
