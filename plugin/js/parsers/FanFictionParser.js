/*
  Parses files on www.fanfiction.net
*/
"use strict";

class FanFictionParser extends Parser {
    constructor() {
        super();
    }
}

parserFactory.register("www.fanfiction.net", function() { return new FanFictionParser() });

// fictionpress.com has same format as fanfiction.net
parserFactory.register("www.fictionpress.com", function() { return new FanFictionParser() });

FanFictionParser.prototype.getChapterUrls = function (dom) {
    let that = this;
    let baseUrl = that.getBaseUrl(dom);
    let chaptersElement = that.getElement(dom, "select", e => (e.id === "chap_select") );
    if (chaptersElement === null) {
        // no list of chapters found, assume it's a single chapter story
        return Promise.resolve(that.singleChapterStory(baseUrl, dom));
    } else {
        return Promise.resolve(that.getElements(chaptersElement, "option").map(option => that.optionToChapterInfo(baseUrl, option)));
    }
};

FanFictionParser.prototype.optionToChapterInfo = function (baseUrl, optionElement) {
    // constructing the URL is a bit complicated as the value is not final part of URL.
    let relativeUrl = "../" + optionElement.getAttribute("value");
    let pathNodes = baseUrl.split("/");
    relativeUrl = relativeUrl + "/" + pathNodes[pathNodes.length - 1];
    let url = util.resolveRelativeUrl(baseUrl, relativeUrl);
    return {
        sourceUrl:  url,
        title: optionElement.innerText
    };
};

// find the node(s) holding the story content
FanFictionParser.prototype.findContent = function (dom) {
    return this.getElement(dom, "div", e => (e.className === "storytext xcontrast_txt nocopy") );
};

FanFictionParser.prototype.extractTextFromProfile = function(dom, tag) {
    let profile = this.getElement(dom, "div", e => (e.id === "profile_top") );
    return this.getElement(profile, tag).innerText.trim();
};

FanFictionParser.prototype.extractTitle = function(dom) {
    return this.extractTextFromProfile(dom, "b");
};

FanFictionParser.prototype.extractAuthor = function(dom) {
    return this.extractTextFromProfile(dom, "a");
};

