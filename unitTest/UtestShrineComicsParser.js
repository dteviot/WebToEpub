
"use strict";

module("ShrineComicsParser");

QUnit.test("extractImageUrls", function (assert) {
  let dom = new DOMParser().parseFromString(ShrineComicsChapterSamplePage, "text/html");
  let urls = ShrineComicsParser.extractImageUrls(dom);
  assert.equal(urls.length, 3);
  assert.equal(urls[0], "https://cdn2.zetrofm.com/comics/28/chapter_images/28-chapter-0/68dfa3bf6c07c.webp");
  assert.equal(urls[1], "https://cdn2.zetrofm.com/comics/28/chapter_images/28-chapter-0/68dfa3c013792.webp");
  assert.equal(urls[2], "https://cdn2.zetrofm.com/comics/28/chapter_images/28-chapter-0/68dfa3c099abc.webp");
});

QUnit.test("extractImageUrlsWithEscapedSlashes", function (assert) {
  let dom = new DOMParser().parseFromString(ShrineComicsChapterSampleEscapedPage, "text/html");
  let urls = ShrineComicsParser.extractImageUrls(dom);
  assert.equal(urls.length, 2);
  assert.equal(urls[0], "https://cdn2.zetrofm.com/comics/28/chapter_images/28-chapter-0/68dfa3bf6c07c.webp");
  assert.equal(urls[1], "https://cdn2.zetrofm.com/comics/28/chapter_images/28-chapter-0/68dfa3c013792.webp");
});

QUnit.test("extractImageUrlsEmpty", function (assert) {
  let dom = new DOMParser().parseFromString(ShrineComicsChapterSampleNoImagesPage, "text/html");
  let urls = ShrineComicsParser.extractImageUrls(dom);
  assert.equal(urls.length, 0);
});

QUnit.test("getChapterUrls", async function (assert) {
  let dom = new DOMParser().parseFromString(ShrineComicsSeriesSamplePage, "text/html");
  let parser = new ShrineComicsParser();
  let chapters = await parser.getChapterUrls(dom);
  assert.equal(chapters.length, 2);
  assert.equal(chapters[0].sourceUrl, "https://shrinecomics.com/comic/28/chapter/164");
  assert.equal(chapters[0].title, "Chapter 0");
  assert.equal(chapters[1].sourceUrl, "https://shrinecomics.com/comic/28/chapter/165");
  assert.equal(chapters[1].title, "Chapter 1");
});

QUnit.test("getChapterUrlsIgnoresNonTocLinks", async function (assert) {
  let dom = new DOMParser().parseFromString(ShrineComicsSeriesSampleWithStrayLinksPage, "text/html");
  let parser = new ShrineComicsParser();
  let chapters = await parser.getChapterUrls(dom);
  assert.equal(chapters.length, 2);
  assert.equal(chapters[0].sourceUrl, "https://shrinecomics.com/comic/28/chapter/164");
  assert.equal(chapters[1].sourceUrl, "https://shrinecomics.com/comic/28/chapter/165");
});

let ShrineComicsChapterSamplePage =
`<!DOCTYPE html>
<html lang="en">
<head>
<title>Dimensional Resources Chapter 0 | Shrine Comics</title>
</head>
<body>
<script id="__NUXT_DATA__" type="application/json">
["preload","https://cdn2.zetrofm.com/comics/28/chapter_images/28-chapter-0/68dfa3bf6c07c.webp",
"https://cdn1.zetrofm.com/comics/28/comics_cover_img/cover.webp",
"https://cdn2.zetrofm.com/comics/28/chapter_images/28-chapter-0/68dfa3bf6c07c.webp",
"https://cdn2.zetrofm.com/comics/28/chapter_images/28-chapter-0/68dfa3c013792.webp",
"https://cdn2.zetrofm.com/comics/28/chapter_images/28-chapter-0/68dfa3c099abc.webp"]
</script>
</body>
</html>
`

let ShrineComicsChapterSampleEscapedPage =
`<!DOCTYPE html>
<html lang="en">
<head>
<title>Dimensional Resources Chapter 0 | Shrine Comics</title>
</head>
<body>
<script id="__NUXT_DATA__" type="application/json">
["preload","https:\\/\\/cdn2.zetrofm.com\\/comics\\/28\\/chapter_images\\/28-chapter-0\\/68dfa3bf6c07c.webp",
"https:\\/\\/cdn1.zetrofm.com\\/comics\\/28\\/comics_cover_img\\/cover.webp",
"https:\\/\\/cdn2.zetrofm.com\\/comics\\/28\\/chapter_images\\/28-chapter-0\\/68dfa3bf6c07c.webp",
"https:\\/\\/cdn2.zetrofm.com\\/comics\\/28\\/chapter_images\\/28-chapter-0\\/68dfa3c013792.webp"]
</script>
</body>
</html>
`

let ShrineComicsChapterSampleNoImagesPage =
`<!DOCTYPE html>
<html lang="en">
<head>
<title>Dimensional Resources Chapter 0 | Shrine Comics</title>
</head>
<body>
<script id="__NUXT_DATA__" type="application/json">
["preload","https://cdn1.zetrofm.com/comics/28/comics_cover_img/cover.webp"]
</script>
</body>
</html>
`

let ShrineComicsSeriesSamplePage =
`<!DOCTYPE html>
<html lang="en">
<head>
<base href="https://shrinecomics.com/comics/28" />
<title>Dimensional Resources | Shrine Comics</title>
</head>
<body>
<a href="/comic/28/chapter/164"><img alt="Chapter 0" src="x.webp"/><p class="font-semibold">Chapter 0</p></a>
<a href="/comic/28/chapter/165"><img alt="Chapter 1" src="y.webp"/><p class="font-semibold">Chapter 1</p></a>
</body>
</html>
`

let ShrineComicsSeriesSampleWithStrayLinksPage =
`<!DOCTYPE html>
<html lang="en">
<head>
<base href="https://shrinecomics.com/comics/28" />
<title>Dimensional Resources | Shrine Comics</title>
</head>
<body>
<a href="/blog/how-to-read/chapter/guide">How to read chapters</a>
<a href="/comic/28/chapter/164"><img alt="Chapter 0" src="x.webp"/><p class="font-semibold">Chapter 0</p></a>
<a href="/comic/28/chapter/165"><img alt="Chapter 1" src="y.webp"/><p class="font-semibold">Chapter 1</p></a>
</body>
</html>
`
