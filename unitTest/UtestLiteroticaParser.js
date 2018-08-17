
"use strict";

module("UtestLiteroticaParser");

QUnit.test("findUrlsOfAdditionalPagesMakingChapter-2pages", function (assert) {
    let url = "https://www.literotica.com/s/angels-of-rain-and-lightning";
    let dom = new DOMParser().parseFromString(
        LiteroticaSampleChapterPage, "text/html");
    let urls = LiteroticaParser.findUrlsOfAdditionalPagesMakingChapter(url, dom);
    assert.equal(urls.length, 2);
    assert.equal(urls[0], url + "?page=2");
    assert.equal(urls[1], url + "?page=3");
});

QUnit.test("findUrlsOfAdditionalPagesMakingChapter-0pages", function (assert) {
    let url = "https://www.literotica.com/s/angels-of-rain-and-lightning";
    let dom = new DOMParser().parseFromString(
        LiteroticaSampleChapterPage, "text/html");
    [...dom.querySelectorAll("option")].forEach(o => o.remove());
    let urls = LiteroticaParser.findUrlsOfAdditionalPagesMakingChapter(url, dom);
    assert.equal(urls.length, 0);
});

QUnit.test("assembleChapter", function (assert) {
    let url = "https://www.literotica.com/s/angels-of-rain-and-lightning";
    let dom = new DOMParser().parseFromString(
        LiteroticaSampleChapterPage, "text/html");

    let fragment1 = new DOMParser().parseFromString(
        "<div class=\"b-story-body-x x-r15\">" +
        "<div><p>page2</p></div>" +
        "</div>",
        "text/html"
    );
    let fragment2 = new DOMParser().parseFromString(
        "<div class=\"b-story-body-x x-r15\">" +
        "<div><p>page3a</p></div>" +
        "<div><p>page3b</p></div>" +
        "</div>",
        "text/html"
    );
    let fragments = [
        fragment1.querySelector("div"),
        fragment2.querySelector("div"),
    ]
    let fullChapter = LiteroticaParser.assembleChapter(dom, fragments);
    let actual = new LiteroticaParser().findContent(fullChapter);
    assert.equal(actual.innerHTML, "<div><p>page1</p></div><div><p>page2</p></div><div><p>page3a</p></div><div><p>page3b</p></div>");
});

QUnit.test("getChapterUrls-noTable", function (assert) {
    let dom = new DOMParser().parseFromString(
        LiteroticaToCSamplePage1, "text/html");
    let urls = new LiteroticaParser().chaptersFromMemberPage(dom);
    assert.equal(urls.length, 2);
    assert.equal(urls[0].sourceUrl, "https://www.literotica.com/s/alien-artifact-geek-pride");
    assert.equal(urls[1].sourceUrl, "https://www.literotica.com/s/an-infernal-folio");
});

QUnit.test("chaptersFromMemberPage", function (assert) {
    let dom = new DOMParser().parseFromString(
        LiteroticaToCSamplePage2, "text/html");
    let urls = new LiteroticaParser().chaptersFromMemberPage(dom);
    assert.equal(urls.length, 2);
    assert.equal(urls[0].sourceUrl, "https://www.literotica.com/s/a-dirty-task-needs-doing-pt-01");
    assert.equal(urls[1].sourceUrl, "https://www.literotica.com/s/zelda-avatar-of-the-golden-nymph-ch-07");
});

let LiteroticaSampleChapterPage =
`<!DOCTYPE html>
<html lang="en-US" class="dark-skin">
<head>
    <title>Alien Artifact - Geek Pride - Sci-Fi &amp; Fantasy - Literotica.com</title>
    <base href="https://www.literotica.com/s/angels-of-rain-and-lightning" />
</head>
<body class="t-storypage font-set-1 c38 btoprel"><div id="content"><div class="b-story-body-x x-r15"><div><p>page1</p></div></div></div>
<div class="b-pager-pages">
<select name="page"><option value="1" class="current" selected="selected">1</option><option value="2">2</option><option value="3">3</option></select>
</div>
</body>
</html>
`

let LiteroticaToCSamplePage1 =
`<!DOCTYPE html>
<html lang="en-US" class="dark-skin">
<head>
    <title>Literotica Geek Pride Story Event List - Sci-Fi &amp; Fantasy - Literotica.com</title>
    <base href="https://www.literotica.com/s/literotica-geek-pride-story-event-list" />
</head>
<body class="t-storypage font-set-1 c38 btoprel">
<div id="content"><div class="b-story-body-x x-r15">
<a href="https://www.literotica.com/s/alien-artifact-geek-pride" target="_blank">Alien Artifact - Geek Pride by HappyDom</a>
<a href="https://www.literotica.com/s/an-infernal-folio" target="_blank">An Infernal Folio by yowser</a>
</div>
</body>
</html>
`

let LiteroticaToCSamplePage2 =
`<!DOCTYPE html>
<html lang="en-US" class="dark-skin">
<head>
    <title>Literotica Geek Pride Story Event List - Sci-Fi &amp; Fantasy - Literotica.com</title>
    <base href="https://www.literotica.com/s/literotica-geek-pride-story-event-list" />
</head>
<body class="t-storypage font-set-1 c38 btoprel">
<table><tbody>
<tr class="sl"><td class="fc"><a class="bb" href="https://www.literotica.com/s/a-dirty-task-needs-doing-pt-01">A Dirty TASK Needs Doing Pt. 01</a>&nbsp;(4.57)</td><td>Kimberly Woods is not your average high school senior...
                  &nbsp;</td><td>&nbsp;<a href="https://www.literotica.com/c/transsexuals-crossdressers" class="l-8 intext r-5"><span>Transsexuals &amp; Crossdressers</span></a>&nbsp;</td><td class="dt">03/15/18</td></tr>
</tbody></table>
<div id="content"><div class="b-story-body-x x-r15">
<div class="b-story-list-box">
<h3><a href=\"https://www.literotica.com/s/zelda-avatar-of-the-golden-nymph-ch-07\">Zelda - Avatar of the Golden Nymph Ch. 07</a></h3>
<a href="https://www.literotica.com/stories/memberpage.php?uid=3586621&amp;page=submissions">SZENSEI</a>
<div>
</div>
</body>
</html>
`
