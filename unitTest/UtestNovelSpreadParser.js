
"use strict";

module("NovelSpreadParser");

QUnit.test("buildChapter", function (assert) {
    let json = {data: {
        chapter_number: 1,
        chapter_content:"<p>s1</p><p>s2</p>",
        chapter_title: "The Heart Wrenching Betrayal",
        path: "/chapter/c-1"
    }};
    let actual = NovelSpreadParser.buildChapter(json.data);
    assert.equal(actual.children[0].outerHTML, 
        "<html><head><title></title>"+
        "<base href=\"https://www.novelspread.com/chapter/c-1\">"+
        "</head><body><div class=\"webToEpubContent\">"+
        "<h1>1. The Heart Wrenching Betrayal</h1>"+
        "<p>s1</p><p>s2</p>"+
        "</div></body></html>"
    );
});

QUnit.test("extractRestUrl", function (assert) {
  let actual = NovelSpreadParser.extractRestUrl("https://m.novelspread.com/chapter/thriller-paradise/c-1-dont-pretend-to-be-friends");
  assert.equal(actual, "https://api.novelspread.com/api/novel/thriller-paradise/chapter/1/content");
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
