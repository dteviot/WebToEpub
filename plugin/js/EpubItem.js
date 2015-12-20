/*
  An item (file) that will go into an EPUB
  It has the following properties
      type:  XHTML or image
      sourceUrl: where the html came from
      id:  the id value in the content.opf file
      href: name of the item in the zip.

      optional elements:
      elements:  list of elements that make up the content (if it's XHTML content)
*/
"use strict";

function EpubItem(type, sourceUrl) {
    this.type = type;
    this.sourceUrl = sourceUrl;
}

EpubItem.prototype.setIndex = function (index) {
    this.index = index;
}

EpubItem.prototype.getHref = function () {
    return "index_split_" + util.zeroPad(this.index) + ".html";;
}

EpubItem.prototype.getId = function () {
    return "html" + util.zeroPad(this.index);
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
                src: that.getHref()
            };
        };
    };
}

// convert type of heading element to nesting depth on Table of Contents
EpubItem.prototype.tagNameToTocDepth = function(tagName) {
    // ToDo: Implement
    return 0;
}
