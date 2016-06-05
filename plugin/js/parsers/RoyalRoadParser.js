/*
  Parses files on www.royalroadl.com
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
    let that = this;
    let content = util.getElement(dom, "div", e => (e.className === "post_body scaleimages") );
    
    // cleanup story content
    that.removePostContent(content);
    that.stripStyle(content);
    return content;
};

RoyalRoadParser.prototype.removePostContent = function (element) {
    let navigationBox = util.getElement(element, "div", e => (e.className === "post-content") );
    if (navigationBox !== null) {
        util.removeNode(navigationBox);
    }
};

RoyalRoadParser.prototype.stripStyle = function (element) {
    let walker = document.createTreeWalker(element, NodeFilter.SHOW_ELEMENT);
    do {
        walker.currentNode.removeAttribute("style");
    } while(walker.nextNode());
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

