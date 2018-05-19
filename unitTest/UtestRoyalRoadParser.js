
"use strict";

module("UtestRoyalRoadParser");

QUnit.test("removeOlderChapterNavJunk", function (assert) {
    let dom = TestUtils.makeDomWithBody(
        "<h1 id=\"e1\">&lt;--&gt;</h1>" +
        "<div id=\"d1\"><p id=\"p1\">1</p><p id=\"p2\">2</p><p id=\"p2\">&lt;--&gt;</p></div>" +
        "<h2 id=\"e2\">&lt;--&gt;</h2>"
    );
    assert.equal(dom.body.textContent, "<-->12<--><-->");
    RoyalRoadParser.removeOlderChapterNavJunk(dom.body);
    assert.equal(dom.querySelector("h1").textContent, "");
    assert.equal(dom.querySelector("div").textContent, "12");
    assert.equal(dom.body.textContent, "12");
});

QUnit.test("makeHiddenElementsVisible", function (assert) {
    let dom = TestUtils.makeDomWithBody(
        "<div style=\"display: none;\">Spoiler</div>"
    );
    let div = dom.querySelector("div");
    new RoyalRoadParser().makeHiddenElementsVisible(dom.body);
    assert.equal(div.outerHTML, "<div>Spoiler</div>");
});
