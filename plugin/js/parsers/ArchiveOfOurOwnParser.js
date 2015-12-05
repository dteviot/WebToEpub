/*
  Parses files on archiveofourown.net
*/
"use strict";

function ArchiveOfOurOwnParser() {
}

// Make ArchiveOfOurOwnParser inherit from Parser
ArchiveOfOurOwnParser.prototype = Object.create(Parser.prototype);
ArchiveOfOurOwnParser.prototype.constructor = ArchiveOfOurOwnParser;

ArchiveOfOurOwnParser.prototype.canParse = function (url) {
    return (this.extractHostName(url) === "archiveofourown.org");
}

ArchiveOfOurOwnParser.prototype.getChapterUrls = function (dom) {
    let that = this;

    let chaptersElement = that.getElement(dom, "li", e => (e.className === "chapter") );
    if (chaptersElement.length === null) {
        return new Array();
    }

    let baseUrl = that.getBaseUrl(dom);
    return that.getElements(chaptersElement, "option")
        .map(function (option) { return that.optionToChapterInfo(baseUrl, option) });
};

ArchiveOfOurOwnParser.prototype.optionToChapterInfo = function (baseUrl, optionElement) {
    let relativeUrl = optionElement.getAttribute("value");
    return {
        sourceUrl: new Util().resolveRelativeUrl(baseUrl, relativeUrl) + '?view_adult=true',
        title: optionElement.innerText
    };
};

// extract the node(s) holding the story content
ArchiveOfOurOwnParser.prototype.extractContent = function (dom) {
    return this.getElement(dom, "div", e => (e.className === "userstuff module") );
};

ArchiveOfOurOwnParser.prototype.extractTitle = function(dom) {
    return this.getElement(dom, "h2", e => (e.className === "title heading") ).innerText.trim();
};

ArchiveOfOurOwnParser.prototype.extractAuthor = function(dom) {
    return this.getElement(dom, "a", e => (e.className === "login author") ).innerText.trim();
};

ArchiveOfOurOwnParser.prototype.extractLanguage = function(dom) {
    return this.getElement(dom, "meta", e => (e.getAttribute("name") === "language") ).getAttribute("content");
};

