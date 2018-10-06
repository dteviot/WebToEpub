
"use strict";

module("QidianParser");

QUnit.test("cleanupChapterLink", function (assert) {
    let dom = new DOMParser().parseFromString(
        QidianChatperLinkSample, "text/html");
    let link = dom.querySelector("a");
    let actual = QidianParser.cleanupChapterLink(link);
    assert.equal(actual.title, "1: Young Zhao Feng"); 
});

let QidianChatperLinkSample =
`<!DOCTYPE html>
<html lang="en-US" class="dark-skin">
<head>
    <title>King of Gods - Eastern Fantasy - Webnovel - Your Fictional Stories Hub</title>
    <base href="https://www.webnovel.com/book/9017100806001205/King-of-Gods" />
</head>
<body">
<a href="//www.webnovel.com/book/9017100806001205/30995441462068685/King-of-Gods/Young-Zhao-Feng-" class="c_000 db pr clearfix pt8 pb8 pr8 pl8">
<i class="fl fs16 lh24 c_l _num mr4 tal">1</i>
<div class="oh">
    <strong class="db mb8 fs16 lh24 c_l ell">Young Zhao Feng </strong>
    <small class="db fs12 lh16 c_s">Aug 29,2018</small>
</div>
</a>
</body>
</html>
`
