/*
  Parses files on fanfiction.mugglenet.com
*/
"use strict";

class MuggleNetParser extends Parser{
    constructor() {
        super();
    }
}

parserFactory.register("fanfiction.mugglenet.com", function() { return new MuggleNetParser() });

MuggleNetParser.prototype.getChapterUrls = function (dom) {
    let that = this;
    let baseUrl = that.getBaseUrl(dom);
    let chaptersElement = that.getElement(dom, "select", e => (e.getAttribute("name") === "chapter") );
    if (chaptersElement === null) {
        // no list of chapters found, assume it's a single chapter story
        return Promise.resolve(that.singleChapterStory(baseUrl, dom));
    } else {
        return Promise.resolve(that.getElements(chaptersElement, "option").map(option => that.optionToChapterInfo(baseUrl, option)));
    }
};

MuggleNetParser.prototype.optionToChapterInfo = function (baseUrl, optionElement) {
    // constructing the URL is a bit complicated as the value is not final part of URL.
    let chapterId = optionElement.getAttribute("value");
    let searchString = "chapter=";
    let index = baseUrl.indexOf(searchString) + searchString.length;
    let url = baseUrl.slice(0, index) + chapterId;
    return {
        sourceUrl:  url,
        title: optionElement.innerText
    };
};

// find the node(s) holding the story content
MuggleNetParser.prototype.findContent = function (dom) {
    return this.getElement(dom, "div", e => (e.id === "story") );
};

MuggleNetParser.prototype.extractTextFromPageTitle = function(dom, index) {
    let that = this;
    let text = "<unknown>";
    let profile = that.getElement(dom, "div", e => (e.id === "pagetitle") );
    if (profile !== null) {
        let links = that.getElements(profile, "a");
        if (index < links.length) {
            text = links[index].innerText.trim();
        }
    }
    return text;
};

MuggleNetParser.prototype.extractTitle = function(dom) {
    return this.extractTextFromPageTitle(dom, 0);
};

MuggleNetParser.prototype.extractAuthor = function(dom) {
    return this.extractTextFromPageTitle(dom, 1);
};



