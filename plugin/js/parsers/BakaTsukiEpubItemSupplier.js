/*
    Provides information (and files) that will be packed into an EpubPacker.
    This implementation is where source Baka-Tsuki.
*/

"use strict";

class EpubItemSupplier {
    constructor(parser, epubItems, imageCollector) {
        this.parser = parser;
        this.epubItems = [];
        this.coverImageInfo = imageCollector.coverImageInfo;
        imageCollector.imagesToPackInEpub().forEach(image => this.epubItems.push(image));
        epubItems.forEach(item => this.epubItems.push(item));
        let that = this;
        this.coverImageId = function() {
            return (that.coverImageInfo == null) ? null : that.coverImageInfo.id; 
        };
    }
}

// used to populate manifest
EpubItemSupplier.prototype.manifestItems = function*() {
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
EpubItemSupplier.prototype.spineItems = function*() {
    let that = this;
    for(let item of that.epubItems) {
        if (item.isInSpine) {
            yield { id: item.getId() };
        };
    };
}

// used to populate Zip file itself
EpubItemSupplier.prototype.files = function*() {
    let that = this;
    for(let item of that.epubItems) {
        yield {
            href: item.getZipHref(),
            content: item.fileContentForEpub()
        };
    };
}

// used to populate table of contents
EpubItemSupplier.prototype.chapterInfo = function*() {
    let that = this;
    for(let epubItem of that.epubItems) {
        if (epubItem.chapterInfo != undefined) {
            yield* epubItem.chapterInfo();
        };
    };
}

EpubItemSupplier.prototype.makeCoverImageXhtmlFile = function() {
    let that = this;
    let doc = util.createEmptyXhtmlDoc();
    let body = doc.getElementsByTagName("body")[0];
    body.appendChild(that.coverImageInfo.createImageElement());
    return util.xmlToString(doc);
}

EpubItemSupplier.prototype.hasCoverImageFile = function() {
    return (this.coverImageId() != null);
}
