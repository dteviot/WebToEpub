/*
  Parses files on archiveofourown.net
*/
"use strict";

function ArchiveOfOurOwnParser() {
    let that = this;
}

ArchiveOfOurOwnParser.prototype = {
    getEpubMetaInfo: function (dom) {
        let that = this;
        let metaInfo = new EpubMetaInfo();
        metaInfo.uuid = dom.baseURI;
        metaInfo.title = that.extractTitle(dom);
        metaInfo.author = that.extractAuthor(dom);
        metaInfo.language = that.extractLanguage(dom);
        return metaInfo;
    },

    getChapterUrls: function (dom) {
        let that = this;

        let baseUrl = Array.prototype.slice.apply(dom.getElementsByTagName("base"))[0].href;
        let chaptersElement = Array.prototype.slice.apply(dom.getElementsByTagName("li"))
           .filter(function (element) { return element.className === "chapter" });
        if (chaptersElement.length === 0) {
            return new Array();
        }

        return Array.prototype.slice.apply(chaptersElement[0].getElementsByTagName("option"))
            .map(function (option) { return that.optionToChapterInfo(baseUrl, option) });
    },

    optionToChapterInfo: function (baseUrl, optionElement) {
        let relativeUrl = optionElement.getAttribute("value");
        return {
            sourceUrl: new Util().resolveRelativeUrl(baseUrl, relativeUrl) + '?view_adult=true',
            title: optionElement.innerText
        };
    },

    // extract the node(s) holding the story content
    extractContent: function (dom) {
        return Array.prototype.slice.apply(dom.getElementsByTagName("div"))
            .filter(function (element) { return element.className === "userstuff module" })
            .pop();
    },

    makeChapterDoc: function(dom) {
        let that = this;
        let util = new Util();
        let doc = util.createEmptyXhtmlDoc();
        util.addToDocBody(doc, that.extractContent(dom));
        return doc;
    },

    extractTitle: function(dom) {
        let that = this;
        let element = that.getElement(dom, "h2", e => (e.className === "title heading") );
        return element.innerText.trim();
    },

    extractAuthor: function(dom) {
        let that = this;
        let element = that.getElement(dom, "a", e => (e.className === "login author") );
        return element.innerText.trim();
    },

    extractLanguage: function(dom) {
        let that = this;
        let element = that.getElement(dom, "meta", e => (e.getAttribute("name") === "language") );
        return element.getAttribute("content");
    },

    getElement: function(dom, tagName, filter) {
        let elements = Array.prototype.slice.apply(dom.getElementsByTagName(tagName)).filter(filter);
        return (elements.length === 0) ? null : elements[0];
    },
}
