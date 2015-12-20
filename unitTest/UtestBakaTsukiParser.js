
"use strict";

module("BakaTsuki");

/// Load the sample file
/// As file operation is async, load the sample file into dom, and call doneCallback when file loaded
function syncLoadBakaTsukiSampleDoc() {
    let that = this;
    let xhr = new XMLHttpRequest();
    xhr.open("GET", "../testdata/Baka-Tsuki.html", false);
    xhr.send(null);
    let dom = new DOMParser().parseFromString(xhr.responseText, "text/html");
    new HttpClient().setBaseTag("http://www.baka-tsuki.org/project/index.php?title=Web_to_Epub", dom);
    return dom;
}

function getTestDom() {
    return new DOMParser().parseFromString(
        "<x>" +
           "<!-- comment 1 -->" +
           "<h1>T1</h1>" +
           "<div class=\"toc\"></div>" +
           "<!-- comment 2 -->" +
           "<script>\"use strict\"</script>" +
           "<h2>T1.1</h2>" +
        "</x>",
        "text/html"
    );
}

QUnit.test("canParse", function (assert) {
    let parser = new BakaTsukiParser();
    ok(parser.canParse("http://www.baka-tsuki.org/project/index.php?title=Web_to_Epub"));
    notOk(parser.canParse("http://archiveofourown.org/works/123456/chapters/9876543"));
});

QUnit.test("getEpubMetaInfo", function (assert) {
    let parser = new BakaTsukiParser();
    let metaInfo = parser.getEpubMetaInfo(syncLoadBakaTsukiSampleDoc());
    equal(metaInfo.title, "Web to Epub");
    equal(metaInfo.author, "<Unknown>");
    equal(metaInfo.language, "en");
});

QUnit.test("getChapterUrls", function (assert) {
    let parser = new BakaTsukiParser();
    let chapterUrls = parser.getChapterUrls(syncLoadBakaTsukiSampleDoc());
    assert.equal(chapterUrls.length, 1);
    assert.equal(chapterUrls[0].sourceUrl, "http://www.baka-tsuki.org/project/index.php?title=Web_to_Epub");
    assert.equal(chapterUrls[0].title, "Web to Epub");
});

QUnit.test("findContent", function (assert) {
    let parser = new BakaTsukiParser();
    let content = parser.findContent(syncLoadBakaTsukiSampleDoc());
    equal(content.childNodes.length, 21);
    equal(content.childNodes[3].innerText, "Novel Illustrations[edit]");
});

QUnit.test("removeUnwantedElementsFromContentElement", function (assert) {
    let parser = new BakaTsukiParser();
    let dom = getTestDom();
    parser.removeUnwantedElementsFromContentElement(dom.documentElement);
    assert.equal(dom.body.innerHTML, "<x><h1>T1</h1><h2>T1.1</h2></x>");
});

function removeElementsTestDom() {
    return new DOMParser().parseFromString(
        "<x>" +
           "<h1>T1<span class=\"mw-editsection\">Edit 1</span></h1>" +
           "<div class=\"toc\">" +
               "<script>\"use strict\"</script>" +
               "<div class=\"tok\">" +
                   "<h3>T1.1</h3>" +
               "</div>" +
           "</div>" +
           "<h2>T1.1</h2>" +
           "<table><tbody><tr><th>Table4" +
               "<table><tbody><tr><th>Table5</th></tr></tbody></table>" +
           "</th></tr></tbody></table>" +
           "<span class=\"mw-editsection\">Edit 2</span>"+
        "</x>",
        "text/html"
    );
}

QUnit.test("removeElementsSafeToCallMultipleTimes", function (assert) {
    assert.expect(0);
    let dom = removeElementsTestDom();
    let parser = new BakaTsukiParser();
    let tok = dom.getElementsByClassName("tok")[0];
    util.removeElements([tok]);
    util.removeElements([tok]);
});

QUnit.test("removeElementsSafeToCallOnChildOfDeletedElement", function (assert) {
    assert.expect(0);
    let dom = removeElementsTestDom();
    let parser = new BakaTsukiParser();
    let toc = dom.getElementsByClassName("toc")[0];
    let tok = dom.getElementsByClassName("tok")[0];
    util.removeElements([toc]);
    util.removeElements([tok]);
});

QUnit.test("removeComments", function (assert) {
    let dom = new DOMParser().parseFromString(
        "<x>" +
           "<!-- comment 1 -->" +
           "<h1>T1</h1>" +
           "<div class=\"toc\">"+
               "<!-- comment 2 -->" +
           "</div>" +
        "</x>",
        "text/html"
    );

    let parser = new BakaTsukiParser();
    util.removeComments(dom.documentElement);
    assert.equal(dom.body.innerHTML, "<x><h1>T1</h1><div class=\"toc\"></div></x>");
});

QUnit.test("removeUnwantedTableWhenSingleTable", function (assert) {
    let dom = new DOMParser().parseFromString(
        "<x>" +
           "<h1>H1</h1>" +
           "<table><tbody><tr><th>Table1</th></tr></tbody></table>" +
        "</x>",
        "text/html"
    );

    let parser = new BakaTsukiParser();
    parser.removeUnwantedTable(dom.documentElement);
    assert.equal(dom.body.innerHTML, "<x><h1>H1</h1></x>");
});

QUnit.test("removeUnwantedTableWhenTableNested", function (assert) {
    let dom = new DOMParser().parseFromString(
        "<x>" +
           "<table><tbody><tr><th>Table1</th></tr></tbody></table>" +
           "<table><tbody><tr><th>Table2" +
               "<table><tbody><tr><th>Table3</th></tr></tbody></table>" +
           "</th></tr></tbody></table>" +
           "<table><tbody><tr><th>Table4" +
               "<table><tbody><tr><th>Table5</th></tr></tbody></table>" +
           "</th></tr></tbody></table>" +
        "</x>",
        "text/html"
    );

    let parser = new BakaTsukiParser();
    parser.removeUnwantedTable(dom.documentElement);
    assert.equal(dom.body.innerHTML,
        "<x>" +
           "<table><tbody><tr><th>Table1</th></tr></tbody></table>" +
           "<table><tbody><tr><th>Table2" +
               "<table><tbody><tr><th>Table3</th></tr></tbody></table>" +
           "</th></tr></tbody></table>" +
        "</x>");
});

QUnit.test("processImages", function (assert) {
    let dom = new DOMParser().parseFromString(
        "<x>" +
           "<ul class=\"gallery mw-gallery-traditional\">"+
               "<li class=\"gallerybox\">" +
                   "<a href=\"https://www.baka-tsuki.org/project/index.php?title=File:BTS_vol_01_000a.jpg\" class=\"image\">" +
                        "<img src=\"./Baka to Tesuto to Syokanju_Volume1 - Baka-Tsuki_files/120px-BTS_vol_01_000a.jpg\" >"+
                   "</a>"+
               "</li>"+
               "<li class=\"comment\"></li>" +
           "</ul>" +
           "<div class=\"thumb tright\">" +
                "<a href=\"https://www.baka-tsuki.org/project/index.php?title=File:BTS_vol_01_000a.jpg\" class=\"image\">" +
                    "<img src=\"./Baka to Tesuto to Syokanju_Volume1 - Baka-Tsuki_files/120px-BTS_vol_01_000a.jpg\" >" +
                "</a>" +
           "</div>" +
           "<div class=\"thumbinner\">T1</div>" +
           "<div class=\"floatright\">" +
                "<a href=\"https://www.baka-tsuki.org/project/index.php?title=File:BTS_vol_01_000a.jpg\" class=\"image\">" +
                    "<img src=\"./Baka to Tesuto to Syokanju_Volume1 - Baka-Tsuki_files/120px-BTS_vol_01_000a.jpg\" >" +
                "</a>" +
           "</div>" +
        "</x>",
        "text/html"
    );

    let parser = new BakaTsukiParser();
    parser.processImages(dom.documentElement);
    assert.equal(dom.body.innerHTML,
        "<x>" +
           "<ul class=\"gallery mw-gallery-traditional\">" +
               "<li class=\"comment\"></li>" +
           "</ul>" +
           "<div class=\"thumbinner\">T1</div>" +
        "</x>");
});

QUnit.test("flattenContent", function (assert) {
    let dom = new DOMParser().parseFromString(
        "<div>" +
           "<div>" +
               "<div>" +
                   "<h1>H1.1</h1>" +
                   "<h2>H2.1</h2>" +
               "</div>" +
           "</div>" +
           "<h3>H3.1</h3>" +
           "<div>" +
               "<h4>H4.1</h1>" +
           "</div>" +
        "</div>",
        "text/html"
    );

    let parser = new BakaTsukiParser();
    parser.flattenContent(dom.body.firstChild);
    assert.equal(dom.body.firstChild.outerHTML,
        "<div>" +
            "<h1>H1.1</h1>" +
            "<h2>H2.1</h2>" +
            "<h3>H3.1</h3>" +
            "<h4>H4.1</h4>" +
        "</div>");
});

QUnit.test("splitContentIntoSections", function (assert) {
    let dom = new DOMParser().parseFromString(
        "<div>" +
           "\n\n"+
           "<h1>H1.1</h1>" +
           "<p>text1</p>" +
           "\n" +
           "<h1>H1.2</h1>" +
           "<h2>H2.2</h2>" +
           "<p>text2</p>" +
           "text3" +
           "<h1>H1.3</h1>" +
           "<h2>H2.3</h2>" +
           "<h3>H2.3</h2>" +
        "</div>",
        "text/html"
    );

    let parser = new BakaTsukiParser();
    let epubItems = parser.splitContentIntoSections(dom.body.firstChild);
    assert.equal(epubItems.length, 3);
    assert.equal(epubItems[0].elements.length, 2);
    assert.equal(epubItems[1].elements.length, 4);
    assert.equal(epubItems[2].elements.length, 3);

    let elements = epubItems[0].elements;
    assert.equal(elements[0].outerHTML, "<h1>H1.1</h1>");
    assert.equal(elements[1].outerHTML, "<p>text1</p>");

    elements = epubItems[1].elements;
    assert.equal(elements[0].outerHTML, "<h1>H1.2</h1>");
    assert.equal(elements[1].outerHTML, "<h2>H2.2</h2>");
    assert.equal(elements[2].outerHTML, "<p>text2</p>");
    assert.equal(elements[3].outerHTML, "<p>text3</p>");

    elements = epubItems[2].elements;
    assert.equal(elements[0].outerHTML, "<h1>H1.3</h1>");
    assert.equal(elements[1].outerHTML, "<h2>H2.3</h2>");
    assert.equal(elements[2].outerHTML, "<h3>H2.3</h3>");
});

function fetchHrefForId(epubItems, id) {
    for(let epubItem of epubItems) {
        for(let element of epubItem.elements) {
            let walker = document.createTreeWalker(element);
            while(walker.nextNode()) {
                let node = walker.currentNode;
                if (node.id === id) {
                    return node.getElementsByTagName("a")[0].getAttribute("href");
                };
            };
        };
    };
}

test("fixupFootnotes", function (assert) {
    let dom = new DOMParser().parseFromString(
        "<html>" +
            "<head><title></title></head>" +
            "<body>" +
                "<h1>H1</h1>" +
                "<p><sup id=\"cite_ref-1\" class=\"reference\"><a href=\"http://www.baka-tsuki.org/project/index.php?title=WebtoEpub#cite_note-1\">[1]</a></sup></p>" +
                "<h1>H2</h1>" +
                "<ul><li id=\"cite_note-2\"><span class=\"mw-cite-backlink\"><a href=\"http://www.baka-tsuki.org/project/index.php?title=WebtoEpub#cite_ref-2\"><span class=\"cite-accessibility-label\">Jump up </span>^</a></span> <span class=\"reference-text\"></span></ul>" +
                "<h1>H3</h1>" +
                "<p><sup id=\"cite_ref-2\" class=\"reference\"><a href=\"http://www.baka-tsuki.org/project/index.php?title=WebtoEpub#cite_note-2\">[2]</a></sup></p>" +
                "<h1>H4</h1>" +
                "<ul><li id=\"cite_note-1\"><span class=\"mw-cite-backlink\"><a href=\"http://www.baka-tsuki.org/project/index.php?title=WebtoEpub#cite_ref-1\"><span class=\"cite-accessibility-label\">Jump up </span>^</a></span> <span class=\"reference-text\"></span></ul>" +
            "</body>" +
        "</html>",
        "text/html");
    let parser = new BakaTsukiParser();
    let content = dom.body.cloneNode(true);
    let epubItems = parser.splitContentIntoSections(content, null);
    parser.fixupFootnotes(epubItems);

    assert.equal(fetchHrefForId(epubItems, "cite_ref-1"), "index_split_0003.html#cite_note-1");
    assert.equal(fetchHrefForId(epubItems, "cite_ref-2"), "index_split_0001.html#cite_note-2");
    assert.equal(fetchHrefForId(epubItems, "cite_note-1"), "index_split_0000.html#cite_ref-1");
    assert.equal(fetchHrefForId(epubItems, "cite_note-2"), "index_split_0002.html#cite_ref-2");

});
