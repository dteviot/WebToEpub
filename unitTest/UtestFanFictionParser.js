
"use strict";

module("FanFictionParser");

function loadFanFictionMultiPageDoc() {
    return util.syncLoadSampleDoc("../testdata/FanFiction.html", "https://www.fanfiction.net/s/1234567/1/WebToEpub")
}

function loadFanFictionSinglePageDoc() {
    return util.syncLoadSampleDoc("../testdata/FanFictionSinglePage.html", "https://www.fanfiction.net/s/1234567/1/WebToEpub")
}

QUnit.test("getChapterUrls", function (assert) {
    let parser = new FanFictionParser();
    let chapterUrls = parser.getChapterUrls(loadFanFictionMultiPageDoc());
    assert.equal(chapterUrls.length, 5);
    assert.equal(chapterUrls[0].sourceUrl, "https://www.fanfiction.net/s/1234567/1/WebToEpub");
    assert.equal(chapterUrls[1].sourceUrl, "https://www.fanfiction.net/s/1234567/2/WebToEpub");
    assert.equal(chapterUrls[4].title, "5. Using Chrome's \"Inspect Element\" to examine the DOM");
});

QUnit.test("findMultiPageContent", function (assert) {
    let parser = new FanFictionParser();
    let content = parser.findContent(loadFanFictionMultiPageDoc());
    equal(content.childNodes.length, 3);
    let regex = /^If you're like me, you will have*/;
    assert.ok(regex.test(content.childNodes[1].innerText));
});

QUnit.test("getEpubMetaInfo", function (assert) {
    let parser = new FanFictionParser();
    let metaInfo = parser.getEpubMetaInfo(loadFanFictionMultiPageDoc());
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
    let chapterUrls = parser.getChapterUrls(loadFanFictionSinglePageDoc());
    assert.equal(chapterUrls.length, 1);
    assert.equal(chapterUrls[0].sourceUrl, "https://www.fanfiction.net/s/1234567/1/WebToEpub");
    assert.equal(chapterUrls[0].title, "Web to Epub");
});

QUnit.test("findSinglePageContent", function (assert) {
    let parser = new FanFictionParser();
    let content = parser.findContent(loadFanFictionSinglePageDoc());
    equal(content.childNodes.length, 3);
    let regex = /^If you're like me, you will have*/;
    assert.ok(regex.test(content.childNodes[1].innerText));
});


