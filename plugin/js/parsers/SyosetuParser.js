"use strict";

parserFactory.register("ncode.syosetu.com", () => new SyosetuParser());
parserFactory.register("novel18.syosetu.com", () => new SyosetuParser());

class SyosetuParser extends Parser{
    constructor() {
        super();
    }

    getChapterUrls(dom) {
        let menu = dom.querySelector("div.index_box")
            || dom.querySelector("div.novel_sublist")
        return Promise.resolve(util.hyperlinksToChapterList(menu));
    };

    findContent(dom) {
        return dom.querySelector("div#novel_honbun");
    };

    extractTitleImpl(dom) {
        return dom.querySelector(".novel_title");
    };

    extractAuthor(dom) {
        let authorLabel = dom.querySelector("div.novel_writername a");
        return (authorLabel === null) ? super.extractAuthor(dom) : authorLabel.textContent;
    };

    findChapterTitle(dom) {
        let element = dom.querySelector(".novel_subtitle");
        return (element === null) ? null : element.textContent;
    }
}
