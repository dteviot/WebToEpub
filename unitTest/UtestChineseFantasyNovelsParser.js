"use strict";

module("ChineseFantasyNovelsParser");

test("getChapterUrls", function (assert) {
    let dom = new DOMParser().parseFromString(ChineseFantasyNovelsToCSample, "text/html");
    let done = assert.async();
    let parser = new ChineseFantasyNovelsParser();
    parser.getChapterUrls(dom).then(function(chapterUrls) {
        assert.equal(chapterUrls.length, 2);
        assert.deepEqual(chapterUrls[1], {
            newArc: null,
            sourceUrl: "https://m.chinesefantasynovels.com/421/91906.html",
            title: "Chapter 2: Living with great joy, dying with no regrets"
        });
        done();
    });
});

test("extractTitleImpl", function (assert) {
    let dom = new DOMParser().parseFromString(ChineseFantasyNovelsToCSample, "text/html");
    let parser = new ChineseFantasyNovelsParser();
    let actual = parser.extractTitleImpl(dom);
    assert.equal(actual.textContent, "The Ultimate Evolution");
});

test("extractAuthor", function (assert) {
    let dom = new DOMParser().parseFromString(ChineseFantasyNovelsToCSample, "text/html");
    let parser = new ChineseFantasyNovelsParser();
    let actual = parser.extractAuthor(dom);
    assert.equal(actual.trim(), "Volume Of Soil");
});

test("findChapterTitle", function (assert) {
    let dom = new DOMParser().parseFromString(ChineseFantasyNovelsChapterSample, "text/html");
    let parser = new ChineseFantasyNovelsParser();
    let actual = parser.findChapterTitle(dom);
    assert.equal(actual.textContent, "Chapter 935: Gigantic Reproductive System");
});

test("removeUnwantedElementsFromContentElement", function (assert) {
    let dom = new DOMParser().parseFromString(ChineseFantasyNovelsChapterSample, "text/html");
    let parser = new ChineseFantasyNovelsParser();
    let content = parser.findContent(dom);
    parser.removeUnwantedElementsFromContentElement(content);
    let unwanted = [...content.querySelectorAll("div")];
    assert.equal(unwanted.length, 0);
});

let ChineseFantasyNovelsToCSample =
`<!DOCTYPE html>
<html lang="en">
<head>
    <title>The Ultimate Evolution - Volume Of Soil - Chinese Fantasy Novels</title>
    <base href="https://m.chinesefantasynovels.com/421/" />
</head>
<body>
    <div class="container">
        <div class="bookinfo">
            <div class="btitle"><h1>The Ultimate Evolution</h1><br></div>
            <a name="top"></a>
            <div class="status">Author: Volume Of Soil</div>
            <p class="stats"> <span class="fl"><b>Lastchapter: </b>Chapter 935: Gigantic Reproductive System</span> </p>
            <div class="status"><font color="#999999">Updated: </font>2018-10-20 01:37</div>
            <p class="stats"> </p>
            <div class="tuijian">
            </div>
        </div>
        <div class="inner">
            <dl class="chapterlist cate">
                <dd><a href="/421/91906.html">Chapter 2: Living with great joy, dying with no regrets</a></dd>
                <dd><a href="/421/91905.html">Chapter 1: Returning after hunting whales</a></dd>
            </dl>
            <a name="bottom"></a>
            <div class="clear"></div>
        </div>
    </div>
    <div id="footer">
    </div>
</body>
</html>`

let ChineseFantasyNovelsChapterSample =
`<!DOCTYPE html>
<html lang="en">
<head>
    <title>Chapter 935: Gigantic Reproductive System - Chinese Fantasy Novels</title>
    <base href="https://m.chinesefantasynovels.com/421/311385.html" />
</head>

<body>
    <div class="container">
        <div class="addthis_inline_share_toolbox"></div>
        <div class="article" id="main">
            <div class="inner" id="BookCon">
                <div class="ads">

                </div>
                <h1>Chapter 935: Gigantic Reproductive System</h1>
                <div class="ads"></div>
                <div id="BookText">
                        Chapter 935: Gigantic Reproductive System
                    <br />
                    <br />    Translator: Sean88888  Editor: Elkassar1
                    <div class="adsb"></div>
                    <div class="link"><a href='/421/311146.html ' class="myButton">Previous</a>            </div>
                </div>
            </div>
        </div><a name="bottom"></a>
   </div>
</body>
</html>
`
