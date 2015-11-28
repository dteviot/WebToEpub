/*
  Parses files on archiveofourown.net
*/
"use strict";

function FanFictionParser() {
}

// Make FanFictionParser inherit from Parser
FanFictionParser.prototype = Object.create(Parser.prototype);
FanFictionParser.prototype.constructor = FanFictionParser;

FanFictionParser.prototype.getChapterUrls = function (dom) {
    let that = this;

    let baseUrl = that.getBaseUrl(dom);
    let chaptersElement = that.getElement(dom, "select", e => (e.id === "chap_select") );
    if (chaptersElement.length === 0) {
        return new Array();
    }

    return that.getElements(chaptersElement, "option", e => true)
        .map(function (option) { return that.optionToChapterInfo(baseUrl, option) });
};

FanFictionParser.prototype.optionToChapterInfo = function (baseUrl, optionElement) {
    // constructing the URL is a bit complicated as the value is not final part of URL.
    let relativeUrl = "../" + optionElement.getAttribute("value");
    let pathNodes = baseUrl.split("/");
    relativeUrl = relativeUrl + "/" + pathNodes[pathNodes.length - 1];
    let url = new Util().resolveRelativeUrl(baseUrl, relativeUrl);
    return {
        sourceUrl:  url,
        title: optionElement.innerText
    };
};

// extract the node(s) holding the story content
FanFictionParser.prototype.extractContent = function (dom) {
    return this.getElement(dom, "div", e => (e.className === "storytext xcontrast_txt nocopy") );
};

FanFictionParser.prototype.extractTextFromProfile = function(dom, tag) {
    let profile = this.getElement(dom, "div", e => (e.id === "profile_top") );
    return this.getElement(profile, tag, e => true ).innerText.trim();
};

FanFictionParser.prototype.extractTitle = function(dom) {
    return this.extractTextFromProfile(dom, "b");
};

FanFictionParser.prototype.extractAuthor = function(dom) {
    return this.extractTextFromProfile(dom, "a");
};

FanFictionParser.prototype.extractLanguage = function(dom) {
    // not really available in HTML, so just return constant
    return "en";
};

