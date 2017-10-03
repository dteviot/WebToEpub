
"use strict";

module("Parser");

QUnit.test("cleanChaperListUrls", function (assert) {
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
    let actual = new Parser().cleanChaperListUrls(sample);
    assert.deepEqual(actual, expected);
});
