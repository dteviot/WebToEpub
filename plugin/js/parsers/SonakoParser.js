/*
  Parses files on sonako.org
*/
"use strict";

//-----------------------------------------------------------------------------
// class SonakoImageCollector  (derives from BakaTsukiImageCollector)
//-----------------------------------------------------------------------------

function SonakoImageCollector(imageCollector) {
}
SonakoImageCollector.prototype = Object.create(BakaTsukiImageCollector.prototype);
SonakoImageCollector.prototype.constructor = SonakoImageCollector;

//  Assume all images can be found on a web page with URL
//  http://sonako.wikia.com/wiki/File:{data-image-name}
//  where {data-image-name} is data-image-name element of the img tag.
//
SonakoImageCollector.prototype.extractImagePageUrl = function (element) {
    // ToDo, use utilresolveRelativeUrl() rather than string concatanation
    let dataImageName = util.getElement(element, "img").getAttribute("data-image-name");
    return (dataImageName === null) ? null : "http://sonako.wikia.com/wiki/File:" + dataImageName;
}

SonakoImageCollector.prototype.isImageWrapperElement = function (element) {
    return (element.tagName === "FIGURE") ||  BakaTsukiImageCollector.prototype.isImageWrapperElement(element);
}


//-----------------------------------------------------------------------------
// class SonakoParser
//-----------------------------------------------------------------------------

// SonakoParser derives from BakaTsukiParser
function SonakoParser(imageCollector) {
    BakaTsukiParser.call(this, new SonakoImageCollector);
}
SonakoParser.prototype = Object.create(BakaTsukiParser.prototype);
SonakoParser.prototype.constructor = SonakoParser;

parserFactory.register("sonako.wikia.com", function() { return new SonakoParser() });

SonakoParser.prototype.extractTitle = function(dom) {
    let meta = util.getElement(dom, "meta", e => (e.getAttribute("name") === "description"));
    return (meta === null) ? null : meta.getAttribute("content");
};

SonakoParser.prototype.extractAuthor = function(dom) {
    // HTML doesn't have author.
    return "<Unknown>";
};

SonakoParser.prototype.extractLanguage = function(dom) {
    // ToDo find language
    return "vi-VN";
};

SonakoParser.prototype.extractSeriesInfo = function(dom) {
    return null;
}

// find the node(s) holding the story content
SonakoParser.prototype.findContent = function (dom) {
    return this.getElement(dom, "div", e => (e.className.startsWith("mw-content-ltr")));
};

SonakoParser.prototype.removeUnwantedElementsFromContentElement = function (element) {
    let that = this;
    util.removeElements(that.getElements(element, "script"));
    util.removeElements(that.getElements(element, "noscript"));

    // discard table of contents (will generate one from tags later)
    util.removeElements(that.getElements(element, "div", e => (e.id === "toc-wrapper")));
    util.removeElements(that.getElements(element, "a", e => (e.className === "toc-link")));

    util.removeElements(that.getElements(element, "a", e => e.className.startsWith("wikia-photogallery-add")));
    util.removeElements(that.getElements(element, "div", e => (e.className ==="dotEPUBremove")));

    util.removeComments(element);
    util.removeElements(that.getElements(element, "table"));

    // hyperlinks that allow editing text
    util.removeElements(that.getElements(element, "span", e => (e.className === "editsection")));

    that.stripGalleryImageWidthStyle(element);
};

// remove the "Width" style from the Gallery items, so images can take full screen.
SonakoParser.prototype.stripGalleryImageWidthStyle = function (element) {
    let that = this;
    for(let item of util.getElements(element, "div", e => (e.className === "wikia-gallery-item"))) {
        item.removeAttribute("style");
    }
}
