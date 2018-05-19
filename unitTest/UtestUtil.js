
"use strict";

module("UtestUtil");

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

test("removeEmptyDivElements", function (assert) {
    let dom = TestUtils.makeDomWithBody(
        "<div><h1>H1</h1></div>" +
        "<div><div></div></div>" +
        "<div>    \n\n\n</div>" +
        "<div><img src=\"http://dumy.com/img.jpg\"></div>"
    );
    let content = dom.body;
    util.removeEmptyDivElements(content);

    assert.equal(content.innerHTML, "<div><h1>H1</h1></div><div><img src=\"http://dumy.com/img.jpg\"></div>");
});

test("removeScriptableElements", function (assert) {
    let dom = TestUtils.makeDomWithBody(
        "<div><h1>H1</h1></div>" +
        "<iframe title=\"VisualDNA Analytics\" width=\"0\" height=\"0\" aria-hidden=\"true\" src=\"./Wikia_files/saved_resource.html\" style=\"display: none;\"></iframe>" +
        "<script src=\"./expansion_embed.js\"></script>"+
        "<div>    \n\n\n</div>"
    );
    let content = dom.body.cloneNode(true);
    util.removeScriptableElements(content);

    assert.equal(content.innerHTML, "<div><h1>H1</h1></div><div>    \n\n\n</div>");
});

test("removeMicrosoftWordCrapElements", function (assert) {
    let dom = TestUtils.makeDomWithBody(
        "<div><h1>H1</h1></div>" +
        "<p>text<o:p></o:p></p>" +
        "<div>    \n\n\n</div>"
    );
    let content = dom.body.cloneNode(true);
    util.removeMicrosoftWordCrapElements(content);

    assert.equal(content.innerHTML, "<div><h1>H1</h1></div><p>text</p><div>    \n\n\n</div>");
});

test("prepForConvertToXhtml", function (assert) {
    let dom = TestUtils.makeDomWithBody(
        "<p>Normal <u id=\"test1\">underline <i>italic</i></u></p>" +
        "<center>X			X</center>"
    );
    let content = dom.body.cloneNode(true);
    util.prepForConvertToXhtml(content);

    // Firefox and Chrome put span's id attribute in different positions.
    assert.equal(content.innerHTML.replace(" id=\"test1\"", ""),
        "<p>Normal <span style=\"text-decoration: underline;\">underline <i>italic</i></span></p>" +
        "<p style=\"text-align: center;\">X			X</p>"
    );
    let span = content.querySelector("span");
    assert.equal(span.id, "test1");
});

test("makeHyperlinksRelative", function (assert) {
    let dom = TestUtils.makeDomWithBody(
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
        "</ol>"
    );

    util.setBaseTag("https://www.baka-tsuki.org/project/test:Volume_1", dom);
    let content = dom.body.cloneNode(true);
    util.makeHyperlinksRelative("https://www.baka-tsuki.org/project/test:Volume_1", content);

    assert.equal(content.innerHTML,
        "<h2><span id=\"Life.0\">Life.0</span></h2>" +
        "<sup id=\"cite_ref-1\" class=\"reference\">" +
            "<a href=\"#cite_note-1\">[1]</a>" +
        "</sup>" +
        "<sup id=\"cite_ref-2\" class=\"reference\">" +
            "<a href=\"#cite_note-2\">[1]</a>" +
        "</sup>" +
        "<ol>" +
        "<li id=\"cite_note-1\">" +
            "<a href=\"#cite_ref-1\"></a>" +
        "</li>" +
        "<li id=\"cite_note-3\">" +
            "<a href=\"#cite_ref-3\"></a>" +
        "</li>" +
        "</ol>"
    );
});

test("removeUnusedHeadingLevels", function (assert) {
    let dom = TestUtils.makeDomWithBody(
        "<h2>h2</h2>" +
        "<h5>h5</h5>" +
        "<h6>h6</h6>" +
        "<h2>h2</h2>"
    );
    util.removeUnusedHeadingLevels(dom.body);

    assert.equal(dom.body.innerHTML, "<h1>h2</h1><h2>h5</h2><h3>h6</h3><h1>h2</h1>");

    // headings are already in order - no change
    dom = TestUtils.makeDomWithBody(
        "<h1>h1</h1>" +
        "<h2>h2</h2>" +
        "<h3>h3</h3>"
    );
    util.removeUnusedHeadingLevels(dom.body);
    assert.equal(dom.body.innerHTML, "<h1>h1</h1><h2>h2</h2><h3>h3</h3>");

    // no headings
    dom = TestUtils.makeDomWithBody(
        "<div>h1</div>" +
        "<p>h2</p>"
    );
    util.removeUnusedHeadingLevels(dom.body);
    assert.equal(dom.body.innerHTML, "<div>h1</div><p>h2</p>");
});

test("fixBlockTagsNestedInInlineTags", function (assert) {
    let dom = TestUtils.makeDomWithBody(
        "<u><div><p><b>test1</b><a href=\"http://dummy.com\"><img src=\"http://dummy.com\"></a></p></div></u>" +
        "<u><b><div><p>test2</p></div></b></u>" +
        "<s><h2><span>test3<a href=\"http://dummy2.com\">dummy2</a></span></h2><p>3</p><p>4</p></s>" +
        "<i><table><tbody><tr><th>test4Head</th></tr><tr><td>test4Data</td></tr></tbody></table><p>6</p><p>7</p></i>"
    );
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
    let dom = TestUtils.makeDomWithBody(
        "<div id=\"content\">" +
        "Some text <br />\n" +
        "<br />\n" +
        "<hr />\n" +
        "<br />\n" +
         "</div>\n"
    );

    let content = dom.getElementById("content");
    util.removeTrailingWhiteSpace(content);
    assert.equal(content.innerHTML, "Some text ");
});


test("removeLeadingWhiteSpace", function (assert) {
    let dom = TestUtils.makeDomWithBody(
        "<div id=\"content\">" +
        "\n  \n" +
        "<br />\n" +
        "<p></p>\n" +
        "<hr />\n" +
         "<p>Chapter 1</p>" +
         "</div>"
    );

    let content = dom.getElementById("content");
    util.removeLeadingWhiteSpace(content);
    assert.equal(content.innerHTML, "<p>Chapter 1</p>");
});

function dummyWuxiaDocWithArcNames() {
    return TestUtils.makeDomWithBody(
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
        "</div>"
    );
}

test("hyperlinksToChapterList", function (assert) {
    let dom = dummyWuxiaDocWithArcNames();
    let chapters = util.hyperlinksToChapterList(dom);
    assert.equal(chapters.length, 6);
});

test("hyperlinksToChapterListEmptyElement", function (assert) {
    let chapters = util.hyperlinksToChapterList(null);
    assert.deepEqual(chapters, []);
});

test("removeTrailingSlash", function (assert) {
    let expected = "http://www.wuxiaworld.com/wmw-index/wmw-chapter-2";
    
    assert.equal(util.removeTrailingSlash(expected), expected);
    assert.equal(util.removeTrailingSlash(expected + "/"), expected);
});

test("normalizeUrlForCompare", function (assert) {
    let expected = "www.wuxiaworld.com/wmw-index/wmw-chapter-2";
    
    assert.equal(util.normalizeUrlForCompare(expected), expected);
    assert.equal(util.normalizeUrlForCompare("http://" + expected), expected);
    assert.equal(util.normalizeUrlForCompare("http://" + expected +"/"), expected);
    assert.equal(util.normalizeUrlForCompare("https://" + expected), expected);
    assert.equal(util.normalizeUrlForCompare("https://" + expected +"/"), expected);
    assert.equal(util.normalizeUrlForCompare(expected + "#title"), expected);
});

test("removeEventHandlers", function (assert) {
    let dom = dummyWuxiaDoc();
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
    let doc = TestUtils.makeDomWithBody("<!-- c -->text<div></div>");
    let body = doc.body;
    assert.ok(util.isElementWhiteSpace(body.childNodes[0]));
    assert.ok(!util.isElementWhiteSpace(body.childNodes[1]));
    assert.ok(util.isElementWhiteSpace(body.childNodes[2]));
});

test("findPrimaryStyleSettings", function (assert) {
    let dom = TestUtils.makeDomWithBody(
        "<div style=\"font-size: 10.0pt;\"><p>1234</p></div>" +
        "<div style=\"color:#999999\">0<p>1234</p>5678<p style=\"color:#111111\">1</p></div>"
    );

    let styleProperties = ["color", "fontSize"];
    let acutal = util.findPrimaryStyleSettings(dom.body, styleProperties);
    assert.equal(acutal[0], "rgb(153, 153, 153)");
    assert.equal(acutal[1], undefined);
});

test("removeStyleValue", function (assert) {
    let dom = TestUtils.makeDomWithBody(
        "<div style=\"font-size: 10.0pt;\"><p>1234</p></div>" +
        "<div style=\"color:#999999\">0<p>1234</p>5678<p style=\"color:#111111\">1</p></div>"
    );

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
    let dom = TestUtils.makeDomWithBody("");
    let actual = util.createComment(dom, "http://2.bp.blogspot.com/--pvHycyNQB0/VLJkOS9q57I/AAAAAAAAA-4/pyI5zkbZNsA/s1600/Haken.no.Kouki.Altina.full.1568363.jpg");
    assert.equal(actual.nodeValue, "  http://2.bp.blogspot.com/%2D%2DpvHycyNQB0/VLJkOS9q57I/AAAAAAAAA-4/pyI5zkbZNsA/s1600/Haken.no.Kouki.Altina.full.1568363.jpg  ");

    actual = util.createComment(dom, "http://2.bp.blogspot.com/-.--.---.----.-----");
    assert.equal(actual.nodeValue, "  http://2.bp.blogspot.com/-.%2D%2D.%2D%2D-.%2D%2D%2D%2D.%2D%2D%2D%2D-  ");
});

test("findIndexOfClosingQuote", function (assert) {
    let test = function(s, startIndex) {
        let end = util.findIndexOfClosingQuote(s, startIndex);
        return s.substring(startIndex, end + 1)
    }

    assert.equal(test("\"simple\"aa", 0), "\"simple\"");
    assert.equal(test("a\"\\\"nested\\\"\"bb", 1), "\"\\\"nested\\\"\"");
});

test("findIndexOfClosingBracket", function (assert) {
    let testString = "a{\album_images\":{\"count\":21,\"images\":[{\"hash\":\"zNuo7hV\",\"ext\":\".png\"},{\"hash\":\"bi7LaVD\",\"ext\":\".png\"}]}";
    let test = function(startPattern) {
        let startIndex = testString.indexOf(startPattern) + startPattern.length;
        let end = util.findIndexOfClosingBracket(testString, startIndex);
        let substring = testString.substring(startIndex, end + 1);
        return substring;
    }

    assert.equal(test("images\":[", 0), "{\"hash\":\"zNuo7hV\",\"ext\":\".png\"}");
    assert.equal(test("\"images\":", 0), "[{\"hash\":\"zNuo7hV\",\"ext\":\".png\"},{\"hash\":\"bi7LaVD\",\"ext\":\".png\"}]");
    assert.equal(test("_images\":", 0), "{\"count\":21,\"images\":[{\"hash\":\"zNuo7hV\",\"ext\":\".png\"},{\"hash\":\"bi7LaVD\",\"ext\":\".png\"}]}");
    
    // unbalanced case
    assert.equal(util.findIndexOfClosingBracket(testString, 0), -1);
});

test("locateAndExtractJson", function (assert) {
    let testString = "a{\album_images\":{\"count\":21,\"images\":[{\"hash\":\"zNuo7hV\",\"ext\":\".png\"},{\"hash\":\"bi7LaVD\",\"ext\":\".png\"}]}";
    let test = function(startPattern) {
        return util.locateAndExtractJson(testString, startPattern);
    }
    
    assert.deepEqual(test("images\":[", 0), {hash: "zNuo7hV", ext: ".png"});
    assert.deepEqual(test("\"images\":", 0), [{hash: "zNuo7hV", ext: ".png"},{hash:"bi7LaVD",ext:".png"}]);
    assert.deepEqual(test("_images\":", 0), {count:21, images: [{hash:"zNuo7hV",ext:".png"},{hash:"bi7LaVD",ext:".png"}]});
    
    // unbalanced case
    assert.equal(test("a", 0), null);

    // no brackets
    assert.equal(util.locateAndExtractJson("testString", "test"), null);

    // empty string
    assert.equal(util.locateAndExtractJson("", ""), null);
});

test("isXhtmlInvalid", function (assert) {
    let invalidXhtml = "<!DOCTYPE html PUBLIC \"-//W3C//DTD XHTML 1.1//EN\" \"http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd\">" +
        "<html xmlns=\"http://www.w3.org/1999/xhtml\">" +
        "<head><title></title></head>" +
        "<body><h1></h1>the<p></p>" +
        "<this one,=\"\"></body></html>";

    let actual = util.isXhtmlInvalid(invalidXhtml);
    assert.ok(actual !== null);

    let validXhtml = "<!DOCTYPE html PUBLIC \"-//W3C//DTD XHTML 1.1//EN\" \"http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd\">" +
        "<html xmlns=\"http://www.w3.org/1999/xhtml\">" +
        "<head><title></title></head>" +
        "<body><h1></h1>the<p></p>" +
        "</body></html>";
    actual = util.isXhtmlInvalid(validXhtml);
    assert.equal(actual, null);
});

QUnit.test("extractFilename", function (assert) {
    let hyperlink = document.createElement("a");
    let actual = util.extractFilename(hyperlink);
    assert.equal(actual, "");

    hyperlink.href = "http://dummy.com/K4CZyyP.jpg";
    actual = util.extractFilename(hyperlink);
    assert.equal(actual, "K4CZyyP.jpg");
    
    hyperlink.href = "http://dummy.com/K4CZyyP.png/";
    actual = util.extractFilename(hyperlink);
    assert.equal(actual, "K4CZyyP.png");
    
    hyperlink.href = "http://dummy.com/K4CZyyP.jpeg?src=dummy.txt";
    actual = util.extractFilename(hyperlink);
    assert.equal(actual, "K4CZyyP.jpeg");
    
    hyperlink.href = "http://dummy.com/folder/K4CZyyP.gif?src=dummy.txt";
    actual = util.extractFilename(hyperlink);
    assert.equal(actual, "K4CZyyP.gif");
    
    hyperlink.href = "http://dummy.com/folder";
    actual = util.extractFilename(hyperlink);
    assert.equal(actual, "folder");
});

QUnit.test("iterateElements", function (assert) {
    let dom = TestUtils.makeDomWithBody(
        "<h1 id=\"e1\"></h1>" +
        "<div id=\"d1\"><p id=\"p1\">1</p><p id=\"p2\">2</p></div>" +
        "<h2 id=\"e2\"></h2>"
    );
    let root = dom.querySelector("div");
    let actual = util.iterateElements(root, n => NodeFilter.FILTER_ACCEPT);
    assert.equal(actual.length, 3);
    assert.equal(actual[0].id, "d1");
    assert.equal(actual[1].id, "p1");
    assert.equal(actual[2].id, "p2");

    actual = util.iterateElements(root, 
        n => (n.tagName === "P") ? NodeFilter.FILTER_ACCEPT : NodeFilter.SKIP);
    assert.equal(actual.length, 2);
    assert.equal(actual[0].id, "p1");
    assert.equal(actual[1].id, "p2");
});

QUnit.test("decodeEmail", function (assert) {
    let actual = util.decodeEmail("513f3e2334213d281135343c3e3f227f237f2422");
    assert.equal(actual, "noreply@demons.r.us");
    actual = util.decodeEmail("8cdceda2cee0f9e9eee9e0e0ccc1cdd8daa2efe3e1");
    assert.equal(actual, "Pa.Bluebell@MATV.com");
});

QUnit.test("decodeCloudflareProtectedEmails", function (assert) {
    let dom = TestUtils.makeDomWithBody(
        "<div>" +
        "<p><a href=\"/cdn-cgi/l/email-protection\" class=\"__cf_email__\" data-cfemail=\"543931142127353935313e352e7a373b39\">[email&#160;protected]</a></p>" +
        "<p><a href=\"/cdn-cgi/l/email-protection#5f323a1f2a2c3e323e3a353e25713c3032\"><i class=\"svg-icon email\"></i></a></p>" +
        "<a href=\"https://www.baka-tsuki.org/project/test:Volume_1#cite_note-1\">[1]</a>" +
        "</div>"
    );
    let div = dom.querySelector("div");
    util.decodeCloudflareProtectedEmails(div);
    assert.equal(div.innerHTML, "<p>me@usamaejaz.com</p><p>me@usamaejaz.com</p><a href=\"https://www.baka-tsuki.org/project/test:Volume_1#cite_note-1\">[1]</a>");
});
