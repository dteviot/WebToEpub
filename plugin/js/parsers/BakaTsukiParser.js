/*
  Parses files on www.baka-tsuki.org
*/
"use strict";

function BakaTsukiParser() {
}

// Make BakaTsukiParser inherit from Parser
BakaTsukiParser.prototype = Object.create(Parser.prototype);
BakaTsukiParser.prototype.constructor = BakaTsukiParser;

BakaTsukiParser.prototype.canParse = function (url) {
    return (this.extractHostName(url) === "www.baka-tsuki.org");
}

BakaTsukiParser.prototype.getChapterUrls = function (dom) {
    // baka tsuki are single web page
    let that = this;
    let chapters = [];
    chapters.push({
        sourceUrl: that.getBaseUrl(dom),
        title: that.extractTitle(dom)
    });
    return chapters;
};

BakaTsukiParser.prototype.extractTitle = function(dom) {
    return this.getElement(dom, "h1", e => (e.className === "firstHeading") ).textContent.trim();
};

BakaTsukiParser.prototype.extractAuthor = function(dom) {
    // HTML doesn't have author.
    return "<Unknown>";
};

BakaTsukiParser.prototype.extractLanguage = function(dom) {
    return this.getElement(dom, "html").getAttribute("lang");
};

// find the node(s) holding the story content
BakaTsukiParser.prototype.findContent = function (dom) {
    return this.getElement(dom, "div", e => (e.className === "mw-content-ltr") );
};

BakaTsukiParser.prototype.stripUnwantedElementsFromContentElement = function (element) {
    let that = this;
    that.removeNodes(that.getElements(element, "script"));
};

// delete all nodes in the supplied array
BakaTsukiParser.prototype.removeNodes = function (elements) {
    elements.forEach(e => e.parentNode.removeChild(e));
}
