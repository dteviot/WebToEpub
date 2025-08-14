
"use strict";

module("ParserFactory");

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
        parserFactory.register("archiveofourown.org", () => new ArchiveOfOurOwnParser())
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

QUnit.test("reregister", function (assert) {
    parserFactory.register("reregister.org", () => new ArchiveOfOurOwnParser())
    let parser = parserFactory.fetch("http://reregister.org");
    assert.ok(parser instanceof ArchiveOfOurOwnParser );
    parserFactory.reregister("reregister.org", () => new FanFictionParser())
    parser = parserFactory.fetch("https://reregister.org/s/1234567/1/WebToEpub")
    assert.ok(parser instanceof FanFictionParser );
});

QUnit.test("hostNameForParserSelection", function (assert) {
    let fn = ParserFactory.hostNameForParserSelection;
    assert.equal("zirusmusings.com", fn("https://zirusmusings.com/ldm-ch84/"));
    assert.equal("dailydallying.com", fn("https://web.archive.org/web/20180729210849/http://dailydallying.com/nny/nny1/"));
    assert.equal("fanfiction.net", fn("https://www.fanfiction.net/s/1234567/1/WebToEpub"));
});

test("assignParsersToPages", function (assert) {
    let done = assert.async();
    let webPages = [
        {sourceUrl: "https://zirusmusings.com/ldm-ch84/"},
        {sourceUrl: "https://zirusmusings.com/ldm-ch85/"},
        {sourceUrl: "https://royalroadl.com/bgm/"},
        {sourceUrl: "https://royalroadl.com/bgm2/"},
        {sourceUrl: "https://www.lightnovelbastion.com/release.php?p=546"},
        {sourceUrl: "https://lightnovelstranslations.com/nidome-no-yuusha-illustration/"},
    ];
    let parser = new ZirusMusingsParser();
    parser.state.chapterListUrl = "https://zirusmusings.com/ldm/";
    parserFactory.addParsersToPages(parser, webPages).then(
        function() {
            assert.equal(parser, webPages[0].parser);
            assert.equal(parser, webPages[1].parser);
            assert.ok(webPages[2].parser instanceof RoyalRoadParser);
            assert.equal(webPages[2].parser, webPages[3].parser);
            assert.ok(webPages[4].parser instanceof LightNovelBastionParser);
            assert.ok(webPages[5].parser instanceof LightNovelsTranslationsParser);
            done();
        }
    );
});
