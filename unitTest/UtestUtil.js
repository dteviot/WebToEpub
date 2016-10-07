
"use strict";

module("UtestUtil");

test("removeEmptyDivElements", function (assert) {
    let dom = new DOMParser().parseFromString(
        "<html>" +
            "<head><title></title></head>" +
            "<body>" +
                "<div><h1>H1</h1></div>" +
                "<div><div></div></div>" +
                "<div>    \n\n\n</div>" +
                "<div><img src=\"http://dumy.com/img.jpg\"></div>" +
            "</body>" +
        "</html>",
        "text/html");
    let content = dom.body;
    util.removeEmptyDivElements(content);

    assert.equal(content.innerHTML, "<div><h1>H1</h1></div><div><img src=\"http://dumy.com/img.jpg\"></div>");
});

test("removeScriptableElements", function (assert) {
    let dom = new DOMParser().parseFromString(
        "<html>" +
            "<head><title></title></head>" +
            "<body>" +
                "<div><h1>H1</h1></div>" +
                "<iframe title=\"VisualDNA Analytics\" width=\"0\" height=\"0\" aria-hidden=\"true\" src=\"./Wikia_files/saved_resource.html\" style=\"display: none;\"></iframe>" +
                "<script src=\"./expansion_embed.js\"></script>"+
                "<div>    \n\n\n</div>" +
            "</body>" +
        "</html>",
        "text/html");
    let content = dom.body.cloneNode(true);
    util.removeScriptableElements(content);

    assert.equal(content.innerHTML, "<div><h1>H1</h1></div><div>    \n\n\n</div>");
});

test("prepForConvertToXhtml", function (assert) {
    let dom = new DOMParser().parseFromString(
        "<html>" +
            "<head><title></title></head>" +
            "<body>" +
            "<p>Normal <u id=\"test1\">underline <i>italic</i></u></p>" +
            "<center>X			X</center>"+
            "</body>" +
        "</html>",
        "text/html");
    let content = dom.body.cloneNode(true);
    util.prepForConvertToXhtml(content);

    // Firefox and Chrome put span's id attribute in different positions.
    assert.equal(content.innerHTML.replace(" id=\"test1\"", ""),
        "<p>Normal <span style=\"text-decoration: underline;\">underline <i>italic</i></span></p>" +
        "<p style=\"text-align: center;\">X			X</p>"
    );
    let span = util.getElement(content, "span");
    assert.equal(span.id, "test1");
});

test("removeUnneededIds", function (assert) {
    let dom = new DOMParser().parseFromString(
        "<html>" +
            "<head><title></title></head>" +
            "<body>" +
            "<h2><span id=\"Life.0\">Life.0</span></h2>" +
            "<sup id=\"cite_ref-1\" class=\"reference\">"+
                "<a href=\"https://www.baka-tsuki.org/project/index.php?title=High_School_DxD:Volume_1#cite_note-1\">[1]</a>" +
            "</sup>" +
            "<sup id=\"cite_ref-2\" class=\"reference\">" +
                "<a href=\"https://www.baka-tsuki.org/project/index.php?title=High_School_DxD:Volume_1#cite_note-2\">[1]</a>" +
            "</sup>" +
            "<ol>" +
            "<li id=\"cite_note-1\">" +
                "<a href=\"https://www.baka-tsuki.org/project/index.php?title=test:Volume_1#cite_ref-1\"></a>" +
            "</li>"+
            "<li id=\"cite_note-3\">" +
                "<a href=\"https://www.baka-tsuki.org/project/index.php?title=test:Volume_1#cite_ref-3\"></a>" +
            "</li>" +
            "</ol>" +
            "</body>" +
        "</html>",
        "text/html");
    let content = dom.body.cloneNode(true);
    util.removeUnneededIds(content);

    assert.equal(content.innerHTML,
        "<h2><span>Life.0</span></h2>" +
        "<sup id=\"cite_ref-1\" class=\"reference\">"+
            "<a href=\"https://www.baka-tsuki.org/project/index.php?title=High_School_DxD:Volume_1#cite_note-1\">[1]</a>" +
        "</sup>" +
        "<sup class=\"reference\">" +
            "<a href=\"https://www.baka-tsuki.org/project/index.php?title=High_School_DxD:Volume_1#cite_note-2\">[1]</a>" +
        "</sup>" +
        "<ol>" +
        "<li id=\"cite_note-1\">" +
            "<a href=\"https://www.baka-tsuki.org/project/index.php?title=test:Volume_1#cite_ref-1\"></a>" +
        "</li>"+
        "<li>" +
            "<a href=\"https://www.baka-tsuki.org/project/index.php?title=test:Volume_1#cite_ref-3\"></a>" +
        "</li>" +
        "</ol>"
    );
});

test("makeHyperlinksRelative", function (assert) {
    let dom = new DOMParser().parseFromString(
        "<html>" +
            "<head><title></title>" +
            "</head>" +
            "<body>" +
            "<h2><span id=\"Life.0\">Life.0</span></h2>" +
            "<sup id=\"cite_ref-1\" class=\"reference\">" +
                "<a href=\"https://www.baka-tsuki.org/project/test:Volume_1#cite_note-1\">[1]</a>" +
            "</sup>" +
            "<sup id=\"cite_ref-2\" class=\"reference\">" +
                "<a href=\"https://www.baka-tsuki.org/project/test:Volume_1#cite_note-2\">[1]</a>" +
            "</sup>" +
            "<ol>" +
            "<li id=\"cite_note-1\">" +
                "<a href=\"https://www.baka-tsuki.org/project/test:Volume_1#cite_ref-1\"></a>" +
            "</li>" +
            "<li id=\"cite_note-3\">" +
                "<a href=\"https://www.baka-tsuki.org/project/test:Volume_1#cite_ref-3\"></a>" +
            "</li>" +
            "</ol>" +
            "</body>" +
        "</html>",
        "text/html");

    util.setBaseTag("https://www.baka-tsuki.org/project/test:Volume_1", dom);
    let content = dom.body.cloneNode(true);
    util.removeUnneededIds(content);
    util.makeHyperlinksRelative("https://www.baka-tsuki.org/project/test:Volume_1", content);

    assert.equal(content.innerHTML,
        "<h2><span>Life.0</span></h2>" +
        "<sup id=\"cite_ref-1\" class=\"reference\">" +
            "<a href=\"#cite_note-1\">[1]</a>" +
        "</sup>" +
        "<sup class=\"reference\">" +
            "<a href=\"#cite_note-2\">[1]</a>" +
        "</sup>" +
        "<ol>" +
        "<li id=\"cite_note-1\">" +
            "<a href=\"#cite_ref-1\"></a>" +
        "</li>" +
        "<li>" +
            "<a href=\"#cite_ref-3\"></a>" +
        "</li>" +
        "</ol>"
    );
});

test("removeUnusedHeadingLevels", function (assert) {
    let dom = new DOMParser().parseFromString(
        "<html>" +
            "<head><title></title></head>" +
            "<body>" +
            "<h2>h2</h2>" +
            "<h5>h5</h5>" +
            "<h6>h6</h6>" +
            "<h2>h2</h2>" +
            "</body>" +
        "</html>",
        "text/html");
    util.removeUnusedHeadingLevels(dom.body);

    assert.equal(dom.body.innerHTML, "<h1>h2</h1><h2>h5</h2><h3>h6</h3><h1>h2</h1>");

    // headings are already in order - no change
    dom = new DOMParser().parseFromString(
        "<html>" +
            "<head><title></title></head>" +
            "<body>" +
            "<h1>h1</h1>" +
            "<h2>h2</h2>" +
            "<h3>h3</h3>" +
            "</body>" +
        "</html>",
        "text/html");
    util.removeUnusedHeadingLevels(dom.body);
    assert.equal(dom.body.innerHTML, "<h1>h1</h1><h2>h2</h2><h3>h3</h3>");

    // no headings
    dom = new DOMParser().parseFromString(
        "<html>" +
            "<head><title></title></head>" +
            "<body>" +
            "<div>h1</div>" +
            "<p>h2</p>" +
            "</body>" +
        "</html>",
        "text/html");
    util.removeUnusedHeadingLevels(dom.body);
    assert.equal(dom.body.innerHTML, "<div>h1</div><p>h2</p>");
});

test("fixBlockTagsNestedInInlineTags", function (assert) {
    let dom = new DOMParser().parseFromString(
        "<html>" +
            "<head><title></title></head>" +
            "<body>" +
            "<u><div><p><b>test1</b><a href=\"http://dummy.com\"><img src=\"http://dummy.com\"></a></p></div></u>" +
            "<u><b><div><p>test2</p></div></b></u>" +
            "<s><h2><span>test3<a href=\"http://dummy2.com\">dummy2</a></span></h2><p>3</p><p>4</p></s>" +
            "<i><table><tbody><tr><th>test4Head</th></tr><tr><td>test4Data</td></tr></tbody></table><p>6</p><p>7</p></i>" +
            "</body>" +
        "</html>",
        "text/html");
    util.fixBlockTagsNestedInInlineTags(dom.body);

    assert.equal(dom.body.innerHTML,
        "<div><p><b>test1</b><a href=\"http://dummy.com\"><img src=\"http://dummy.com\"></a></p></div>" +
        "<div><p>test2</p></div>" +
        "<h2><span>test3<a href=\"http://dummy2.com\">dummy2</a></span></h2><p>3</p><p>4</p>" +
        "<table><tbody><tr><th>test4Head</th></tr><tr><td>test4Data</td></tr></tbody></table><p>6</p><p>7</p>"
    );
});

test("extractHostName", function (assert) {
    let hostName = util.extractHostName(util.XMLNS);
    assert.equal(hostName, "www.w3.org");
});

test("removeTrailingWhiteSpace", function (assert) {
    let dom = new DOMParser().parseFromString(
        "<html><head><title></title></head>" +
        "<body><div id=\"content\">" +
        "Some text <br />\n" +
        "<br />\n" +
        "<hr />\n" +
        "<br />\n" +
         "</div>\n</body></html>",
        "text/html"
    );

    let content = dom.getElementById("content");
    util.removeTrailingWhiteSpace(content);
    assert.equal(content.innerHTML, "Some text ");
});


test("removeLeadingWhiteSpace", function (assert) {
    let dom = new DOMParser().parseFromString(
        "<html><head><title></title></head>" +
        "<body><div id=\"content\">" +
        "\n  \n" +
        "<br />\n" +
        "<p></p>\n" +
        "<hr />\n" +
         "<p>Chapter 1</p>" +
         "</div></body></html>",
        "text/html"
    );

    let content = dom.getElementById("content");
    util.removeLeadingWhiteSpace(content);
    assert.equal(content.innerHTML, "<p>Chapter 1</p>");
});

function dummyWuxiaDocWithArcNames() {
    return new DOMParser().parseFromString(
        "<html>" +
           "<head><title></title></head>" +
           "<body>" +
           "<div itemprop=\"articleBody\">" +
           "<div id=\"target-id8123\" class=\"collapseomatic_content \" style=\"display: none;\">" +
           "<p><strong>Book 1 Patriarch Reliance</strong><br/>" +
               "<a href=\"http://www.wuxiaworld.com/issth-index/issth-book-1-chapter-1/\">Chapter 1: Scholar Meng Hao<br/></a>" +
               "<a href=\"http://www.wuxiaworld.com/issth-index/issth-book-1-chapter-2/\">Chapter 2: The Reliance Sect</a><br/>" +
               "<a href=\"http://www.wuxiaworld.com/wmw-index/wmw-chapter-17/\"><br></a>" +
           "</div>" +
           "<div id=\"target-id4879\" class=\"collapseomatic_content \" style=\"display: none;\">" +
           "<p><strong>Book 2 Cutting Into the Southern Domain</strong><br/>" +
               "<a href=\"http://www.wuxiaworld.com/issth-index/issth-book-2-chapter-96/\">Chapter 96: Demonic Jade in a Mountain Valley</a><br/>" +
               "<a href=\"http://www.wuxiaworld.com/issth-index/issth-book-2-chapter-97/\">Chapter 97: Cultivation Breakthrough in a Mountain Valley</a><br/>" +
           "</div>" +
           "<a href=\"http://www.wuxiaworld.com/issth-index/issth-book-6-chapter-801/\">Chapter 801: We Will Meet Again!</a><br/>" +
           "<a href=\"http://www.wuxiaworld.com/issth-index/issth-book-6-chapter-802/\">Chapter 802: Immortal Ancient Dao Medallion!</a><br/>" +
           "</div>" +
           "</body></html>",
        "text/html"
    );
}

test("hyperlinksToChapterList", function (assert) {
    let dom = dummyWuxiaDocWithArcNames();
    let chapters = util.hyperlinksToChapterList(dom);
    assert.equal(chapters.length, 6);
});

test("normalizeUrl", function (assert) {
    let testUrl1 = "http://www.wuxiaworld.com/wmw-index/wmw-chapter-2";
    let testUrl2 = "http://www.wuxiaworld.com/wmw-index/wmw-chapter-2/";

    assert.equal(util.normalizeUrl(testUrl1), testUrl1);
    assert.equal(util.normalizeUrl(testUrl2), testUrl1);
});

test("removeEventHandlers", function (assert) {
    let dom = dummyWuxiaDoc();
    let parser = new WuxiaworldParser();
    let body = util.removeEventHandlers(dom.body);
    let link = dom.getElementById("fnref-63064-1");
    assert.equal(link.outerHTML, "<a href=\"#fn-63064-1\" id=\"fnref-63064-1\">1</a>");
});

QUnit.test("removeHeightAndWidthStyle", function (assert) {
    let html = "<p style=\"width:100%;height:100%;color:rgb(153, 153, 153);\"></p>";
    let doc = new DOMParser().parseFromString(html, "text/html");
    let p = doc.getElementsByTagName("p")[0];
    util.removeHeightAndWidthStyle(p);
    assert.equal(p.outerHTML, "<p style=\"color: rgb(153, 153, 153);\"></p>");
    html = "<div width=\"1px\" height=\"1px\" style=\"color:rgb(153, 153, 153);\"></div>";
    doc = new DOMParser().parseFromString(html, "text/html");
    p = doc.getElementsByTagName("div")[0];
    util.removeHeightAndWidthStyle(p);
    assert.equal(p.outerHTML, "<div style=\"color:rgb(153, 153, 153);\"></div>");
});

QUnit.test("isElementWhiteSpace", function (assert) {
    let html = "<html><head><title></title></head><body><!-- c -->text<div></div></body></html>";
    let doc = new DOMParser().parseFromString(html, "text/html");
    let body = util.getElement(doc, "body");
    assert.ok(util.isElementWhiteSpace(body.childNodes[0]));
    assert.ok(!util.isElementWhiteSpace(body.childNodes[1]));
    assert.ok(util.isElementWhiteSpace(body.childNodes[2]));
});

test("findPrimaryFontColourAndSize", function (assert) {
    let dom = new DOMParser().parseFromString(
        "<html>" +
            "<head><title></title>" +
            "</head>" +
            "<body>" +
            "<div style=\"font-size: 10.0pt;\"><p>1234</p></div>" +
            "<div style=\"color:#999999\">0<p>1234</p>5678<p style=\"color:#111111\">1</p></div>" +
            "</body>" +
        "</html>",
        "text/html");

    let acutal = util.findPrimaryFontColourAndSize(dom.body);
    assert.equal(acutal.color, "rgb(153, 153, 153)");
    assert.equal(acutal.fontSize, undefined);
});

test("removeStyleValue", function (assert) {
    let dom = new DOMParser().parseFromString(
        "<html>" +
            "<head><title></title>" +
            "</head>" +
            "<body>" +
            "<div style=\"font-size: 10.0pt;\"><p>1234</p></div>" +
            "<div style=\"color:#999999\">0<p>1234</p>5678<p style=\"color:#111111\">1</p></div>" +
            "</body>" +
        "</html>",
        "text/html");

    util.removeStyleValue(dom.body, "fontSize", "10pt");
    assert.equal(dom.body.innerHTML,
            "<div><p>1234</p></div>" +
            "<div style=\"color:#999999\">0<p>1234</p>5678<p style=\"color:#111111\">1</p></div>" 
    );
    util.removeStyleValue(dom.body, "color", "rgb(17, 17, 17)");
    assert.equal(dom.body.innerHTML,
            "<div><p>1234</p></div>" +
            "<div style=\"color:#999999\">0<p>1234</p>5678<p>1</p></div>"
    );
});

test("createComment", function (assert) {
    let dom = new DOMParser().parseFromString("<html><head><title></title></head><body></body></html>", "text/html");
    let actual = util.createComment(dom, "http://2.bp.blogspot.com/--pvHycyNQB0/VLJkOS9q57I/AAAAAAAAA-4/pyI5zkbZNsA/s1600/Haken.no.Kouki.Altina.full.1568363.jpg");
    assert.equal(actual.nodeValue, "  http://2.bp.blogspot.com/%2D%2DpvHycyNQB0/VLJkOS9q57I/AAAAAAAAA-4/pyI5zkbZNsA/s1600/Haken.no.Kouki.Altina.full.1568363.jpg  ");

    actual = util.createComment(dom, "http://2.bp.blogspot.com/-.--.---.----.-----");
    assert.equal(actual.nodeValue, "  http://2.bp.blogspot.com/-.%2D%2D.%2D%2D-.%2D%2D%2D%2D.%2D%2D%2D%2D-  ");
});
