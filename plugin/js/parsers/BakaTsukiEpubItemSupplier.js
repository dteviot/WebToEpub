/*
    Provides information (and files) that will be packed into an EpubPacker.
    This implementation is where source Baka-Tsuki.
*/

"use strict";

function BakaTsukiEpubItemSupplier(parser, epubItems) {
    this.parser = parser;
    this.epubItems = epubItems;
}

// Make BakaTsukiEpubItemSupplier inherit from EpubItemSupplier
BakaTsukiEpubItemSupplier.prototype = Object.create(EpubItemSupplier.prototype);
BakaTsukiEpubItemSupplier.prototype.constructor = EpubItemSupplier;

BakaTsukiEpubItemSupplier.prototype.updateEpubItems = function(epubItems) {
}

// used to populate manifest
BakaTsukiEpubItemSupplier.prototype.manifestItems = function*() {
    let that = this;
    for(let item of that.epubItems) {
        yield {
            href: item.getZipHref(),
            id:   item.getId(),
            mediaType: item.getMediaType()
        };
    };
}

// used to populate spine
BakaTsukiEpubItemSupplier.prototype.spineItems = function*() {
    yield* this.manifestItems();
}

// used to populate Zip file itself
BakaTsukiEpubItemSupplier.prototype.files = function*() {
    let that = this;
    for(let item of that.epubItems) {
        yield {
            href: item.getZipHref(),
            content: util.xmlToString(item.makeChapterDoc())
        };
    };
}

// used to populate table of contents
BakaTsukiEpubItemSupplier.prototype.chapterInfo = function*() {
    let that = this;
    for(let epubItem of that.epubItems) {
        yield* epubItem.chapterInfo();
    };
}
