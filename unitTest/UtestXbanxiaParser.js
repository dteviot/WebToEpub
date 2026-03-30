"use strict";

module("XbanxiaParser");

QUnit.test("parserSelection", function(assert) {
    let parser = parserFactory.fetch("https://www.xbanxia.cc/books/143300.html");
    assert.ok(parser instanceof XbanxiaParser);
});

QUnit.test("getChapterUrls", function(assert) {
    let done = assert.async();
    let dom = new DOMParser().parseFromString(XbanxiaSeriesPageSample, "text/html");

    new XbanxiaParser().getChapterUrls(dom).then(function(chapters) {
        assert.deepEqual(chapters, [
            {sourceUrl: "https://www.xbanxia.cc/books/143300/28251880.html", title: "作品相关", newArc: null},
            {sourceUrl: "https://www.xbanxia.cc/books/143300/28251886.html", title: "第1章 替嫁", newArc: null}
        ]);
        done();
    });
});

QUnit.test("findContent", function(assert) {
    let dom = new DOMParser().parseFromString(XbanxiaChapterPageSample, "text/html");
    let content = new XbanxiaParser().findContent(dom);

    assert.equal(content.id, "nr1");
    assert.ok(content.textContent.includes("章节内容"));
});

QUnit.test("findChapterTitle", function(assert) {
    let dom = new DOMParser().parseFromString(XbanxiaChapterPageSample, "text/html");
    let title = new XbanxiaParser().findChapterTitle(dom);

    assert.equal(title.textContent.trim(), "作品相关");
});

QUnit.test("findCoverImageUrl-prefersDataOriginal", function(assert) {
    let dom = new DOMParser().parseFromString(XbanxiaSeriesPageSample, "text/html");
    let actual = new XbanxiaParser().findCoverImageUrl(dom);

    assert.equal(actual, "https://image.xbanxia.cc/files/article/image/143/143300/143300s.jpg");
});

QUnit.test("removeUnwantedElementsFromContentElement", function(assert) {
    let dom = TestUtils.makeDomWithBody("<div id='nr1'><span>promo</span><script>bad()</script><p>keep</p></div>");
    let content = dom.querySelector("#nr1");

    new XbanxiaParser().removeUnwantedElementsFromContentElement(content);

    assert.equal(content.innerHTML, "<p>keep</p>");
});

QUnit.test("extractMetadata", function(assert) {
    let parser = new XbanxiaParser();
    let dom = new DOMParser().parseFromString(XbanxiaSeriesPageSample, "text/html");

    assert.equal(parser.extractTitle(dom), "嫁给残疾皇子后");
    assert.equal(parser.extractAuthor(dom), "李寂v5");
    assert.equal(parser.extractSubject(dom), "古装迷情");
    assert.equal(parser.extractLanguage(dom), "zh");
    assert.ok(parser.extractDescription(dom).includes("四皇子裴原一朝获罪"));
});

let XbanxiaSeriesPageSample =
`<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <title>嫁给残疾皇子后 - 半夏小说</title>
    <base href="https://www.xbanxia.cc/books/143300.html" />
    <meta property="og:image" content="https://image.xbanxia.cc/files/article/image/143/143300/143300s.jpg">
</head>
<body>
    <div id="content-list">
        <div class="book-intro clearfix">
            <div class="book-img">
                <img src="https://www.xbanxia.cc/static/nocover.jpg"
                    data-original="https://image.xbanxia.cc/files/article/image/143/143300/143300s.jpg"
                    alt="嫁给残疾皇子后">
            </div>
            <div class="book-describe">
                <h1>嫁给残疾皇子后</h1>
                <p>作者︰<a href="/author/%E6%9D%8E%E5%AF%82v5/">李寂v5</a></p>
                <p>類型︰古装迷情</p>
                <p>最新章节︰<a href="/books/143300/28252727.html">第164章 （正文完）</a></p>
                <div class="describe-html">
                    <p>四皇子裴原一朝获罪，从心狠手辣臭名昭著的濟北王变成了瘫痪的废人。</p>
                </div>
            </div>
        </div>
        <div class="book-list clearfix">
            <ul>
                <li><a href="/books/143300/28251880.html">作品相关</a></li>
                <li><a href="/books/143300/28251886.html">第1章 替嫁</a></li>
            </ul>
        </div>
    </div>
</body>
</html>`;

let XbanxiaChapterPageSample =
`<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <title>嫁给残疾皇子后 作品相关 - 半夏小说</title>
    <base href="https://www.xbanxia.cc/books/143300/28251880.html" />
</head>
<body>
    <article class="post clearfix">
        <header id="posthead" class="post-header clearfix">
            <h1 id="nr_title" class="post-title">作品相关</h1>
        </header>
        <div id="nr1">
            <div style="height: 0px;"></div>
            章节内容
            <span>推广</span>
            <script>bad()</script>
        </div>
    </article>
</body>
</html>`;
