"use strict";

parserFactory.registerRule(
    function(url) {
        return AdultfanfictionParser.isAdultFanFiction(url) * 0.9;
    },
    function() { return new AdultfanfictionParser() }
);

class AdultfanfictionParser extends Parser{
    constructor() {
        super();
    }

    static isAdultFanFiction(url) {
        return (util.extractHostName(url).indexOf(".adult-fanfiction.org") != -1)
    }

    async getChapterUrls(dom) {
        let menu = dom.querySelector("ul#dropdown1");
        return util.hyperlinksToChapterList(menu);
    }

    findContent(dom) {
        return dom.querySelector("#contentdata");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h4");
    }

    removeUnwantedElementsFromContentElement(element) {
        util.removeChildElementsMatchingCss(element, "ul#dropdown1, a.dropdown-trigger, ul.pagination");
        super.removeUnwantedElementsFromContentElement(element);
    }
}
