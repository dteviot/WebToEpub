
"use strict";

module("LiteroticaParser");

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
