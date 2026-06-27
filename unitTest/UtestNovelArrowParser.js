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
