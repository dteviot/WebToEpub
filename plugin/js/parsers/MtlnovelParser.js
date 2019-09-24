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

    getChapterUrls(dom) {
        let tocUrl = dom.baseURI + "chapter-list/";
        return HttpClient.wrapFetch(tocUrl).then(
            (xhr) => [...xhr.responseXML.querySelectorAll("div.ch-list a.ch-link")]
                .map(a => util.hyperLinkToChapter(a))
        );
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
        util.removeChildElementsMatchingCss(element, ".crumbs, .chapter-nav, .lang-btn, .sharer" + original);
        super.removeUnwantedElementsFromContentElement(element);
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div#panelnovelinfo div.desc")];
    }
}
