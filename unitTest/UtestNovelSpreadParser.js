
"use strict";

module("NovelSpreadParser");

QUnit.test("findTocRestUri", function (assert) {
    let dom = new DOMParser().parseFromString(NovelSpreadParserSample1, "text/html");
    let actual = NovelSpreadParser.findTocRestUri(dom);
    assert.equal(actual, "https://www.novelspread.com/novel/catalog/115");
});

test("buildChaptersList", function (assert) {
    let done = assert.async();

    let json = {data: [
        {id:64327, chapter_title:"The Heart Wrenching Betrayal"},
        {id:64328, chapter_title:"This is Simply Torture!"},
    ]};
    
    let expectedChapterList = [ 
        {   sourceUrl: "https://www.novelspread.com/chapter/64327",
            title: "The Heart Wrenching Betrayal",
            newArc: null
        },
        {   sourceUrl: "https://www.novelspread.com/chapter/64328",
            title: "This is Simply Torture!",
            newArc: null
        },
    ];
    
    NovelSpreadParser.buildChaptersList(json).then(
        function(actual) {
            assert.deepEqual(actual, expectedChapterList); 
            done();
        }
    );
});

QUnit.test("buildChapter", function (assert) {
    let json = {data: {
        chapter_content:"<p>s1</p><p>s2</p>",
        chapter_title: "The Heart Wrenching Betrayal",
        path: "/chapter/c-1"
    }};
    let actual = NovelSpreadParser.buildChapter(json.data);
    assert.equal(actual.children[0].outerHTML, 
        "<html><head><title></title>"+
        "<base href=\"https://www.novelspread.com/chapter/c-1\">"+
        "</head><body><div class=\"webToEpubContent\">"+
        "<h1>The Heart Wrenching Betrayal</h1>"+
        "<p>s1</p><p>s2</p>"+
        "</div></body></html>"
    );
});

let NovelSpreadParserSample1 =
`<!DOCTYPE html>
<html lang="en">
<head>
  <title>The Demonic King Chases His Wife The Rebellious Good-for-Nothing Miss - NovelSpread</title>
  <base href="https://www.novelspread.com/novel/the-demonic-king-chases-his-wife-the-rebellious-good-for-nothing-miss" />
</head>
<body class="p-details">
  <div class="main-body" data-novel="115" data-collcetion=""></div>
</body>
</html>`
