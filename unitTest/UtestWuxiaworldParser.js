
"use strict";

module("WuxiaworldParser");

function dummyWuxiaDoc() {
    let dom = TestUtils.makeDomWithBody(
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
        "<hr>Previous Chapter <span style=\"float: right;\"><a title=\"7 Killers - Chapter 2\" href=\"http://www.wuxiaworld.com/wmw-index/wmw-chapter-3\">Next Chapter</a> </span></p>"
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

test("removeEmoji", function (assert) {
    let dom = dummyWuxiaDoc();
    let parser = new WuxiaworldParser();
    let body = parser.removeEmoji(dom.body);
    let link = dom.querySelector("#fn-63064-1 a");
    assert.equal(link.outerHTML, "<a href=\"#fnref-63064-1\">...</a>");
});

test("getArcName", function (assert) {
    let done = assert.async();
    let dom = dummyWuxiaDocWithArcNames();
    let parser = new WuxiaworldParser();
    parser.getChapterUrls(dom).then(function (chapters) {
        assert.equal(chapters.length, 6);
        assert.equal(chapters[0].newArc, "Book 1 Patriarch Reliance");
        assert.equal(chapters[1].newArc, null);
        assert.equal(chapters[2].newArc, "Book 2 Cutting Into the Southern Domain");
        assert.equal(chapters[3].newArc, null);
        assert.equal(chapters[4].newArc, null);
        assert.equal(chapters[5].newArc, null);
        done();
    });
});

test("cleanCollapseomatic", function (assert) {
    let dom = TestUtils.makeDomWithBody(
        "<p><strong><span class=\"collapseomatic \" id=\"id129\" tabindex title=\"Chapter 417 (Click to show &quote; spoiler&quote; title)\">Chapter 417 (Click to show \"spoiler\" title)</span></strong></p>" +
        "<div id=\"target-id129\" class=\"collapseomatic_content \" style=\"display: none;\"><strong>" +
        "<p>Chapter 417: The Resurrection Lily Suddenly Makes a Move!</p>" +
        "</strong><p><strong></strong><br>" +
        "</p></div>"
    );
    let content = dom.body;
    WuxiaworldParser.cleanCollapseomatic(content);
    assert.equal(content.innerHTML, 
        "<p><strong></strong></p>" +
        "<div id=\"target-id129\" class=\"collapseomatic_content \"><strong>" +
        "<p>Chapter 417: The Resurrection Lily Suddenly Makes a Move!</p>" +
        "</strong><p><strong></strong><br>" +
        "</p></div>"
    );
});
