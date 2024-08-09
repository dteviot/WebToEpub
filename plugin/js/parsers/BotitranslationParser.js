"use strict";

parserFactory.register("botitranslation.com", () => new BotitranslationParser());

class BotitranslationParser extends Parser{
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let menu = dom.querySelector("#tocItems");
        return util.hyperlinksToChapterList(menu);
    }

    findContent(dom) {
        return Parser.findConstrutedContent(dom);
    }

    extractTitleImpl(dom) {
        return dom.querySelector(".book-name");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector(".author-name");
        return authorLabel?.textContent ?? super.extractAuthor(dom);
    }

    removeUnwantedElementsFromContentElement(element) {
        util.removeChildElementsMatchingCss(element, "p > br");
        super.removeUnwantedElementsFromContentElement(element);
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, ".cover-container");
    }

    async fetchChapter(url) {
        let restUrl = this.toRestUrl(url);
        let json = (await HttpClient.fetchJson(restUrl)).json;
        return this.buildChapter(json, url);
    }

    toRestUrl(url) {
        let leaves = url.split("/");
        let id = leaves[leaves.length - 1].split("-")[0];
        return "https://api.mystorywave.com/story-wave-backend/api/v1/content/chapters/" + id;
    }

    buildChapter(json, url) {
        let newDoc = Parser.makeEmptyDocForContent(url);
        let title = newDoc.dom.createElement("h1");
        title.textContent = json.data.title;
        newDoc.content.appendChild(title);
        let content = new DOMParser().parseFromString(json.data.content, "text/html");
        for(let n of [...content.body.childNodes]) {
            newDoc.content.appendChild(n);
        }
        return newDoc.dom;
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("#about-panel.synopsis")];
    }
}
