"use strict";

parserFactory.register("shubaow.net", () => new ShubaowParser());

class ShubaowParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let links = [...dom.querySelectorAll("div#list dd a")];
        return this.removeDuplicates(links)
            .map(a => util.hyperLinkToChapter(a));
    }

    removeDuplicates(links) {
        let unique = new Set();
        let dedup = [];
        while (0 < links.length) {
            let link = links.pop();
            if (!unique.has(link.href)) {
                dedup.push(link);
                unique.add(link.href);
            }
        }
        return dedup.reverse();
    }

    findContent(dom) {
        return dom.querySelector("div#content");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("div#info h1");
    }

    extractLanguage() {
        return "cn";
    }

    findChapterTitle(dom) {
        return dom.querySelector("div.bookname h1").textContent;
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div#fmimg");
    }

    async fetchChapter(url) {
        return (await HttpClient.wrapFetch(url, this.makeOptions())).responseXML;
    }

    makeOptions() {
        return ({
            makeTextDecoder: () => new TextDecoder("gbk")
        });
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div#intro")];
    }

    cleanInformationNode(node) {
        util.removeChildElementsMatchingSelector(node, "script, .adsbygoogle");
    }
}
