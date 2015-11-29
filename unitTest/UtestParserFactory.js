
"use strict";

module("UtestParserFactory");

// Check get correct parser, based on URL
QUnit.test("ParserFactory", function (assert) {
    let parser = ParserFactory("http://archiveofourown.org/works/123456/chapters/9876543")[0];
    assert.ok(parser instanceof ArchiveOfOurOwnParser );
    parser = ParserFactory("https://www.fanfiction.net/s/1234567/1/WebToEpub")[0];
    assert.ok(parser instanceof FanFictionParser );
});
