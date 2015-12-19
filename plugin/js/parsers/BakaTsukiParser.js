/*
  Parses files on www.baka-tsuki.org
*/
"use strict";

function BakaTsukiParser() {
}

// Make BakaTsukiParser inherit from Parser
BakaTsukiParser.prototype = Object.create(Parser.prototype);
BakaTsukiParser.prototype.constructor = BakaTsukiParser;

BakaTsukiParser.prototype.NOT_IMAGE = 0;
BakaTsukiParser.prototype.GALLERY_IMAGE = 1;
BakaTsukiParser.prototype.THUMB_IMAGE = 2;

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
    let content = that.findContent(dom).cloneNode(true);
    that.removeUnwantedElementsFromContentElement(content);
    that.processImages(content);

    let xhtml = util.createEmptyXhtmlDoc();
    util.addToDocBody(xhtml, content);
    util.addXmlDeclarationToStart(xhtml);
    return xhtml;
}

BakaTsukiParser.prototype.testChapterSplit = function (dom) {
    let that = this;
    let content = that.findContent(dom).cloneNode(true);
    that.removeUnwantedElementsFromContentElement(content);
    that.processImages(content);

    let zipFile = new JSZip();
    let sectionsList = that.splitContentIntoSections(content);
    for (let i = 0; i < sectionsList.length; ++i) {
        let xhtml = that.packXhtmlChapter(sectionsList[i]);
        zipFile.file("section" + i + ".xhtml", new XMLSerializer().serializeToString(xhtml), { compression: "DEFLATE" });
    }
    return zipFile;
}

BakaTsukiParser.prototype.packXhtmlChapter = function (sectionElements) {
    let that = this;
    let xhtml = util.createEmptyXhtmlDoc();
    let body = xhtml.getElementsByTagName("body")[0];
    sectionElements.forEach(e => body.appendChild(e));
    util.addXmlDeclarationToStart(xhtml);
    return xhtml;
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

BakaTsukiParser.prototype.processImages = function (element) {
    let that = this;
    that.findImages(element);
    that.fixupImages();
}

BakaTsukiParser.prototype.findImages = function (element) {
    let that = this;
    that.imageNodes = [];

    let walker = document.createTreeWalker(element);
    while (walker.nextNode()) {
        let currentNode = walker.currentNode;
        if (that.isImageNode(currentNode)) {
            that.recordImageElement(currentNode);
        }
    }
}

BakaTsukiParser.prototype.fixupImages = function () {
    // at this point in time, just delete the images
    let that = this;
    util.removeElements(that.imageNodes);
}

BakaTsukiParser.prototype.isImageNode = function (element) {
    let that = this;
    return that.getImageNodeType(element) !== that.NOT_IMAGE;
}

BakaTsukiParser.prototype.getImageNodeType = function (element) {
    let that = this;
    if ((element.tagName === "LI") && (element.className === "gallerybox")) {
        return this.GALLERY_IMAGE;
    } else if ((element.tagName === "DIV") && 
        ((element.className === "thumb tright") || (element.className === "floatright"))) {
        return this.THUMB_IMAGE;
    } else {
        return this.NOT_IMAGE;
    }
}

BakaTsukiParser.prototype.recordImageElement = function (element) {
    let that = this;
    that.imageNodes.push(element);
}

BakaTsukiParser.prototype.splitContentIntoSections = function (content) {
    let that = this;
    let sectionsList = that.splitContentOnHeadingTags(content);

    // consolidate sections

    return sectionsList;
}

BakaTsukiParser.prototype.splitContentOnHeadingTags = function (content) {
    let that = this;
    let sectionsList = [];
    let section = [];
    for(let i = 0; i < content.childNodes.length; ++i) {
        let node = that.wrapRawTextNode(content.childNodes[i]);
        if (that.isChapterStart(node)) {
            that.appendToSectionsList(sectionsList, section);
            section = [];
        }
        section.push(node);
    }
    that.appendToSectionsList(sectionsList, section);
    return sectionsList;
}

// wrap any raw text in <p></p> tags
BakaTsukiParser.prototype.wrapRawTextNode = function (node) {
    if ((node.nodeType === Node.TEXT_NODE) && !util.isWhiteSpace(node.nodeValue)) {
        let wrapper = node.ownerDocument.createElement("p");
        wrapper.appendChild(node);
        return wrapper;
    } else {
        return node;
    }
}

BakaTsukiParser.prototype.isChapterStart = function (node) {
    return (node.tagName === "H1") || (node.tagName === "H2") 
        || (node.tagName === "H3") || (node.tagName === "H4")
}

BakaTsukiParser.prototype.appendToSectionsList = function (sectionsList, section) {
    let that = this;
    that.removeTrailingWhiteSpace(section);
    if (0 < section.length) {
        sectionsList.push(section);
    }
}

BakaTsukiParser.prototype.removeTrailingWhiteSpace = function (section) {
    let i = section.length - 1;
    while ((0 <= i) && util.isWhiteSpace(section[i].textContent)) {
        section.pop();
        --i;
    }
}
