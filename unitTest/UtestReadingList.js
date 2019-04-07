
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
    let actual = [...rl.getEpub(toc1Url)];
    assert.deepEqual(actual, ["http://novelupdates.com/seriesPage.html",
        "http://mySite.org/s1/chapter_001.html",
        "http://mySite.org/s1/chapter_002.html"
    ]);

    chapterList.push({isIncludeable: true, sourceUrl: "http://mySite.org/s1/chapter_003.html"})
    rl.update(toc1Url, chapterList);
    actual = [...rl.getEpub(toc1Url)];
    assert.deepEqual(actual, ["http://novelupdates.com/seriesPage.html",
        "http://mySite.org/s1/chapter_001.html",
        "http://mySite.org/s1/chapter_002.html",
        "http://mySite.org/s1/chapter_003.html"
    ]);
});

test("deselectUnwantedChapters", function (assert) {
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
    rl.deselectUnwantedChapters(toc1Url, pages);
    let actual = pages.map(p => p.isIncludeable);
    assert.deepEqual(actual, [false, false, false, true, false]);
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
        "{\"toc\":\"" + toc1Url + "\",\"history\":[\"http://novelupdates.com/seriesPage.html\",\"http://mySite.org/s1/chapter_001.html\",\"http://mySite.org/s1/chapter_002.html\"]},"+
        "{\"toc\":\"" + toc2Url + "\",\"history\":[\"http://novelupdates.com/series2Page.html\",\"http://mySite.org/s2/chapter_001.html\",\"http://mySite.org/s2/chapter_002.html\"]}"+
        "]}"
    );

    let clone = ReadingList.fromJson(actual);
    assert.deepEqual(readingList, clone);
});

// check this test works correctly
//{ sourceUrl: "http://mySite.org/s1/chapter_11.html",  isIncludeable: true },
//{ sourceUrl: "http://mySite.org/s1/chapter_1.html",  isIncludeable: true },

