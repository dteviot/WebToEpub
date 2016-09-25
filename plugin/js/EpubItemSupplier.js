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
        this.imageCollector = imageCollector;
        imageCollector.imagesToPackInEpub().forEach(image => this.epubItems.push(image));
        epubItems.forEach(item => this.epubItems.push(item));
        let that = this;
        this.coverImageId = () => that.coverImageInfo.getId();
    };
}

// used to populate manifest
EpubItemSupplier.prototype.manifestItems = function() {
    return this.epubItems;
}

// used to populate spine
EpubItemSupplier.prototype.spineItems = function() {
    return this.epubItems.filter(item => item.isInSpine);
}

// used to populate Zip file itself
EpubItemSupplier.prototype.files = function() {
    return this.epubItems;
}

// used to populate table of contents
EpubItemSupplier.prototype.chapterInfo = function*() {
    let that = this;
    for(let epubItem of that.epubItems) {
        yield* epubItem.chapterInfo();
    };
}

EpubItemSupplier.prototype.makeCoverImageXhtmlFile = function() {
    let that = this;
    let doc = util.createEmptyXhtmlDoc();
    let body = doc.getElementsByTagName("body")[0];
    let userPreferences = that.imageCollector.userPreferences;
    body.appendChild(that.coverImageInfo.createImageElement(userPreferences));
    return util.xmlToString(doc);
}

EpubItemSupplier.prototype.hasCoverImageFile = function() {
    return (this.coverImageInfo != null);
}
