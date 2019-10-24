
"use strict";

module("StocxParser");

test("isHexChar", function (assert) {
    assert.ok(StocxParser.isHexChar("0"));
    assert.notOk(StocxParser.isHexChar("o"));
    assert.ok(StocxParser.isHexChar("A"));
    assert.ok(StocxParser.isHexChar("f"));
    assert.notOk(StocxParser.isHexChar("G"));
});

test("isEncodeddByte", function (assert) {
    let raw = "清透的七彩碧玺触手温凉，她本已变得面无表情的脸上再次%e9%9c%b2%e5%87%ba浅笑。";
    let actual = StocxParser.isEncodeddByte(raw, 26);
    assert.equal(actual, true);
    assert.equal(StocxParser.isEncodeddByte(raw, 47), false);
});

test("fixMangledText", function (assert) {
    let mangled = "清透的七彩碧玺触手温凉，她本已变得面无表情的脸上再次%e9%9c%b2%e5%87%ba浅笑。";
    let actual = StocxParser.fixMangledText(mangled);
    assert.equal(actual, "清透的七彩碧玺触手温凉，她本已变得面无表情的脸上再次露出浅笑。");
});

test("customRawDomToContentStep", function (assert) {
    let dom = new DOMParser().parseFromString(StocxChapterSample, "text/html");
    let parser = new StocxParser();
    let content = dom.querySelector("#BookContent")
    let actual = parser.customRawDomToContentStep(null, content);
    assert.notOk(content.textContent.includes("%"));
});

let StocxChapterSample =
`<!DOCTYPE html>
<html lang="en">
<head>
    <title>《醉玲珑》作者：十四夜_第2頁_全文在線閱讀_思兔</title>
    <base href="https://www.sto.cx/book-40390-2.html" />
</head>

<body>
    <h1>《醉玲珑》作者：十四夜_第2頁</h1>
    <div id="BookContent">
        色？<br /><br />
        那么她就补充给他：从左边数第四棵，晚春细雨飘过以后的颜色。<br /><br />
        宁文清吃了一惊，%e8%84%b1口道：“你是谁？”不觉中紧紧将%e5%94%87角一抿，水里倒影却丹%e5%94%87微启：“我叫凤卿尘，可能……从此以后你才是凤卿尘了。”<br />
        清透的七彩碧玺触手温凉，她本已变得面无表情的脸上再次%e9%9c%b2%e5%87%ba浅笑。<br /><br />
    </div>
</body>
</html>`
