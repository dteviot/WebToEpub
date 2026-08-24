
"use strict";

module("Novel543Parser");

let Novel543MergedChapterSample =
`<!DOCTYPE html>
<html lang="zh-Hant">
<head>
    <title>第1章 危險性武器？神級間諜？ (1/2)</title>
</head>
<body>
    <div class="chapter-content px-3">
        <h1> 第1章 危險性武器？神級間諜？ (1/2) </h1>
        <div class="content py-5">
            <div class="gadBlock" data-ad="clickforce-336x280"><ins class="clickforceads" data-ad-zone="17003"></ins></div>
            <p>龍國，江城。</p>
            <p>蘇南猛的從獃滯中回過神來。</p>
            <div class="adBlock" data-ad="pubfuture-mid"><div id="pf-16164-1"></div></div>
            <p>現場的兩位嘉賓都很不看好這位16號選手。</p>
            <div><p><span style="color:#ff6666">溫馨提示: </span>優化了VIP會員的閱讀體驗</p></div>
            <div style="height: 100px;"><img src="/images/vip.png"><p>應廣大讀者的要求, 現推出VIP會員免廣告功能</p></div>
        </div>
        <br>
        <h1> 第1章 危險性武器？神級間諜？ (2/2) </h1>
        <div class="content py-5">
            <p>而社會觀察學家陳露的眉頭，卻不自覺的皺了起來。</p>
            <div class="adBlock" data-ad="tamedia-banner"></div>
            <p>他望著手中的鐵鍋和顛勺，陷入了沉思。</p>
            <div><p><span style="color:#ff6666">溫馨提示: </span>登錄用戶跨設備永久保存書架的數據</p></div>
        </div>
    </div>
    <div class="warp my-5 foot-nav">
        <a href="/0220699805/8096_1.html">上一章</a><span>|</span>
        <a href="/0220699805/dir">目錄</a><span>|</span>
        <a href="/0220699805/8096_1_2.html">下一章</a>
    </div>
</body>
</html>`;

QUnit.test("customRawDomToContentStep", function (assert) {
    let dom = new DOMParser().parseFromString(Novel543MergedChapterSample, "text/html");
    let parser = new Novel543Parser();
    let content = parser.findContent(dom);
    parser.customRawDomToContentStep({}, content);

    let headings = [...content.querySelectorAll("h1")];
    assert.equal(headings.length, 1);
    assert.equal(headings[0].textContent.trim(), "第1章 危險性武器？神級間諜？");
    assert.equal(content.querySelectorAll("div.adBlock, div.gadBlock").length, 0);
    assert.equal(content.querySelectorAll("span[style*='ff6666']").length, 0);
    assert.equal(content.querySelectorAll("img[src*='vip.png']").length, 0);
    // both parts of the chapter are still present
    let text = content.textContent;
    assert.ok(text.includes("龍國，江城。"));
    assert.ok(text.includes("陷入了沉思。"));
    assert.ok(!text.includes("溫馨提示"));
    assert.ok(!text.includes("(1/2)"));
    assert.ok(!text.includes("(2/2)"));
});

QUnit.test("preprocessRawDom", function (assert) {
    // the promo banner can sit outside div.chapter-content; it must be gone
    // before image collection runs, or it ends up packed as an orphan image
    let dom = new DOMParser().parseFromString(
        `<html><body>
            <div class="chapter-content px-3">
                <h1> 第1章 測試 (1/2) </h1>
                <p>正文。</p>
            </div>
            <div style="height: 100px;"><img src="/images/vip.png"><p>現推出VIP會員免廣告功能</p></div>
        </body></html>`,
        "text/html");
    let parser = new Novel543Parser();
    parser.preprocessRawDom(dom);

    assert.equal(dom.querySelectorAll("img[src*='vip.png']").length, 0);
    assert.equal(dom.body.textContent.includes("VIP會員免廣告"), false);
    // real chapter text untouched
    assert.ok(dom.body.textContent.includes("正文。"));
});

QUnit.test("extractTitleImpl", function (assert) {
    let dom = new DOMParser().parseFromString(Novel543MergedChapterSample, "text/html");
    let parser = new Novel543Parser();
    let title = parser.extractTitle(dom);
    assert.equal(title, "第1章 危險性武器？神級間諜？");
});

QUnit.test("extractTitleImpl-bookPage", function (assert) {
    let dom = new DOMParser().parseFromString(
        "<html><head><title>Book</title></head><body>" +
        "<section id='detail'><h1 class='title'>創業整活我最刑，身後全是妖妖靈</h1></section>" +
        "</body></html>",
        "text/html"
    );
    let parser = new Novel543Parser();
    assert.equal(parser.extractTitle(dom), "創業整活我最刑，身後全是妖妖靈");
});

function makeFootNavSample(nextHref) {
    return new DOMParser().parseFromString(
        "<html><body><div class='warp my-5 foot-nav'>" +
        "<a href='https://www.novel543.com/0220699805/8096_1.html'>上一章</a><span>|</span>" +
        "<a href='https://www.novel543.com/0220699805/dir'>目錄</a><span>|</span>" +
        `<a href="${nextHref}">下一章</a>` +
        "</div></body></html>",
        "text/html"
    );
}

QUnit.test("moreChapterTextUrl-continuation", function (assert) {
    let parser = new Novel543Parser();
    let dom = makeFootNavSample("https://www.novel543.com/0220699805/8096_1_2.html");
    let actual = parser.moreChapterTextUrl(dom, "https://www.novel543.com/0220699805/8096_1.html");
    assert.equal(actual, "https://www.novel543.com/0220699805/8096_1_2.html");
});

QUnit.test("moreChapterTextUrl-lastPart", function (assert) {
    let parser = new Novel543Parser();
    let dom = makeFootNavSample("/0220699805/8096_2.html");
    let actual = parser.moreChapterTextUrl(dom, "https://www.novel543.com/0220699805/8096_1.html");
    assert.equal(actual, null);
});

QUnit.test("moreChapterTextUrl-noSplitUrls", function (assert) {
    let parser = new Novel543Parser();
    let dom = makeFootNavSample("/0208599671/105.html");
    let actual = parser.moreChapterTextUrl(dom, "https://www.twbook.cc/0208599671/104.html");
    assert.equal(actual, null);
});
