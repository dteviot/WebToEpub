"use strict";

parserFactory.register("giatocvuongtai.com", () => new GiatocvuongtaiParser());
HttpClient.blockedSites.add("giatocvuongtai.com");


class GiatocvuongtaiParser extends Parser { // eslint-disable-line no-unused-vars
    constructor() {
        super();
    }

    disabled() {
        return UIText.Warning.parserDisabledNotification;
    }

    async getChapterUrls() {
        return [];
    }

    findContent(dom) {
        return dom.body;
    }
}
