
"use strict";

module("Parser");

QUnit.test("cleanWebPageUrls", function (assert) {
    let sample = [
        {sourceUrl: "http://dummy.com/page1.html"},
        {sourceUrl: "https://imgur.com/a123bgh1"},
        {sourceUrl: "http://dummy.com/page1.html"},
        {sourceUrl: "https://imgur.com/a123bgh1?grid"},
    ];
    let expected = [
        {sourceUrl: "http://dummy.com/page1.html"},
        {sourceUrl: "https://imgur.com/a123bgh1?grid"}
    ];
    let actual = new Parser().cleanWebPageUrls(sample);
    assert.deepEqual(actual, expected);
});

QUnit.test("setPagesToFetch", function (assert) {
    let urlsToFetch = [
        {sourceUrl: "http://dummy.com/page1.html"},
        {sourceUrl: "https://imgur.com/page2.html/"},
        {sourceUrl: "https://dummy.com/page3.html"},
    ];
    let state = new ParserState();
    state.setPagesToFetch(urlsToFetch);

    // convert next/previous links into array to make
    // verification easy
    let nextPrev = [];
    for(let page of state.webPages.values()) {
        for(let link of page.nextPrevChapters) {
            nextPrev.push(link);
        }
    }

    assert.deepEqual(nextPrev, [
        "imgur.com/page2.html",
        "dummy.com/page1.html",
        "dummy.com/page3.html",
        "imgur.com/page2.html"
    ]);
});
