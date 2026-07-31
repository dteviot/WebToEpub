
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

QUnit.test("getEpubMetaInfo-fromArticleJsonLd", async function (assert) {
    let dom = new DOMParser().parseFromString(
        LiteroticaStoryMetadataSample, "text/html");
    let parser = new LiteroticaParser();

    await parser.loadEpubMetaInfo(dom);
    let metaInfo = parser.getEpubMetaInfo(dom);

    assert.equal(metaInfo.title, "Case 3319");
    assert.equal(metaInfo.author, "Mesmerciless");
    assert.equal(metaInfo.datePublished, "2019-12-23T00:00:00.000Z");
    assert.equal(metaInfo.subject, "mind control, transformation");
    assert.equal(metaInfo.description, "From streaming star to brainless bimbo.");
});

QUnit.test("tagNames-supportsAlternateMetadataShapes", function (assert) {
    assert.deepEqual(
        LiteroticaParser.tagNames([
            {name: "mind control"},
            {tag: "transformation"},
            {keyword: "gamer"}
        ]),
        ["mind control", "transformation", "gamer"]
    );
    assert.deepEqual(
        LiteroticaParser.tagNames("mind control, transformation"),
        ["mind control", "transformation"]
    );
});

QUnit.test("loadEpubMetaInfo-tagsFromMetaFallback", async function (assert) {
    let dom = new DOMParser().parseFromString(`
        <html><head>
            <base href="https://www.literotica.com/s/example-story">
            <meta name="keywords" content="mind control, transformation">
            <script type="application/ld+json">
                {"@type":"Article", "headline":"Example", "author":{"name":"Writer"}}
            </script>
        </head><body><h1>Example</h1></body></html>
    `, "text/html");
    let parser = new LiteroticaParser();

    await parser.loadEpubMetaInfo(dom);

    assert.deepEqual(parser.tags, ["mind control", "transformation"]);
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
<li class="br_ri"><a href="https://www.literotica.com/s/a-dirty-task-needs-doing-pt-01" class="_link_qr6sx_55">A Dirty TASK Needs Doing Pt. 01</a><p class="br_rk">Kimberly Woods is not your average high school senior...<a class="br_rl" href="/series/Transgender-Crossdressers-48/">Transgender &amp; Crossdressers</a></p></li>
<li class="br_ri"><a href="https://www.literotica.com/s/zelda-avatar-of-the-golden-nymph-ch-07" class="_link_qr6sx_55">A Dirty TASK Needs Doing Pt. 02</a><p class="br_rk">Kimberly goes on her first mission!<a class="br_rl" href="/series/Transgender-Crossdressers-48/">Transgender &amp; Crossdressers</a></p></li>
</body>
</html>
`

let LiteroticaStoryMetadataSample =
  /*html*/
  `<!DOCTYPE html>
<html lang="en">
<head>
    <base href="https://www.literotica.com/s/case-3319" />
    <script type="application/ld+json">not valid JSON</script>
    <script type="application/ld+json">
    {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": "Case 3319",
        "description": "From streaming star to brainless bimbo.",
        "author": {"@type": "Person", "name": "Mesmerciless"},
        "datePublished": "2019-12-23T00:00:00.000Z",
        "keywords": ["mind control", "transformation"]
    }
    </script>
</head>
<body><h1>Fallback title</h1></body>
</html>
`
