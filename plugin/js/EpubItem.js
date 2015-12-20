/*
  An item (file) that will go into an EPUB
  It has the following properties
      type:  HTML or image
      sourceUrl: where the html came from
      id:  the id value in the content.opf file
      href: name of the item in the zip.

      optional elements:
      elements:  list of elements that make up the content (if it's HTML content)
*/
"use strict";

function EpubItem(type, sourceUrl) {
    this.type = type;
    this.sourceUrl = sourceUrl;
}

// constants
EpubItem.prototype.XHTML_ITEM = 0;
EpubItem.prototype.JPEG_ITEM = 1;
EpubItem.prototype.PNG_ITEM = 2;
