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

    makeCoverImageXhtmlFile(emptyDocFactory) {
        let that = this;
        let doc = emptyDocFactory();
        let body = doc.getElementsByTagName("body")[0];
        let userPreferences = that.imageCollector.userPreferences;
        body.appendChild(that.coverImageInfo.createImageElement(userPreferences));
        return util.xmlToString(doc);
    }

    hasCoverImageFile() {
        return (this.coverImageInfo != null);
    }

    addTableOfFetchedUrls() {
        let item = new EpubItem(null, "OEBPS/WebToEpub/");
        item.isInSpine = true;
        item.chapterTitle = "URLs fetched";
        let table = this.createTableOfFetchedUrls();
        let title = table.ownerDocument.createElementNS(util.XMLNS, "h1");
        title.textContent = item.chapterTitle;
        let style = table.ownerDocument.createElementNS(util.XMLNS, "style");
        style.textContent = `table { border-collapse: collapse; }
        table, th, td { border: 1px solid black; }`;
        item.nodes = [ style, title, table ];
        item.setIndex(this.epubItems.length);
        this.epubItems.push(item)
    }

    createTableOfFetchedUrls() {
        let doc = util.createEmptyXhtmlDoc();
        let table = doc.createElementNS(util.XMLNS, "table");
        let body = doc.getElementsByTagName("body")[0];
        body.appendChild(table);
        let row = doc.createElementNS(util.XMLNS, "tr");
        table.appendChild(row);
        this.addHeader(doc, row, "URL");
        this.addHeader(doc, row, "File in EPUB");
        for(let item of this.epubItems) {
            table.appendChild(item.makeSummaryRow(doc));
        };
        return table;
    }

    addHeader(doc, row, textContent) {
        let header = doc.createElementNS(util.XMLNS, "th");
        header.textContent = textContent;
        row.appendChild(header);
    }
}
