"use strict";

// Use one or more of these to specify when the parser is to be used
parserFactory.register("mtlnovel.com", () => new MtlnovelParser());

class MtlnovelParser extends Parser{
    constructor() {
        super();
    }

    populateUI(dom) {
        super.populateUI(dom);
        document.getElementById("removeOriginalRow").hidden = false;
    }

    async getChapterUrls(dom) {
        let url = dom.baseURI;
        if (!url.endsWith("/")) {
            url = url + "/";
        }
        url = url + "chapter-list/";
        let tocDom = (await HttpClient.wrapFetch(url)).responseXML;
        let tocElement = tocDom.querySelector("div.ch-list");
        return util.hyperlinksToChapterList(tocElement).reverse();
    };

    findContent(dom) {
        return dom.querySelector("div.single-page");
    };

    extractTitleImpl(dom) {
        return dom.querySelector(".entry-title");
    };

    removeUnwantedElementsFromContentElement(element) {
        let original = "";
        if (this.userPreferences.removeOriginal.value) {
            original = ", p.cn";
        }
        util.removeChildElementsMatchingCss(element, ".crumbs, .chapter-nav, .lang-btn, .sharer," +
            " amp-embed, .link-title, ol.link-box, a.view-more " + original);
        for(let e of [...element.querySelectorAll("div.post-content")]) {
            e.removeAttribute("[class]");
        }
        super.removeUnwantedElementsFromContentElement(element);
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div#panelnovelinfo div.desc")];
    }
}
