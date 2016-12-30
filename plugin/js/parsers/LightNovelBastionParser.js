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
        let chapters = [];
        if (menu !== null) {
            chapters = util.hyperlinksToChapterList(menu);
        }
        return Promise.resolve(chapters.reverse());
    }

    findContent(dom) {
        return util.getElement(dom, "section");
    }

    findChapterTitle(dom) {
        let titleDiv = dom.createElement("div");
        let titleText = dom.title;
        if (titleText !== "") {
            let title = dom.createElement("h1");
            title.appendChild(dom.createTextNode(titleText));
            titleDiv.appendChild(title);
        };
        let header = util.getElement(dom, "header", e => e.id === "releases");
        if (header !== null) {
            let subtitle = util.getElement(header, "h2");
            if (subtitle !== null) {
                titleDiv.appendChild(subtitle);
            }
        }
        return titleDiv;
    }

    populateUI(dom) {
        super.populateUI(dom);
        CoverImageUI.showCoverImageUrlInput(true);
    }
}
