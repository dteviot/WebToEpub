
"use strict";

module("MuggleNetParser");

function loadMuggleNetMultiPageDoc() {
    return util.syncLoadSampleDoc(
        "../testdata/MuggleNet.html",
        "http://fanfiction.mugglenet.com/viewstory.php?sid=123456&chapter=2"
    );
}

function loadMuggleNetSinglePageDoc() {
    return util.syncLoadSampleDoc(
        "../testdata/MuggleNetSinglePage.html",
        "http://fanfiction.mugglenet.com/viewstory.php?sid=123457&chapter=1"
   );
}

QUnit.test("getChapterUrls", function (assert) {
    let done = assert.async();
    let parser = new MuggleNetParser();
    parser.getChapterUrls(loadMuggleNetMultiPageDoc()).then(function (chapterUrls) {
        assert.equal(chapterUrls.length, 5);
        assert.equal(chapterUrls[0].sourceUrl, "http://fanfiction.mugglenet.com/viewstory.php?sid=123456&chapter=1");
        assert.equal(chapterUrls[1].sourceUrl, "http://fanfiction.mugglenet.com/viewstory.php?sid=123456&chapter=2");
        assert.equal(chapterUrls[4].title, "5. Using Chrome's \"Inspect Element\" to examine the DOM");
        done();
    });
});

QUnit.test("findMultiPageContent", function (assert) {
    let parser = new MuggleNetParser();
    let content = parser.findContent(loadMuggleNetMultiPageDoc());
    let regex = /^If you're like me, you will have*/;
    assert.ok(regex.test(content.innerText));
});

QUnit.test("getEpubMetaInfo", function (assert) {
    let parser = new MuggleNetParser();
    let metaInfo = parser.getEpubMetaInfo(loadMuggleNetMultiPageDoc());
    equal(metaInfo.title, "Web to Epub");
    equal(metaInfo.author, "David & Teviotdale");
    equal(metaInfo.language, "en");
    equal(metaInfo.fileName, "Web_to_Epub");
});

QUnit.test("parserFactory", function (assert) {
    let parser = parserFactory.fetch("http://fanfiction.mugglenet.com/viewstory.php?sid=123457&chapter=1");
    assert.ok(parser instanceof MuggleNetParser);
});

QUnit.test("getSingleChapterUrls", function (assert) {
    let done = assert.async();
    let parser = new MuggleNetParser();
    parser.getChapterUrls(loadMuggleNetSinglePageDoc()).then(function (chapterUrls) {
        assert.equal(chapterUrls.length, 1);
        assert.equal(chapterUrls[0].sourceUrl, "http://fanfiction.mugglenet.com/viewstory.php?sid=123457&chapter=1");
        assert.equal(chapterUrls[0].title, "Web to Epub");
        done();
    });
});

QUnit.test("findSinglePageContent", function (assert) {
    let parser = new MuggleNetParser();
    let content = parser.findContent(loadMuggleNetSinglePageDoc());
    let regex = /^If you're like me, you will have*/;
    assert.ok(regex.test(content.innerText));
});


