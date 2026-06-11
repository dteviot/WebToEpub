"use strict";

parserFactory.register("deviantart.com", () => new DeviantArtParser());

class DeviantArtParser extends Parser {
    constructor() {
        super();
    }

    getChapterUrls(dom) {
        let chapters = [...dom.querySelectorAll("div.folderview-art a.torpedo-thumb-link")]
            .map(DeviantArtParser.linkToChapter);
        return Promise.resolve(chapters);
    }

    static linkToChapter(link) {
        return {
            sourceUrl:  link.href,
            title: link.href.split("/").pop(),
            newArc: null
        };
    }

    findContent(dom) {
        let content = dom.querySelector("div.dev-view-deviation");
        if (content != null) {
            DeviantArtParser.removeUnwantedImages(content);
        }
        return content;
    }

    static removeUnwantedImages(content) {
        let images = [...content.querySelectorAll("img")];
        if (1 === images.length1) {
            return;
        }
        let wanted = content.querySelector("img.dev-content-full");
        if (wanted === null) {
            wanted = images[0];
        }
        for (let i of images) {
            i.remove();
        }
        content.appendChild(wanted);
    }

    extractTitleImpl(dom) {
        return dom.querySelector("div.folderview-top h1");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector("a.username");
        return (authorLabel === null) ? super.extractAuthor(dom) : authorLabel.textContent;
    }
}
