
"use strict";

module("EpubItemsupplier");

QUnit.test("createSummary", function (assert) {
    let imageInfo = new ImageInfo("http://dummy/cover.png", 0, "http://dummy/cover.png");
    imageInfo.width = 400;
    imageInfo.height = 600;
    imageInfo.isCover = true;
    let dummyImageCollector = {
        userPreferences: makeDummyUserPreferences(true, true),
        coverImageInfo: imageInfo,
        imagesToPackInEpub: function () { return [imageInfo]; }
    };
    let epubItem = new EpubItem("http://testing/c1.html");
    epubItem.chapterTitle = "ChapterOne";
    epubItem.setIndex(1);
    let itemSupplier = new EpubItemSupplier(null, [epubItem], dummyImageCollector);
    let table = itemSupplier.createTableOfFetchedUrls().outerHTML;
    assert.equal(table, "<table xmlns=\""+ util.XMLNS + "\">" +
        "<tr><th>URL</th><th>File in EPUB</th></tr>"+ 
        "<tr><td>http://dummy/cover.png</td><td>OEBPS/Images/0000_cover.png</td></tr>"+ 
        "<tr><td>http://testing/c1.html</td><td>OEBPS/Text/0001_ChapterOne.xhtml</td></tr>"+ 
        "</table>")
});
