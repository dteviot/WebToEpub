
"use strict";

module("FanFictionParser");

/// Load the sample file
/// As file operation is async, load the sample file into dom, and call doneCallback when file loaded
function syncLoadFanFictionSampleDoc(fileName) {
    let that = this;
    let xhr = new XMLHttpRequest();
    xhr.open("GET", fileName, false);
    xhr.send(null);
    let dom = new DOMParser().parseFromString(xhr.responseText, "text/html");
    new HttpClient().setBaseTag("https://www.fanfiction.net/s/1234567/1/WebToEpub", dom);
    return dom;
}

function loadMultiPageDoc() {
    return syncLoadFanFictionSampleDoc("../testdata/FanFiction.html")
}

function loadSinglePageDoc() {
    return syncLoadFanFictionSampleDoc("../testdata/FanFictionSinglePage.html")
}

QUnit.test("getChapterUrls", function (assert) {
    let parser = new FanFictionParser();
    let chapterUrls = parser.getChapterUrls(loadMultiPageDoc());
    assert.equal(chapterUrls.length, 5);
    assert.equal(chapterUrls[0].sourceUrl, "https://www.fanfiction.net/s/1234567/1/WebToEpub");
    assert.equal(chapterUrls[1].sourceUrl, "https://www.fanfiction.net/s/1234567/2/WebToEpub");
    assert.equal(chapterUrls[4].title, "5. Using Chrome's \"Inspect Element\" to examine the DOM");
});

QUnit.test("findContent", function (assert) {
    let parser = new FanFictionParser();
    let content = parser.findContent(loadMultiPageDoc());
    equal(content.childNodes.length, 3);
    let regex = /^If you're like me, you will have*/;
    assert.ok(regex.test(content.childNodes[1].innerText));
});

QUnit.test("getEpubMetaInfo", function (assert) {
    let parser = new FanFictionParser();
    let metaInfo = parser.getEpubMetaInfo(loadMultiPageDoc());
    equal(metaInfo.title, "Web to Epub");
    equal(metaInfo.author, "David & Teviotdale");
    equal(metaInfo.language, "en");
    equal(metaInfo.fileName, "WebtoEpub.epub");
});

QUnit.test("parserFactory", function (assert) {
    let parser = parserFactory.fetch("https://www.fanfiction.net/s/1234567/1/WebToEpub");
    assert.ok(parser instanceof FanFictionParser);
});

QUnit.test("getSingleChapterUrls", function (assert) {
    let parser = new FanFictionParser();
    let chapterUrls = parser.getChapterUrls(loadSinglePageDoc());
    assert.equal(chapterUrls.length, 1);
    assert.equal(chapterUrls[0].sourceUrl, "https://www.fanfiction.net/s/1234567/1/WebToEpub");
    assert.equal(chapterUrls[0].title, "Web to Epub");
});

QUnit.test("findContent", function (assert) {
    let parser = new FanFictionParser();
    let content = parser.findContent(loadSinglePageDoc());
    equal(content.childNodes.length, 3);
    let regex = /^If you're like me, you will have*/;
    assert.ok(regex.test(content.childNodes[1].innerText));
});


