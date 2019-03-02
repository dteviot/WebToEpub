/*
  parses lightnovelbastion.com
*/
"use strict";

parserFactory.register("lightnovelbastion.com", function() { return new LightNovelBastionParser() });

class LightNovelBastionParser extends Parser {
    constructor() {
        super();
    }

    getChapterUrls(dom) {
        let menu = this.findContent(dom);
        return Promise.resolve(util.hyperlinksToChapterList(menu).reverse());
    }

    findContent(dom) {
        return dom.querySelector("section");
    }

    findChapterTitle(dom) {
        let titleDiv = dom.createElement("div");
        let titleText = dom.title;
        if (titleText !== "") {
            let title = dom.createElement("h1");
            title.appendChild(dom.createTextNode(titleText));
            titleDiv.appendChild(title);
        };
        let subtitle = dom.querySelector("header#releases h2");
        if (subtitle !== null) {
            titleDiv.appendChild(subtitle);
        }
        return titleDiv;
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "article span.image");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("article.container header")];
    }
}
