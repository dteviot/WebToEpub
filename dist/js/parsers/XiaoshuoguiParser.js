"use strict";

//dead url/ parser
parserFactory.register("xiaoshuogui.com", () => new XiaoshuoguiParser());

class XiaoshuoguiParser extends Parser {
    constructor() {
        super();
    }

    getChapterUrls(dom) {
        let menu = dom.querySelector("#chapterList");
        return Promise.resolve(util.hyperlinksToChapterList(menu));
    }

    findContent(dom) {
        return dom.querySelector("div#mlfy_main_text");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("div.d_title h1");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector("span.p_author a");
        return (authorLabel === null) ? super.extractAuthor(dom) : authorLabel.textContent;
    }

    extractLanguage() {
        return "zh";
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div#bookinfo");
    }

    fetchChapter(url) {
        // site does not tell us gb18030 is used to encode text
        return HttpClient.wrapFetch(url, this.makeOptions()).then(function(xhr) {
            return Promise.resolve(xhr.responseXML);
        });
    }

    makeOptions() {
        return ({
            makeTextDecoder: () => new TextDecoder("gb18030")
        });
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div#bookinfo div.bookright")];
    }

    cleanInformationNode(node) {
        util.removeChildElementsMatchingSelector(node, "script");
    }
}
