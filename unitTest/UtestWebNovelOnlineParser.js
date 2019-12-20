"use strict";

module("WebNovelOnlineParser");

test("getStateJson", function (assert) {
    let dom = new DOMParser().parseFromString(WebNovelOnlineChapterSample, "text/html");
    let actual = WebNovelOnlineParser.getStringWithContent(dom);
    assert.equal(actual, "[] [] []");
});

let WebNovelOnlineChapterSample =
`<!DOCTYPE html>
<html lang="en">
<head>
<title>The Beginning After The End - Chapter 1 - The Light at the End of the Tunnel - WebNovelOnline</title>
<base href="https://webnovelonline.com/chapter/the_beginning_after_the_end/chapter-1" />
</head>
<body>
<script>window._INITIAL_DATA_ = [
    { "newNovel": [{"a": 2}]},
    null,
    null,
    null,
    {
        "novel": null,
        "chapter":"[] [] []"
    }
    ];</script>
</body>
</html>
`
