
"use strict";

module("ReadingList");

test("update", function (assert) {
    let chapterList = [
        {isIncludeable: false, sourceUrl: "http://novelupdates.com/seriesPage.html"},
        {isIncludeable: true, sourceUrl: "http://mySite.org/s1/chapter_001.html"},
        {isIncludeable: false, sourceUrl: "http://mySite.org/s1/chapter_002.html"},
    ];

    let toc1Url = "http://mySite.org/s1/toc.html";
    let rl = new ReadingList();
    rl.addEpub(toc1Url);
    rl.update(toc1Url, chapterList);
    let actual = rl.getEpub(toc1Url);
    assert.equal(actual, "http://mySite.org/s1/chapter_001.html");

    chapterList.push({isIncludeable: true, sourceUrl: "http://mySite.org/s1/chapter_003.html"})
    rl.update(toc1Url, chapterList);
    actual = rl.getEpub(toc1Url);
    assert.equal(actual, "http://mySite.org/s1/chapter_003.html");
});

test("deselectOldChapters", function (assert) {
    let history = [
        {isIncludeable: false, sourceUrl: "http://novelupdates.com/seriesPage.html"},
        {isIncludeable: true, sourceUrl: "http://mySite.org/s1/chapter_001.html"},
        {isIncludeable: false, sourceUrl: "http://mySite.org/s1/chapter_002.html"},
    ];
    let pages = [
        { sourceUrl: "http://novelupdates.com/seriesPage.html",  isIncludeable: false },
        { sourceUrl: "http://mySite.org/s1/chapter_001.html",  isIncludeable: true },
        { sourceUrl: "http://mySite.org/s1/chapter_002.html",  isIncludeable: true },
        { sourceUrl: "http://mySite.org/s1/chapter_003.html",  isIncludeable: true },
        { sourceUrl: "http://mySite.org/s1/chapter_004.html",  isIncludeable: false }
    ];

    let toc1Url = "http://mySite.org/s1/toc.html";
    let rl = new ReadingList();
    rl.addEpub(toc1Url);
    rl.update(toc1Url, history);
    rl.deselectOldChapters(toc1Url, pages);
    let actual = pages.map(p => p.isIncludeable);
    assert.deepEqual(actual, [false, false, true, true, false]);
});

test("toJson_whenEmpty", function (assert) {
    let readingList = new ReadingList();
    let actual = readingList.toJson();
    assert.equal(actual, "{\"epubs\":[]}");

    let clone = ReadingList.fromJson(actual);
    assert.deepEqual(readingList, clone);
});

test("toJson", function (assert) {
    let readingList = new ReadingList();
    let toc1Url = "http://mySite.org/s1/toc.html";
    readingList.addEpub(toc1Url);
    readingList.update(toc1Url, [
        { isIncludeable: false, sourceUrl: "http://novelupdates.com/seriesPage.html" },
        { isIncludeable: true, sourceUrl: "http://mySite.org/s1/chapter_001.html" },
        { isIncludeable: false, sourceUrl: "http://mySite.org/s1/chapter_002.html" },
    ]);

    let toc2Url = "http://mySite.org/s2/toc.html";
    readingList.addEpub(toc2Url);
    readingList.update(toc2Url, [
        { isIncludeable: true, sourceUrl: "http://novelupdates.com/series2Page.html" },
        { isIncludeable: true, sourceUrl: "http://mySite.org/s2/chapter_001.html" },
        { isIncludeable: true, sourceUrl: "http://mySite.org/s2/chapter_002.html" },
    ]);

    let actual = readingList.toJson();
    assert.equal(actual, "{\"epubs\":["+
        "{\"toc\":\"" + toc1Url + "\",\"lastUrl\":\"http://mySite.org/s1/chapter_001.html\"},"+
        "{\"toc\":\"" + toc2Url + "\",\"lastUrl\":\"http://mySite.org/s2/chapter_002.html\"}"+
        "]}"
    );

    let clone = ReadingList.fromJson(actual);
    assert.deepEqual(readingList, clone);
});

test("fromJson_oldVersion", function (assert) {
    let toc1Url = "http://mySite.org/s1/toc.html";
    let toc2Url = "http://mySite.org/s2/toc.html";
    let oldJson = "{\"epubs\":["+
        "{\"toc\":\"" + toc1Url + "\",\"history\":[\"http://novelupdates.com/seriesPage.html\",\"http://mySite.org/s1/chapter_001.html\",\"http://mySite.org/s1/chapter_002.html\"]},"+
        "{\"toc\":\"" + toc2Url + "\",\"history\":[\"http://novelupdates.com/series2Page.html\",\"http://mySite.org/s2/chapter_001.html\",\"http://mySite.org/s2/chapter_002.html\"]}"+
        "]}";

    let rl = ReadingList.fromJson(oldJson);
    assert.equal(rl.getEpub(toc1Url), "http://mySite.org/s1/chapter_002.html");
    assert.equal(rl.getEpub(toc2Url), "http://mySite.org/s2/chapter_002.html");
});
