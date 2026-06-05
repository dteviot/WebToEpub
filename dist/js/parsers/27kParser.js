"use strict";

parserFactory.register("27k.net", () => new _27kParser());

class _27kParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let menu = dom.querySelector("#chapterlist");
        return util.hyperlinksToChapterList(menu);
    }

    findContent(dom) {
        return dom.querySelector(".txtnav");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("#article_list_content h3");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector("#article_list_content label a");
        return authorLabel?.textContent ?? super.extractAuthor(dom);
    }

    extractLanguage() {
        return "zh";
    }

    removeUnwantedElementsFromContentElement(element) {
        util.removeChildElementsMatchingSelector(element, ".baocuo, .bottom-ad");
        super.removeUnwantedElementsFromContentElement(element);
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, ".imgbox");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("#article_list_content ol")];
    }
}
