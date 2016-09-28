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


    // used to populate manifest
    manifestItems() {
        return this.epubItems;
    }

    // used to populate spine
    spineItems() {
        return this.epubItems.filter(item => item.isInSpine);
    }

    // used to populate Zip file itself
    files() {
        return this.epubItems;
    }

    // used to populate table of contents
    *chapterInfo() {
        let that = this;
        for(let epubItem of that.epubItems) {
            yield* epubItem.chapterInfo();
        };
    }

    makeCoverImageXhtmlFile() {
        let that = this;
        let doc = util.createEmptyXhtmlDoc();
        let body = doc.getElementsByTagName("body")[0];
        let userPreferences = that.imageCollector.userPreferences;
        body.appendChild(that.coverImageInfo.createImageElement(userPreferences));
        return util.xmlToString(doc);
    }

    hasCoverImageFile() {
        return (this.coverImageInfo != null);
    }
}
