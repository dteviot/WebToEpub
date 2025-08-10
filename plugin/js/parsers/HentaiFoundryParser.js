"use strict";

parserFactory.register("hentai-foundry.com", () => new HentaiFoundryParser());

class HentaiFoundryParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let content = dom.querySelector("#yw0");
        if (content.className === "storiesView") {
            return [];
        } else if (content.className === "galleryView") {
            return this.selectChapterUrls(content, "div.thumbTitle a");
        } else {
            return this.selectChapterUrls(content, "div.boxbody a");
        }
    }

    async selectChapterUrls(content, linkSelector) {
        return [...content.querySelectorAll(linkSelector)]
            .map(a => util.hyperLinkToChapter(a));
    }

    findContent(dom) {
        let content = dom.querySelector("section#viewChapter div.boxbody");
        if (content === null) {
            content = dom.querySelector("section#picBox div.boxbody");
        }
        return content;
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1.titleSemantic");
    }

    extractAuthor(dom) {
        let author = null;
        let label = [...dom.querySelectorAll("td.storyInfo span.label")]
            .filter(l => l.textContent.trim() === "Author");
        if (0 < label.length) {
            author = label[0].parentElement.querySelector("a");
        }
        return (author === null) ? super.extractAuthor(dom) : author.textContent;
    }

    findChapterTitle(dom) {
        return dom.querySelector("h1.titleSemantic");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("td.storyDescript")];
    }

    cleanInformationNode(node) {
        util.removeChildElementsMatchingSelector(node, "div");
        return node;
    }
}
