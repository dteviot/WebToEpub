
"use strict";

module("QinxiaoshuoParser");

QUnit.test("isPossibleNextPage", function (assert) {
    let fetchedUrls = new Set();  
    let dom = new DOMParser().parseFromString("<a href=\"http://qinxiaoshuo.com/read/5d7.html\">查看目录</a>", "text/html");
    let link = dom.querySelector("a");
    assert.notOk(QinxiaoshuoParser.isPossibleNextPage(link, fetchedUrls));
    link.href = "http://qinxiaoshuo.com/read/5d7.html?xiaoshuo=3";
    assert.ok(QinxiaoshuoParser.isPossibleNextPage(link, fetchedUrls));
    fetchedUrls.add(link.href);
    assert.notOk(QinxiaoshuoParser.isPossibleNextPage(link, fetchedUrls));
});

QUnit.test("urlOfNextPageOfChapter", function (assert) {
    let fetchedUrls = new Set();
    fetchedUrls.add("http://qinxiaoshuo.com/read/0/1545/5d77d0dd56fec85e5b0ffd1a.html?xiaoshuo=1");
    let dom = new DOMParser().parseFromString(NovelSpreadParserUtestQinxiaoshuoParserSample1, "text/html");
    let actual = QinxiaoshuoParser.urlOfNextPageOfChapter(dom, fetchedUrls);
    assert.equal(actual, "http://qinxiaoshuo.com/read/0/1545/5d77d0dd56fec85e5b0ffd1a.html?xiaoshuo=2");
    dom = new DOMParser().parseFromString(NovelSpreadParserUtestQinxiaoshuoParserSample2, "text/html");
    actual = QinxiaoshuoParser.urlOfNextPageOfChapter(dom, fetchedUrls);
    assert.equal(actual, null);
});

QUnit.test("copyContentNodes", function (assert) {
    let copyTo = new DOMParser().parseFromString(NovelSpreadParserUtestQinxiaoshuoParserSample1, "text/html");
    let copyFrom = new DOMParser().parseFromString(NovelSpreadParserUtestQinxiaoshuoParserSample2, "text/html");
    QinxiaoshuoParser.copyContentNodes(copyTo, copyFrom);
    let actual = new QinxiaoshuoParser().findContent(copyTo);
    assert.equal(actual.innerHTML, "line1<br>line2<div>line3<br>line4</div>");
});

let NovelSpreadParserUtestQinxiaoshuoParserSample1 =
`<!DOCTYPE html>
<html lang="en">
<head>
  <title>OVERLORD_第一章_亲小说网</title>
  <base href="http://qinxiaoshuo.com/read/0/1545/5d77d0dd56fec85e5b0ffd1a.html" />
</head>
<body>
    <div class="message">
      <div class="buttons">
        <a href="//qinxiaoshuo.com/book/OVERLORD">查看目录</a>
        <a id="change_btn" href="javascript:user_config.use_simplified = !user_config.use_simplified;change();">切換繁體</a>
      </div>
      <div id="chapter_content">line1<br>line2</div>
      <div class="buttons">
          <p><a rel="nofollow" href="?xiaoshuo=2">下一页</a></p>
          <p><a href="//qinxiaoshuo.com/read/0/1545/5d77d0dc56fec85e5b0ffd19.html">上一章</a></p>
      </div>
    </div>
</body>
</html>`

let NovelSpreadParserUtestQinxiaoshuoParserSample2 =
`<!DOCTYPE html>
<html lang="en">
<head>
  <title>OVERLORD_第一章_亲小说网</title>
  <base href="http://qinxiaoshuo.com/read/0/1545/5d77d0dd56fec85e5b0ffd1a.html?xiaoshuo=2" />
</head>
<body class="p-details">
  <div class="main-body" data-novel="115" data-collcetion=""></div>
    <div class="message">
      <div class="buttons">
        <a href="//qinxiaoshuo.com/book/OVERLORD">查看目录</a>
        <a id="change_btn" href="javascript:user_config.use_simplified = !user_config.use_simplified;change();">切換繁體</a>
      </div>
      <div id="chapter_content">line3<br>line4</div>
      <div class="buttons">
          <p><a rel="nofollow" href="?xiaoshuo=1">下一页</a></p>
          <p><a href="//qinxiaoshuo.com/read/0/1545/5d77d0dc56fec85e5b0ffd19.html">上一章</a></p>
      </div>
    </div>
</body>
</html>`
