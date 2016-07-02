/*
    Provides information (and files) that will be packed into an EpubPacker.
    Conceptually, it provides the interface that the EpubPacker uses to pull
    information from a Parser.
    This default implementation is for source where each web page is a chapter.
*/

"use strict";

function EpubItemSupplier(parser) {
    this.items = [];
    this.parser = parser;
}

// load set of chapters
EpubItemSupplier.prototype.setChapters = function (chapters) {
    this.items = chapters;
}

EpubItemSupplier.prototype.createXhtmlFileName = function (fileIndex) {
    let that = this;
    return util.makeStorageFileName("OEBPS/Text/", fileIndex, that.items[fileIndex].chapterTitle, "xhtml");
}

// return id attribute to go into <item> element in <manifest>
EpubItemSupplier.prototype.createId = function(fileIndex) {
    return "xhtml" + util.zeroPad(fileIndex);
}

// used to populate manifest
EpubItemSupplier.prototype.manifestItems = function*() {
    let that = this;
    let index = 0;
    while (index < that.items.length) {
        ++index;
        yield {
            href: that.createXhtmlFileName(index - 1),
            id:   that.createId(index - 1),
            mediaType: "application/xhtml+xml"
        };
    };
}

// used to populate spine
EpubItemSupplier.prototype.spineItems = function*() {
    yield* this.manifestItems();
}

// used to populate Zip file itself
EpubItemSupplier.prototype.files = function*() {
    let that = this;
    let index = 0;
    while (index < that.items.length) {
        ++index;
        let rawDom = that.items[index - 1].rawDom;
        yield {
            href: that.createXhtmlFileName(index - 1),
            content: util.xmlToString(that.parser.makeChapterDoc(rawDom), true)
        }
    };
}

// used to populate table of contents
EpubItemSupplier.prototype.chapterInfo = function*() {
    let that = this;
    let index = 0;
    while (index < that.items.length) {
        ++index;
        if (typeof (that.items[index - 1].title) === "undefined") {
            continue;
        } else {
            yield {
                depth: 0,
                title: that.items[index - 1].title,
                src: that.createXhtmlFileName(index - 1)
            }
        }
    };
}

EpubItemSupplier.prototype.hasCoverImageFile = function() {
    return (this.coverImageId() != null);
}

// Name of Cover image in EPUB file
// returns null if no cover image
EpubItemSupplier.prototype.coverImageId = function() {
    return null;
}

// create a XHTML file that "wraps" the cover image
EpubItemSupplier.prototype.makeCoverImageXhtmlFile = function() {
    throw new Error("Not implemented");
}
