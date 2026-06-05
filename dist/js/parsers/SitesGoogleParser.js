"use strict";

parserFactory.register("sites.google.com", () => new SitesGoogleParser());

class SitesGoogleParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let menu = dom.querySelector("ul[role='navigation']");
        if (menu === null) {
            menu = this.findContent(dom);
        }
        return util.hyperlinksToChapterList(menu);
    }

    findContent(dom) {
        return dom.querySelector("div[role='main']");
    }
}
