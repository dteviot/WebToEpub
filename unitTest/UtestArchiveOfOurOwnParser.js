
"use strict";

module("ArchiveOfOurOwnParser");

/// Load the sample file
/// As file operation is async, load the sample file into dom, and call doneCallback when file loaded
function asyncLoadArchiveOfOurOwnSampleDoc(doneCallback) {
    let that = this;
    let xhr = new XMLHttpRequest();
    xhr.open("GET", "../testdata/DredC1.html");
    xhr.responseType = "document";
    xhr.onload = function () {
        let dom = this.responseXML;
        util.setBaseTag("http://archiveofourown.org/works/123456/chapters/9876543", dom);
        doneCallback(dom);
    }
    xhr.send();
}

function syncLoadArchiveOfOurOwnSampleDoc() {
    let that = this;
    let xhr = new XMLHttpRequest();
    xhr.open("GET", "../testdata/DredC1.html", false);
    xhr.send(null);
    let dom = new DOMParser().parseFromString(xhr.responseText, "text/html");
    util.setBaseTag("http://archiveofourown.org/works/123456/chapters/9876543", dom);
    return dom;
}

QUnit.test("getChapterUrls", function (assert) {
    let done = assert.async();
    asyncLoadArchiveOfOurOwnSampleDoc(function (dom) {
        new ArchiveOfOurOwnParser().getChapterUrls(dom).then(function (chapterUrls) {
            assert.equal(chapterUrls.length, 5);
            assert.equal(chapterUrls[0].sourceUrl, "http://archiveofourown.org/works/123456/chapters/9876543?view_adult=true");
            assert.equal(chapterUrls[1].sourceUrl, "http://archiveofourown.org/works/123456/chapters/9876544?view_adult=true");
            assert.equal(chapterUrls[4].title, "5. Using Chrome's \"Inspect Element\" to examine the DOM");
            done();
        });
    });
});

QUnit.test("findContent", function (assert) {
    let parser = new ArchiveOfOurOwnParser();
    let content = parser.findContent(syncLoadArchiveOfOurOwnSampleDoc());
    equal(content.childNodes.length, 5);
    equal(content.childNodes[1].innerText, "Chapter Text");
    equal(content.childNodes[3].innerText, "If you're like me, you will have...");
});

QUnit.test("getEpubMetaInfo", function (assert) {
    let parser = new ArchiveOfOurOwnParser();
    let metaInfo = parser.getEpubMetaInfo(syncLoadArchiveOfOurOwnSampleDoc());
    equal(metaInfo.title, "Web *to EPUB: Extension \\for Chrome?");
    equal(metaInfo.author, "David & Teviotdale");
    equal(metaInfo.language, "en-US");
    equal(metaInfo.fileName, "Web_to_EPU...for_Chrome");
    equal(metaInfo.seriesName, null);
});

QUnit.test("parserFactory", function (assert) {
    let parser = parserFactory.fetch("http://archiveofourown.org/works/123456/chapters/9876543");
    assert.ok(parser instanceof ArchiveOfOurOwnParser );
});

