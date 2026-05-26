"use strict";

parserFactory.register("pawread.com", () => new PawreadParser());

class PawreadParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let rootUrl = dom.baseURI;
        let items = [...dom.querySelectorAll("div.filtr-item .item-box")];
        return items.map(i => this.itemToChapter(i, rootUrl));
    }

    itemToChapter(item, rootUrl) {
        let onclick = item.getAttribute("onclick");
        let pathTip = "";
        if (onclick) {
            let parts = onclick.split("'");
            if (parts.length > 1) pathTip = parts[1];
        }
        if (!pathTip) {
            let link = item.querySelector("a") || item;
            pathTip = link.getAttribute("href") || "";
            if (pathTip.startsWith(rootUrl)) {
                pathTip = pathTip.substring(rootUrl.length);
            }
            if (pathTip.endsWith(".html")) {
                pathTip = pathTip.substring(0, pathTip.length - 5);
            }
        }
        return ({
            sourceUrl:  rootUrl + pathTip + ".html",
            title: item.querySelector(".c_title")?.textContent?.trim() || item.textContent.trim(),
        });
    }

    findContent(dom) {
        return dom.querySelector("#chapter_item");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1");
    }

    findChapterTitle(dom) {
        return dom.querySelector("h3");
    }

    findCoverImageUrl(dom) {
        let div = dom.querySelector(".comic-view [style*=background-image]");
        return util.extractUrlFromBackgroundImage(div);
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("p.txtDesc")];
    }
}
