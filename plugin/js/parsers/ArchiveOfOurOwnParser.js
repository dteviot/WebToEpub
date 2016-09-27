/*
  Parses files on archiveofourown.net
*/
"use strict";

parserFactory.register("archiveofourown.org", function() { return new ArchiveOfOurOwnParser() });

class ArchiveOfOurOwnParser extends Parser{
    constructor() {
        super();
    }

    getChapterUrls(dom) {
        let that = this;
        let baseUrl = that.getBaseUrl(dom);
        let chaptersElement = util.getElement(dom, "li", e => (e.className === "chapter") );
        if (chaptersElement === null) {
            return Promise.resolve(that.singleChapterStory(baseUrl, dom));
        } else {
            return Promise.resolve(util.getElements(chaptersElement, "option").map(option => that.optionToChapterInfo(baseUrl, option)));
        }
    };

    optionToChapterInfo(baseUrl, optionElement) {
        let relativeUrl = optionElement.getAttribute("value");
        return {
            sourceUrl: util.resolveRelativeUrl(baseUrl, relativeUrl) + "?view_adult=true",
            title: optionElement.innerText
        };
    };

    // find the node(s) holding the story content
    findContent(dom) {
        return util.getElement(dom, "div", 
            e => (e.className === "userstuff module") || e.className.startsWith("storytext")
        );
    };

    extractTitle(dom) {
        return util.getElement(dom, "h2", e => (e.className === "title heading") ).innerText.trim();
    };

    extractAuthor(dom) {
        return util.getElement(dom, "h3", e => (e.className === "byline heading") ).innerText.trim();
    };

    extractLanguage(dom) {
        return util.getElement(dom, "meta", e => (e.getAttribute("name") === "language") ).getAttribute("content");
    };
}
