"use strict";

parserFactory.register("jjwxc.net", () => new JjwxcParser());

class JjwxcParser extends Parser{
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        return [...dom.querySelectorAll("table.cytable a")]
            .filter(a => this.fixupVip(a))
            .map(a => util.hyperLinkToChapter(a));
    }

    fixupVip(link) {
        let rel = link.getAttribute("rel");
        if (rel) {
            link.href = rel;
        }
        return link.href.includes("onebook")
            ? link
            : null;
    }

    findContent(dom) {
        return dom.querySelector("div.novelbody");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector("span[itemprop='author']");
        return authorLabel?.textContent ?? super.extractAuthor(dom);
    }

    extractLanguage() {
        return "cn";
    }

    removeUnwantedElementsFromContentElement(element) {
        element.querySelector("#report_box")?.parentElement?.remove();
        util.removeChildElementsMatchingCss(element, ".readsmall, #note_danmu_wrapper, div[align='right']");
        for(let div of element.querySelectorAll("div")) {
            div.style = null;
        }
        super.removeUnwantedElementsFromContentElement(element);
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.smallreadbody");
    }

    async fetchChapter(url) {
        let options = ({makeTextDecoder: () => new TextDecoder("gb18030")});
        return (await HttpClient.wrapFetch(url, options)).responseXML;
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div#novelintro")];
    }
}
