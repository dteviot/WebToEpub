/*
  Parses files on archiveofourown.net
*/
"use strict";

function RoyalRoadParser() {
}

// Make RoyalRoadParser inherit from Parser
RoyalRoadParser.prototype = Object.create(Parser.prototype);
RoyalRoadParser.prototype.constructor = RoyalRoadParser;

parserFactory.register("royalroadl.com", function() { return new RoyalRoadParser() });

RoyalRoadParser.prototype.getChapterUrls = function (dom) {
    let that = this;
    return that.getElements(dom, "li", e => (e.className === "chapter"))
        .map(function (element) { return that.elementToChapterInfo(element) });
};

RoyalRoadParser.prototype.elementToChapterInfo = function (chapterElement) {
    let chapterHref = util.getElement(chapterElement, "a");
    return {
        sourceUrl:  chapterHref.href,
        title: chapterHref.getAttribute("title")
    };
};

// find the node(s) holding the story content
RoyalRoadParser.prototype.findContent = function (dom) {
    return util.getElement(dom, "div", e => (e.className === "post_body scaleimages") );
};

RoyalRoadParser.prototype.extractTextFromPage = function(dom, tagName, filter) {
    let element = util.getElement(dom, tagName, filter);
    return (element === null) ? "<unknown>" : element.innerText.trim();
};

RoyalRoadParser.prototype.extractTitle = function(dom) {
    return this.extractTextFromPage(dom, "h1", e=> (e.className === "fiction-title"));
};

RoyalRoadParser.prototype.extractAuthor = function(dom) {
    let author = this.extractTextFromPage(dom, "span", e=> (e.className === "author"));
    return author.startsWith("by ") ? author.substring(3) : author;
};

RoyalRoadParser.prototype.extractLanguage = function(dom) {
    // was not able to locate in Royal Road HTML, so just return constant
    return "en";
};

