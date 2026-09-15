"use strict";

module("TwkanParser");

test("customRawDomToContentStep", function (assert) {
    let dom = new DOMParser().parseFromString(TwkanChapterSample, "text/html");
    let parser = new TwkanParser();
    let content = dom.querySelector("#txtcontent0");

    parser.customRawDomToContentStep(null, content);

    let paragraphs = [...content.children].filter(e => e.nodeName === "P");
    let looseText = [...content.childNodes]
        .filter(n => n.nodeType === Node.TEXT_NODE)
        .some(n => n.textContent.trim().length !== 0);

    assert.equal(paragraphs.length, 3);
    assert.equal(paragraphs[0].textContent.trim(), "第一段");
    assert.equal(paragraphs[1].textContent.trim(), "第二段強調");
    assert.equal(paragraphs[1].querySelector("em").textContent, "強調");
    assert.equal(paragraphs[2].textContent.trim(), "已經包裹");
    assert.equal(content.querySelectorAll("br").length, 0);
    assert.notOk(looseText);
});

let TwkanChapterSample =
`<!DOCTYPE html>
<html lang="zh">
<body>
    <div id="txtcontent0">
        第一段<br /><br />
        第二段<em>強調</em><br />
        <p>已經包裹</p>
    </div>
</body>
</html>`;
