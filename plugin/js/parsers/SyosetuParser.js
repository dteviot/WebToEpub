"use strict";

parserFactory.register("ncode.syosetu.com", () => new SyosetuParser());

class SyosetuParser extends Parser{
    constructor() {
        super();
    }

    getChapterUrls(dom) {
        let menu = dom.querySelector("div.index_box");
        return Promise.resolve(util.hyperlinksToChapterList(menu));
    };

    findContent(dom) {
        return dom.querySelector("div#novel_honbun");
    };

    extractTitleImpl(dom) {
        return dom.querySelector("p.novel_title");
    };

    extractAuthor(dom) {
        let authorLabel = dom.querySelector("div.novel_writername a");
        return (authorLabel === null) ? super.extractAuthor(dom) : authorLabel.textContent;
    };

    findChapterTitle(dom) {
        let element = dom.querySelector("p.novel_subtitle");
        return (element === null) ? null : element.textContent;
    }
}
