
"use strict";

module("ArchiveOfOurOwnParser");

/// Load the sample file
/// As file operation is async, load the sample file into dom, and call doneCallback when file loaded
function asyncLoadArchiveOfOurOwnSampleDoc(doneCallback) {
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
    let xhr = new XMLHttpRequest();
    xhr.open("GET", "../testdata/DredC1.html", false);
    xhr.send(null);
    let dom = new DOMParser().parseFromString(xhr.responseText, "text/html");
    util.setBaseTag("http://archiveofourown.org/works/123456/chapters/9876543", dom);
    return dom;
}

QUnit.test("findContent", function (assert) {
    let parser = new ArchiveOfOurOwnParser();
    let content = parser.findContent(syncLoadArchiveOfOurOwnSampleDoc());
    equal(content.firstElementChild.className, "chapter");
});

QUnit.test("getEpubMetaInfo", function (assert) {
    let parser = new ArchiveOfOurOwnParser();
    let metaInfo = parser.getEpubMetaInfo(syncLoadArchiveOfOurOwnSampleDoc());
    equal(metaInfo.title, "Web *to EPUB: Extension \\for Chrome?");
    equal(metaInfo.author, "David & Teviotdale");
    equal(metaInfo.language, "en-US");
    equal(metaInfo.fileName, "Web_to_E...r_Chrome");
    equal(metaInfo.seriesName, null);
});

QUnit.test("parserFactory", function (assert) {
    let parser = parserFactory.fetch("http://archiveofourown.org/works/123456/chapters/9876543");
    assert.ok(parser instanceof ArchiveOfOurOwnParser );
});

