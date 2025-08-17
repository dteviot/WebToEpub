/*
    Provides information (and files) that will be packed into an EpubPacker.
    This implementation is where source Baka-Tsuki.
*/

"use strict";

class EpubItemSupplier { // eslint-disable-line no-unused-vars
    constructor(parser, epubItems, imageCollector) {
        this.parser = parser;
        this.epubItems = [];
        this.coverImageInfo = imageCollector.coverImageInfo;
        this.imageCollector = imageCollector;
        imageCollector.imagesToPackInEpub().forEach(image => this.epubItems.push(image));
        epubItems.forEach(item => this.epubItems.push(item));
        this.coverImageId = () => this.coverImageInfo.getId();
    }


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
        for (let epubItem of this.epubItems) {
            yield* epubItem.chapterInfo();
        }
    }

    makeCoverImageXhtmlFile(emptyDocFactory) {
        let doc = emptyDocFactory();
        doc.title = "Cover";
        let body = doc.getElementsByTagName("body")[0];
        let userPreferences = this.imageCollector.userPreferences;
        body.appendChild(this.coverImageInfo.createImageElement(userPreferences));
        return util.xmlToString(doc);
    }

    hasCoverImageFile() {
        return (this.coverImageInfo != null);
    }
}
