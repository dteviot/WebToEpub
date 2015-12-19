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

// convert document to XHTML
BakaTsukiParser.prototype.toXhtml = function (dom) {
    let that = this;
    let content = that.findContent(dom);
    that.removeUnwantedElementsFromContentElement(content);
    return dom;
}

BakaTsukiParser.prototype.removeUnwantedElementsFromContentElement = function (element) {
    let that = this;
    util.removeElements(that.getElements(element, "script"));

    // discard table of contents (will generate one from tags later)
    util.removeElements(that.getElements(element, "div", e => (e.className === "toc")));

    util.removeComments(element);
    that.removeUnwantedTable(element);

    // hyperlinks that allow editing text
    util.removeElements(that.getElements(element, "span", e => (e.className === "mw-editsection")));
};

// There's a table at end of content, with links to other stories on Baka Tsuki.
// It's not wanted in the EPUB
BakaTsukiParser.prototype.removeUnwantedTable = function (element) {
    // sometimes the wanted table has other tables nested in it.
    let that = this;
    let tables = that.getElements(element, "table");
    if (0 < tables.length) {
        let endTable = tables[tables.length - 1];
        let node = endTable;
        while (node.parentNode != null) {
            node = node.parentNode;
            if (node.tagName === "TABLE") {
                endTable = node;
            }
        }
        util.removeNode(endTable);
    }
}
