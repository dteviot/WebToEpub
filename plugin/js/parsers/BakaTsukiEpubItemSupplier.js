/*
    Provides information (and files) that will be packed into an EpubPacker.
    This implementation is where source Baka-Tsuki.
*/

"use strict";

function BakaTsukiEpubItemSupplier(parser, epubItems, images, coverImageInfo) {
    this.parser = parser;
    this.epubItems = [];
    this.coverImageInfo = coverImageInfo;
    images.forEach((image) => {
        if(coverImageInfo === image){
            image.isCover = true;
        }
        this.epubItems.push(image)
    });
    epubItems.forEach(item => this.epubItems.push(item));
    let that = this;
    this.coverImageId = function() {
        return (that.coverImageInfo == null) ? null : that.coverImageInfo.id; 
    };
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

EpubItemSupplier.prototype.makeCoverImageXhtmlFile = function() {
    let that = this;
    let doc = util.createEmptyXhtmlDoc();
    let body = doc.getElementsByTagName("body")[0];
    body.appendChild(that.coverImageInfo.createImageElement());
    return util.xmlToString(doc);
}

