"use strict";

parserFactory.register("systemtranslation.com", () => new SystemTranslationParser());

class SystemTranslationParser extends WordpressBaseParser{
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        // guess the chapters
        let lastPage = dom.querySelector("article div.container-fluid .entry-title a");
        let title = lastPage.textContent.trim();
        let url = lastPage.href;
        let index = title.lastIndexOf(" ");
        let titlePrefix = title.substring(0, index + 1);
        let maxChapterId = parseInt(title.substring(index + 1));
        index = url.lastIndexOf("-");
        let urlPrefix = url.substring(0, index + 1);
        var chapters = []
        for(let i = 1; i <= maxChapterId; ++i) {
            chapters.push({
                sourceUrl:  urlPrefix + i,
                title: titlePrefix + i,
                newArc: null
            });
        }
        return chapters;
    }

    removeUnwantedElementsFromContentElement(element) {
        util.removeChildElementsMatchingCss(element, "div.cb_p6_patreon_button");
        super.removeUnwantedElementsFromContentElement(element);
    }

    getInformationEpubItemChildNodes(dom) {
        var node = dom.querySelector("div.entry-content");
        return node === null ? [] : [node];
    }

    cleanInformationNode(node) {
        util.removeChildElementsMatchingCss(node, ".code-block, .container-fluid, .sharedaddy");
    }
}
