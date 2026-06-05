"use strict";

parserFactory.register("marx2mao.com", () => new Marx2maoParser());

class Marx2maoParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let menu = this.findContent(dom);
        return util.hyperlinksToChapterList(menu);
    }

    findContent(dom) {
        return dom.querySelector("body");
    }
}
