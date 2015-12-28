/*
    Provides information (and files) that will be packed into an EpubPacker.
    This implementation is where source Baka-Tsuki.
*/

"use strict";

function BakaTsukiEpubItemSupplier(parser, epubItems, images, coverImageFileName) {
    this.parser = parser;
    this.epubItems = [];
    images.forEach(image => this.epubItems.push(image));
    epubItems.forEach(item => this.epubItems.push(item));
    this.coverImageFileName = function() { return coverImageFileName };
}

// Make BakaTsukiEpubItemSupplier inherit from EpubItemSupplier
BakaTsukiEpubItemSupplier.prototype = Object.create(EpubItemSupplier.prototype);
BakaTsukiEpubItemSupplier.prototype.constructor = EpubItemSupplier;

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
    let that = this;
    for(let item of that.epubItems) {
        if (item.isInSpine) {
            yield { id: item.getId() };
        };
    };
}

// used to populate Zip file itself
BakaTsukiEpubItemSupplier.prototype.files = function*() {
    let that = this;
    for(let item of that.epubItems) {
        yield {
            href: item.getZipHref(),
            content: item.fileContentForEpub()
        };
    };
}

// used to populate table of contents
BakaTsukiEpubItemSupplier.prototype.chapterInfo = function*() {
    let that = this;
    for(let epubItem of that.epubItems) {
        if (epubItem.chapterInfo != undefined) {
            yield* epubItem.chapterInfo();
        };
    };
}
