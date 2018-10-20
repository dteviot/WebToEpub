"use strict";

module("Ficwad");

test("findChapters_storyIndex", function (assert) {
    let dom = new DOMParser().parseFromString(FicWadStoryIndexSample, "text/html");
    let done = assert.async();
    let parser = new FicwadParser();
    parser.getChapterUrls(dom).then(function(chapterUrls) {
        assert.equal(chapterUrls.length, 4);
        assert.deepEqual(chapterUrls[3], {
            newArc: null,
            sourceUrl: "https://ficwad.com/story/51728",
            title: "I Love You"
        });
        done();
    });
});

test("extractTitleImpl_storyIndex", function (assert) {
    let dom = new DOMParser().parseFromString(FicWadStoryIndexSample, "text/html");
    let parser = new FicwadParser();
    let actual = parser.extractTitleImpl(dom);
    assert.equal(actual.textContent, "Beyond the Mask");
});

test("findChapters_chapter", function (assert) {
    let dom = new DOMParser().parseFromString(FicWadChapterSample, "text/html");
    let done = assert.async();
    let parser = new FicwadParser();
    parser.getChapterUrls(dom).then(function(chapterUrls) {
        assert.equal(chapterUrls.length, 7);
        assert.deepEqual(chapterUrls[6], {
            sourceUrl: "https://ficwad.com/story/24278",
            title: "6. Part Six--The Last Chapter"
        });
        done();
    });
});

test("extractTitleImpl_chapter", function (assert) {
    let dom = new DOMParser().parseFromString(FicWadChapterSample, "text/html");
    let parser = new FicwadParser();
    let actual = parser.extractTitleImpl(dom);
    assert.equal(actual.textContent, "The Fourth Promise");
});

let FicWadStoryIndexSample =
`<!DOCTYPE html>
<html>
<head>
    <title>Beyond the Mask :: FicWad: fresh-picked original and fan fiction</title>
    <base href="https://ficwad.com/story/33404" />
</head>
<body>
    <div id="contents">
        <div id="story">
            <h2>
                <a href="/">Categories</a> &gt; <a href="/category/7">Movies</a> &gt;
                <a href="/category/832">V for Vendetta</a>
            </h2>
            <div class="storylist">
                <div class="R Lady141220 score2 adjAmbiance complete">
                    <h4><a href="/story/33404">Beyond the Mask</a></h4>
                    <span class="author">by <a href="/a/Lady141220">Lady141220</a></span>
                    <span class="reviews"><a href="/story/33404/reviews">0 reviews</a></span>
                    <blockquote class="summary"><p>Evey recalls her experience with V, but sometimes the past is not always ready to die.</p></blockquote>
                    <p class="meta">Category:&nbsp;<a href="/category/832">V for Vendetta</a> - Rating:&nbsp;R - Genres:&nbsp;Angst, Drama, Romance - <span class="story-warnings">Warnings:&nbsp;<a href="/help#38" title="Medium Spoilers">[!!] </a> <a href="/help#38" title="Sex">[X] </a></span> - Chapters:&nbsp;4 - Published:&nbsp;<span data-ts="1162749336" title="2006-11-05T17:55:36+00:00">2006-11-05</span> - Updated:&nbsp;<span data-ts="1186876815" title="2007-08-12T00:00:15+00:00">2007-08-12</span>  - 2928&nbsp;words - Complete</p><div class="score"><span class="score_number">2</span><span class="score_adjective">Ambiance</span></div>
                </div>
            </div>
            <div id="chapters">
                <ul class="storylist">
                    <li class="R Lady141220 score3 adjAmbiance incomplete"><h4><a href="/story/42752">Here without you!</a></h4>/li>
                    <li class="R Lady141220 score2 adjOriginal incomplete"><h4><a href="/story/42753">All of me</a></h4></li>
                    <li class="R Lady141220 score0 adjUnrated incomplete"><h4><a href="/story/44319">The Gift</a></h4></li>
                    <li class="R Lady141220 score0 adjUnrated incomplete"><h4><a href="/story/51728">I Love You</a></h4></li>
                </ul>
            </div><div id="storyfoot"><a href="/account/new">Sign up</a> to rate and review this story</div>
        </div>
    </div>
</body>
</html>
`

let FicWadChapterSample =
`<!DOCTYPE html>
<html">
<head>
    <title>The Fourth Promise: Part One :: FicWad: fresh-picked original and fan fiction</title>
    <base href="https://ficwad.com/story/24273" />
</head>
<body>
<div id="contents">
<div id="story">
    <h2><a href="/">Categories</a> &gt; <a href="/category/7">Movies</a> &gt; <a href="/category/830">Shaun of the Dead</a> &gt; <a href="/story/24272">The Fourth Promise</a></h2>
    <div class="pure-u-1 pure-u-md-3-5 story-chapters">
        <form enctype="multipart/form-data" method="POST" name="chapterlist" action="/goto/story" class="chapterlist pure-form">
            <select name="goto">
                <option value="/story/24272">Story Index</option>
                <option value="/story/24273" selected="selected">1. Part One</option>
                <option value="/story/24274">2. Part Two</option>
                <option value="/story/24275">3. Part Three</option>
                <option value="/story/24276">4. Part Four</option>
                <option value="/story/24277">5. Part Five</option>
                <option value="/story/24278">6. Part Six--The Last Chapter</option>
            </select><a href="/story/24274" class="pure-button">❯</a>
        </form>
    </div>
    <div id="storytext" class="pure-u-1">
        <strong>TITLE: </strong>The Fourth Promise<br>
    </div>
</div>
</div>
</body>
</html>
`
