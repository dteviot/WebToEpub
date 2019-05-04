
"use strict";

module("LightNovelsTranslationsParser");

QUnit.test("getLastPaginationUrl", function (assert) {
    let dom = new DOMParser().parseFromString(
        LightNovelsTranslationsToCSample, "text/html");
    let url = LightNovelsTranslationsParser.getLastPaginationUrl(dom);
    assert.equal(url, LightNovelPaginationUrl);
});

QUnit.test("getUrlsOfTocPages", function (assert) {
    let dom = new DOMParser().parseFromString(
        LightNovelsTranslationsToCSample, "text/html");
    let urls = LightNovelsTranslationsParser.getUrlsOfTocPages(dom);
    assert.equal(urls.length, 52);
    assert.equal(urls[51], LightNovelPaginationUrl);
});

QUnit.test("extractPartialChapterList", function (assert) {
    let dom = new DOMParser().parseFromString(
        LightNovelsTranslationsToCSample, "text/html");
    let chapters = LightNovelsTranslationsParser.extractPartialChapterList(dom);
    assert.equal(chapters.length, 4);
    assert.equal(chapters[0].sourceUrl, "https://lightnovelstranslations.com/yhko-volume-6-chapter-27/");
});

QUnit.test("linkToRealChapter", function (assert) {
    let dom = new DOMParser().parseFromString(
        LightNovelsTranslationsBlogSample, "text/html");
    let urls = new LightNovelsTranslationsParser().linkToRealChapter(dom);
    assert.equal(urls[0].href, "https://lightnovelstranslations.com/yuusha-ni-horobosareru-dake-no-kantan-na-oshigoto-desu/volume-6-chapter-26/");
});

let LightNovelPaginationUrl = "https://lightnovelstranslations.com/category/yuusha-ni-horobosareru/page/53/";

let LightNovelsTranslationsToCSample =
`<!DOCTYPE html>

<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
    <title>Maou no Hajimekata</title>
    <base href="https://lightnovelstranslations.com/category/yuusha-ni-horobosareru/" />
</head>
<body>
    <h2 class="entry-title">
        <a href="https://lightnovelstranslations.com/yhko-volume-6-chapter-27/" title="Permalink to YHKO Volume 6, Chapter 27" rel="bookmark">YHKO Volume 6, Chapter 27</a>
    </h2>
    <h2 class="entry-title">
        <a href="https://lightnovelstranslations.com/yhko-volume-6-chapter-26/" title="Permalink to YHKO Volume 6, Chapter 26" rel="bookmark">YHKO Volume 6, Chapter 26</a>
    </h2>
    <h2 class="entry-title">
        <a href="https://lightnovelstranslations.com/yhko-volume-6-chapter-25/" title="Permalink to YHKO Volume 6, Chapter 25" rel="bookmark">YHKO Volume 6, Chapter 25</a>
    </h2>
    <h2 class="entry-title">
        <a href="https://lightnovelstranslations.com/yhko-volume-6-chapter-24/" title="Permalink to YHKO Volume 6, Chapter 24" rel="bookmark">YHKO Volume 6, Chapter 24</a>
    </h2>
    <div class="pagination_container">
        <nav class="pagination">
            <span class="current">1</span><a href="https://lightnovelstranslations.com/category/yuusha-ni-horobosareru/page/2/" class="inactive">2</a>
            <a href="https://lightnovelstranslations.com/category/yuusha-ni-horobosareru/page/3/" class="inactive">3</a>
            <a href="https://lightnovelstranslations.com/category/yuusha-ni-horobosareru/page/2/">›</a>
            <a href="https://lightnovelstranslations.com/category/yuusha-ni-horobosareru/page/53/">»</a>
        </nav>
    </div>
</body>
</html>
`

let LightNovelsTranslationsBlogSample =
`<!DOCTYPE html>

<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
    <title>YHKO Volume 6, Chapter 26</title>
    <base href="https://lightnovelstranslations.com/yhko-volume-6-chapter-26/" />
</head>
<body>
    <div class="entry-content">
        <p>Hey there guys. Here is the second regular chapter for the week. Enjoy.</p>
        <p>===&gt;<a href="https://lightnovelstranslations.com/yuusha-ni-horobosareru-dake-no-kantan-na-oshigoto-desu/volume-6-chapter-26/">CLICK HERE TO READ</a>&lt;===</p>
        <p>And remember, if you cannot see the full chapter, please try refreshing the page or clearing the cache for your browser.</p>
    </div>
</body>
</html>
`
