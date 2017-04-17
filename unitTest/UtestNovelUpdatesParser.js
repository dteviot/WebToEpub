
"use strict";

module("NovelUpdatesParser");


test("getPageSearchParameter", function (assert) {
    let link= document.createElement("a");
    link.href = "http://www.novelupdates.com/series/monogatari-series/?pg=25";
    let actual = NovelUpdatesParser.getPageSearchParameter(link);
    assert.equal(actual, 25);
});

test("getPageValueOfLastTocPage", function (assert) {
    let dom = TestUtils.makeDomWithBody(
        "<div class=\"digg_pagination\" style=\"\">" +
            "<em class=\"current\">1</em>" +
            "<a href=\"./?pg=2\">2</a>" +
            "<a href=\"./?pg=3\">3</a>" +
            "<span class=\"my_popup_a_open\" data-popup-ordinal=\"0\" id=\"open_97164487\">…</span>" +
            "<a href=\"./?pg=25\">25</a>" +
            "<a href=\"./?pg=2\" rel=\"next\" class=\"next_page\"> →</a>" +
        "</div>"
    );

    let div = util.getElement(dom, "div");
    let actual = NovelUpdatesParser.getPageValueOfLastTocPage(div);
    assert.equal(actual, 25)
});
