
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
    let parser = parserFactory.fetch("http://unknown.org/works/123456/chapters/9876543");
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
