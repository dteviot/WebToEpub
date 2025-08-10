/*
*/
"use strict";

//dead url/ parser
parserFactory.register("wuxiaworld.world", () => new WuxiaworldWorldParser());

class WuxiaworldWorldParser extends Parser {
    constructor() {
        super();
    }

    getChapterUrls(dom) {
        let menu = dom.querySelector("div.manga_chapter_list");
        return Promise.resolve(util.hyperlinksToChapterList(menu).reverse());
    }

    findContent(dom) {
        return dom.querySelector("div.list_img");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("div.manga_name h1");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector("div.manga_des a");
        return (authorLabel === null) ? super.extractAuthor(dom) : authorLabel.textContent;
    }

    findChapterTitle(dom) {
        return dom.querySelector("div.manga_view_name h1");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.manga_info_img");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.manga_description")];
    }
}
