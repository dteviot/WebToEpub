/*
  An item (file) that will go into an EPUB
  It has the following properties
      type:  XHTML or image
      sourceUrl: where the html came from
      id:  the id value in the content.opf file
      zipHref: name of the item in the zip.

      optional elements:
      elements:  list of elements that make up the content (if it's XHTML content)
*/
"use strict";

function EpubItem(type, sourceUrl) {
    this.type = type;
    this.sourceUrl = sourceUrl;
    this.isInSpine = true;
    this.chapterTitle = null;
}

EpubItem.prototype.setIndex = function (index) {
    this.index = index;
}

EpubItem.prototype.getZipHref = function () {
    let that = this;
    return "OEBPS/Text/[" + util.zeroPad(this.index) + "]" + util.getTitle(that.chapterTitle) + ".xhtml";
}

EpubItem.prototype.getId = function () {
    return "xhtml" + util.zeroPad(this.index);
}

EpubItem.prototype.getMediaType = function () {
    return "application/xhtml+xml";
}

EpubItem.prototype.makeChapterDoc = function() {
    let that = this;
    let doc = util.createEmptyXhtmlDoc();
    let body = doc.getElementsByTagName("body")[0];
    for(let element of that.elements) {
        body.appendChild(element);
    };
    return doc;
}

EpubItem.prototype.chapterInfo = function*() {
    let that = this;
    for(let element of that.elements) {
        if (util.isHeaderTag(element)) {
            yield {
                depth: this.tagNameToTocDepth(element.tagName),
                title: element.textContent,
                src: that.getZipHref()
            };
        };
    };
}

// convert type of heading element to nesting depth on Table of Contents
// H1 = 0, H2 = 1, etc
EpubItem.prototype.tagNameToTocDepth = function(tagName) {
    // ToDo: assert that tagName in range <h1> ... <h4>
    return tagName[1] - '1';
}

EpubItem.prototype.fileContentForEpub = function() {
    return util.xmlToString(this.makeChapterDoc());
}
