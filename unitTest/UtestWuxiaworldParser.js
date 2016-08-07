
"use strict";

module("WuxiaworldParser");

function dummyWuxiaDoc() {
    let dom = new DOMParser().parseFromString(
        "<html>" +
           "<head><title></title></head>" +
           "<body>" +
           "<p>" +
                "<a href=\"http://www.wuxiaworld.com/wmw-index/wmw-chapter-1/\">Previous Chapter</a>" +
                "<span style=\"float: right\"><a href=\"http://www.wuxiaworld.com/wmw-index/wmw-chapter-3\">Next Chapter</a></span>" +
            "</p>" +
            "<sup class='footnote'><a href='#fn-63064-1' id='fnref-63064-1' onclick='return fdfootnote_show(63064)'>1</a></sup>" +
           "<p>" +
                "<a href=\"http://www.wuxiaworld.com/wmw-index/wmw-chapter-1\">Previous Chapter</a>" +
                "<span style=\"float: right\"><a href=\"http://www.wuxiaworld.com/wmw-index/wmw-chapter-3/\">Next Chapter</a></span>" +
            "</p>" +
            "<ol>" +
                "<li id=\"fn-63064-1\" tabindex=\"-1\"> Literal Translation pretty much her wannabe escorts/protectors <span class=\"footnotereverse\">" +
                "<a href=\"#fnref-63064-1\"><img draggable=\"false\" class=\"emoji\" alt=\"...\" src=\"https://s.w.org/images/core/emoji/72x72/21a9.png\"></a></span></li>" +
            "</ol>" +
            // this bit is malformed HTML
            "<hr>Previous Chapter <span style=\"float: right;\"><a title=\"7 Killers - Chapter 2\" href=\"http://www.wuxiaworld.com/wmw-index/wmw-chapter-3\">Next Chapter</a> </span></p>" +
            "</body></html>",
        "text/html"
    );

    // Hack, if I don't do this, on Chrome the href value for <a> tags with just a hash is blank.
    util.setBaseTag("http://wuxiaworld.com/wmw-index.html", dom);

    return dom;
}

test("removeUnwantedElementsFromContentElement", function (assert) {
    let dom = dummyWuxiaDoc();
    let parser = new WuxiaworldParser();
    parser.chapters = [
        { sourceUrl: "http://www.wuxiaworld.com/wmw-index/wmw-chapter-1/" },
        { sourceUrl: "http://www.wuxiaworld.com/wmw-index/wmw-chapter-3" }
    ];
    let body = parser.removeNextAndPreviousChapterHyperlinks(dom.body);
    assert.equal(dom.body.innerHTML,
           "<sup class=\"footnote\"><a href=\"#fn-63064-1\" id=\"fnref-63064-1\" onclick=\"return fdfootnote_show(63064)\">1</a></sup>" +
            "<ol>" +
                "<li id=\"fn-63064-1\" tabindex=\"-1\"> Literal Translation pretty much her wannabe escorts/protectors <span class=\"footnotereverse\">" +
                "<a href=\"#fnref-63064-1\"><img draggable=\"false\" class=\"emoji\" alt=\"...\" src=\"https://s.w.org/images/core/emoji/72x72/21a9.png\"></a></span></li>" +
            "</ol>" +
            "<hr>Previous Chapter <p></p>"
    );
});

test("removeOnClick", function (assert) {
    let dom = dummyWuxiaDoc();
    let parser = new WuxiaworldParser();
    let body = parser.removeOnClick(dom.body);
    let link = dom.getElementById("fnref-63064-1");
    assert.equal(link.outerHTML, "<a href=\"#fn-63064-1\" id=\"fnref-63064-1\">1</a>");
});

test("removeEmoji", function (assert) {
    let dom = dummyWuxiaDoc();
    let parser = new WuxiaworldParser();
    let body = parser.removeEmoji(dom.body);
    let link = util.getElement(dom.getElementById("fn-63064-1"), "a");
    assert.equal(link.outerHTML, "<a href=\"#fnref-63064-1\">...</a>");
});

test("normalizeUrl", function (assert) {
    let testUrl1 = "http://www.wuxiaworld.com/wmw-index/wmw-chapter-2";
    let testUrl2 = "http://www.wuxiaworld.com/wmw-index/wmw-chapter-2/";

    let parser = new WuxiaworldParser();
    assert.equal(parser.normalizeUrl(testUrl1), testUrl1);
    assert.equal(parser.normalizeUrl(testUrl2), testUrl1);
});
