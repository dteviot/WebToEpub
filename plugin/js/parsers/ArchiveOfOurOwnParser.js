/*
  Parses files on archiveofourown.net
*/
"use strict";

function ArchiveOfOurOwnParser() {
}

// Make ArchiveOfOurOwnParser inherit from Parser
ArchiveOfOurOwnParser.prototype = Object.create(Parser.prototype);
ArchiveOfOurOwnParser.prototype.constructor = ArchiveOfOurOwnParser;

ArchiveOfOurOwnParser.prototype.getEpubMetaInfo = function (dom){
    let that = this;
    let metaInfo = new EpubMetaInfo();
    metaInfo.uuid = dom.baseURI;
    metaInfo.title = that.extractTitle(dom);
    metaInfo.author = that.extractAuthor(dom);
    metaInfo.language = that.extractLanguage(dom);
    return metaInfo;
};

ArchiveOfOurOwnParser.prototype.getChapterUrls = function (dom) {
    let that = this;

    let baseUrl = Array.prototype.slice.apply(dom.getElementsByTagName("base"))[0].href;
    let chaptersElement = that.getElements(dom, "li", e => (e.className === "chapter") );
    if (chaptersElement.length === 0) {
        return new Array();
    }

    return that.getElements(dom, "option", e => true)
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

ArchiveOfOurOwnParser.prototype.makeChapterDoc = function(dom) {
    let that = this;
    let util = new Util();
    let doc = util.createEmptyXhtmlDoc();
    util.addToDocBody(doc, that.extractContent(dom));
    return doc;
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

