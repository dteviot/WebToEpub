
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
    [...dom.querySelectorAll("div.l_bH a.l_bJ")].forEach(o => o.remove());
    let urls = LiteroticaParser.findUrlsOfAdditionalPagesMakingChapter(url, dom);
    assert.equal(urls.length, 0);
});

QUnit.test("assembleChapter", function (assert) {
    let url = "https://www.literotica.com/s/angels-of-rain-and-lightning";
    let dom = new DOMParser().parseFromString(
        LiteroticaSampleChapterPage, "text/html");

    let fragment1 = new DOMParser().parseFromString(
        "<div class=\"aa_ht x-r15\">" +
        "<div><p>page2</p></div>" +
        "</div>",
        "text/html"
    );
    let fragment2 = new DOMParser().parseFromString(
        "<div class=\"aa_ht x-r15\">" +
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
    let chapters = new LiteroticaParser().chaptersFromMemberPage(dom);
    assert.equal(chapters.length, 2);
    assert.equal(chapters[0].sourceUrl, "https://www.literotica.com/s/alien-artifact-geek-pride");
    assert.strictEqual(chapters[0].newArc, null);
    assert.equal(chapters[1].sourceUrl, "https://www.literotica.com/s/an-infernal-folio");
    assert.strictEqual(chapters[1].newArc, null);
});

QUnit.test("chaptersFromMemberPage", function (assert) {
    let dom = new DOMParser().parseFromString(
        LiteroticaToCSamplePage2, "text/html");
    let chapters = new LiteroticaParser().chaptersFromMemberPage(dom);
    assert.equal(chapters.length, 2);
    assert.equal(chapters[0].sourceUrl, "https://www.literotica.com/s/a-dirty-task-needs-doing-pt-01");
    assert.strictEqual(chapters[0].newArc, null);
    assert.equal(chapters[1].sourceUrl, "https://www.literotica.com/s/zelda-avatar-of-the-golden-nymph-ch-07");
    assert.strictEqual(chapters[1].newArc, null);
});

let LiteroticaSampleChapterPage =
  /*html*/
  `<!DOCTYPE html>
<html lang="en-US" class="dark-skin">
<head>
    <title>Alien Artifact - Geek Pride - Sci-Fi &amp; Fantasy - Literotica.com</title>
    <base href="https://www.literotica.com/s/angels-of-rain-and-lightning" />
</head>
<body class="t-storypage font-set-1 c38 btoprel"><div id="content"><div class="aa_ht x-r15"><div><p>page1</p></div></div></div>
<div class="b-pager-pages">
<div class="panel clearfix l_bH"><a disabled="" class="l_bJ l_bK" title="Previous Page" href="/s/xxx-ch-05"><i class="icon-angle-left l_bP"></i></a><a class="l_bJ l_bL" title="Next Page" href="/s/xxx-ch-05?page=2"><i class="icon-angle-right l_bP"></i></a><a class="l_bJ" href="/s/xxxx-ch-05">1</a><span class="l_bJ l_x">2</span><a class="l_bJ" href="/s/xxx-ch-05?page=3">3</a><form action="?" class="l_bQ"><input type="number" name="page" placeholder="Page #" class="l_bR" aria-label="Page Number"></form></div>
</div>
</body>
</html>
`

let LiteroticaToCSamplePage1 =
  /*html*/
  `<!DOCTYPE html>
<html lang="en-US" class="dark-skin">
<head>
    <title>Literotica Geek Pride Story Event List - Sci-Fi &amp; Fantasy - Literotica.com</title>
    <base href="https://www.literotica.com/s/literotica-geek-pride-story-event-list" />
</head>
<body class="t-storypage font-set-1 c38 btoprel">
<div id="content"><div class="aa_ht x-r15">
<a href="https://www.literotica.com/s/alien-artifact-geek-pride" target="_blank">Alien Artifact - Geek Pride by HappyDom</a>
<a href="https://www.literotica.com/s/an-infernal-folio" target="_blank">An Infernal Folio by yowser</a>
</div>
</body>
</html>
`

let LiteroticaToCSamplePage2 =
  /*html*/
  `<!DOCTYPE html>

<html lang="en-US" class="dark-skin">
<head>
    <title>Literotica Geek Pride Story Event List - Sci-Fi &amp; Fantasy - Literotica.com</title>
    <base href="https://www.literotica.com/series/se/92137097" />
</head>
<body >
<div class="aa_ht"><div><h2 class="series__header">TABLE OF CONTENTS</h2><ul class="series__works">
<li class="br_ri"><a href="https://www.literotica.com/s/a-dirty-task-needs-doing-pt-01" class="br_rj">A Dirty TASK Needs Doing Pt. 01</a><p class="br_rk">Kimberly Woods is not your average high school senior...<a class="br_rl" href="/series/Transgender-Crossdressers-48/">Transgender &amp; Crossdressers</a></p></li>
<li class="br_ri"><a href="https://www.literotica.com/s/zelda-avatar-of-the-golden-nymph-ch-07" class="br_rj">A Dirty TASK Needs Doing Pt. 02</a><p class="br_rk">Kimberly goes on her first mission!<a class="br_rl" href="/series/Transgender-Crossdressers-48/">Transgender &amp; Crossdressers</a></p></li>
</body>
</html>
`
