"use strict";

module("NovelArrowParser");

QUnit.test("parses story metadata and chapter links", function(assert) {
    let dom = new DOMParser().parseFromString(NovelArrowStorySample, "text/html");
    let parser = new NovelArrowParser();

    let chapters = parser.getChapterUrls(dom);
    assert.equal(chapters.length, 2);
    assert.equal(chapters[0].sourceUrl, "https://novelarrow.com/chapter/i-sell-gacha-jars-in-one-piece/chapter-1-the-jar-merchant");
    assert.equal(chapters[0].title, "Chapter 1: The Jar Merchant");
    assert.equal(chapters[1].title, "Chapter 2: Little Luffy");

    assert.equal(parser.extractTitleImpl(dom).textContent.trim(), "I Sell Gacha Jars in One Piece");
    assert.equal(parser.extractAuthor(dom), "ElvenKing20");
    assert.equal(parser.extractSubject(dom), "Action, Adventure");
    assert.equal(parser.findCoverImageUrl(dom), "https://images.novelarrow.com/novel_480_720/i-sell-gacha-jars-in-one-piece.jpg");
});

QUnit.test("finds cover image from og:image meta", function(assert) {
    let dom = new DOMParser().parseFromString(NovelArrowOgImageStorySample, "text/html");
    let parser = new NovelArrowParser();

    assert.equal(parser.findCoverImageUrl(dom), "https://images.novelarrow.com/novel_480_720/i-sell-gacha-jars-in-one-piece.jpg");
});

QUnit.test("uses meta[name=author] when author link is absent", function(assert) {
    let dom = new DOMParser().parseFromString(NovelArrowAuthorMetaSample, "text/html");
    let parser = new NovelArrowParser();

    assert.equal(parser.extractAuthor(dom), "ElvenKing20");
});

QUnit.test("gracefully handles missing author and cover image fields", function(assert) {
    let dom = new DOMParser().parseFromString(NovelArrowMissingMetadataSample, "text/html");
    let parser = new NovelArrowParser();

    assert.equal(parser.extractAuthor(dom), "<unknown>");
    assert.equal(parser.findCoverImageUrl(dom), null);
});

QUnit.test("prefers embedded chapter names over generic Read Now links", function(assert) {
    let dom = new DOMParser().parseFromString(NovelArrowEmbeddedChapterListSample, "text/html");
    let parser = new NovelArrowParser();

    let chapters = parser.getChapterUrls(dom);
    assert.equal(chapters.length, 2);
    assert.equal(chapters[0].title, "Chapter 1: The Jar Merchant");
    assert.equal(chapters[0].sourceUrl, "https://novelarrow.com/chapter/i-sell-gacha-jars-in-one-piece/chapter-1-the-jar-merchant");
    assert.equal(chapters[1].title, "Chapter 2: Little Luffy");
});

QUnit.test("recognises Cloudflare challenge responses", function(assert) {
    let parser = new NovelArrowParser();
    assert.true(parser.isCustomError({responseXML: {title: "Just a moment..."}}));
    assert.false(parser.isCustomError({responseXML: {title: "Normal page"}}));
});

let NovelArrowStorySample = `<!DOCTYPE html>
<html lang="en">
<head>
    <title>I Sell Gacha Jars in One Piece</title>
</head>
<body>
    <main>
        <h1>I Sell Gacha Jars in One Piece</h1>
        <img src="https://images.novelarrow.com/novel_480_720/i-sell-gacha-jars-in-one-piece.jpg" alt="cover">
        <a href="https://novelarrow.com/author/elvenking20">ElvenKing20</a>
        <a href="https://novelarrow.com/genre/action">Action</a>
        <a href="https://novelarrow.com/genre/adventure">Adventure</a>
        <a href="https://novelarrow.com/chapter/i-sell-gacha-jars-in-one-piece/chapter-1-the-jar-merchant">Chapter 1: The Jar Merchant</a>
        <a href="https://novelarrow.com/chapter/i-sell-gacha-jars-in-one-piece/chapter-2-little-luffy">Chapter 2: Little Luffy</a>
    </main>
</body>
</html>`;

let NovelArrowOgImageStorySample = `<!DOCTYPE html>
<html lang="en">
<head>
    <title>I Sell Gacha Jars in One Piece</title>
    <meta property="og:image" content="https://images.novelarrow.com/novel_480_720/i-sell-gacha-jars-in-one-piece.jpg">
</head>
<body>
    <main>
        <h1>I Sell Gacha Jars in One Piece</h1>
        <a href="https://novelarrow.com/author/elvenking20">ElvenKing20</a>
        <a href="https://novelarrow.com/genre/action">Action</a>
        <a href="https://novelarrow.com/genre/adventure">Adventure</a>
    </main>
</body>
</html>`;

let NovelArrowMissingMetadataSample = `<!DOCTYPE html>
<html lang="en">
<head>
    <title>I Sell Gacha Jars in One Piece</title>
</head>
<body>
    <main>
        <h1>I Sell Gacha Jars in One Piece</h1>
        <a href="https://novelarrow.com/genre/action">Action</a>
        <a href="https://novelarrow.com/genre/adventure">Adventure</a>
    </main>
</body>
</html>`;

let NovelArrowAuthorMetaSample = `<!DOCTYPE html>
<html lang="en">
<head>
    <title>I Sell Gacha Jars in One Piece</title>
    <meta name="author" content="ElvenKing20">
</head>
<body>
    <main>
        <h1>I Sell Gacha Jars in One Piece</h1>
    </main>
</body>
</html>`;

let NovelArrowEmbeddedChapterListSample = `<!DOCTYPE html>
<html lang="en">
<head>
    <title>I Sell Gacha Jars in One Piece</title>
    <link rel="canonical" href="https://novelarrow.com/novel/i-sell-gacha-jars-in-one-piece">
    <script>
        window.__INITIAL_STATE__ = {"props":{"pageProps":{"initialChapterList":[{"chapter_id":"chapter-1-the-jar-merchant","chapter_name":"Chapter 1: The Jar Merchant"},{"chapter_id":"chapter-2-little-luffy","chapter_name":"Chapter 2: Little Luffy"}]}}};
    </script>
</head>
<body>
    <main>
        <a href="/chapter/i-sell-gacha-jars-in-one-piece/chapter-1-the-jar-merchant">Read Now</a>
        <a href="/chapter/i-sell-gacha-jars-in-one-piece/chapter-2-little-luffy">Chapter 2: Little Luffy</a>
    </main>
</body>
</html>`;
