
"use strict";

module("UtestParserFactory");

// Check get correct parser, based on URL
QUnit.test("basicFetchWorks", function (assert) {
    let parser = parserFactory.fetch("http://archiveofourown.org/works/123456/chapters/9876543");
    assert.ok(parser instanceof ArchiveOfOurOwnParser );
    parser = parserFactory.fetch("https://www.fanfiction.net/s/1234567/1/WebToEpub")
    assert.ok(parser instanceof FanFictionParser );
});

QUnit.test("unknownUrlReturnsDefaultParser", function (assert) {
    let dom = TestUtils.makeDomWithBody("<div></div>");
    let parser = parserFactory.fetch("http://unknown.org/works/123456/chapters/9876543", dom);
    assert.ok(parser instanceof DefaultParser);
});

QUnit.test("cantRegisterDuplicateUrls", function (assert) {
    let exceptionThrown = false;
    try {
        parserFactory.register("archiveofourown.org", function() { return new ArchiveOfOurOwnParser() })
    }
    catch (error) {
        exceptionThrown = true;
    }
    assert.ok(exceptionThrown);
});

QUnit.test("fetch", function (assert) {
    let wordpressDom = TestUtils.makeDomWithBody("<h3 class='entry-title'></h3><div class='entry-content'></div>");
    let blogspotDom = TestUtils.makeDomWithBody("<div class='pagepost'><div class='cover'></div></div>");
    let blogspotUrl = "http://dummy.blogspot.com/page1.html";
    let unknownUrl = "http://dummy.com/page1.html";
    let unknownDom = TestUtils.makeDomWithBody("<div></div>");
    
    let actual = parserFactory.fetch(unknownUrl, unknownDom);
    assert.ok(actual instanceof DefaultParser);

    actual = parserFactory.fetch(blogspotUrl, wordpressDom);
    assert.ok(actual instanceof BlogspotParser);

    actual = parserFactory.fetch(unknownUrl, blogspotDom);
    assert.ok(actual instanceof BlogspotParser);
    
    actual = parserFactory.fetch(unknownUrl, wordpressDom);
    assert.ok(actual instanceof WordpressBaseParser);
});
