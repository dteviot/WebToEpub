
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

QUnit.test("parserFactory", function (assert) {
    let parser = parserFactory.fetch("http://www.baka-tsuki.org/project/index.php?title=File:WebToEpub.jpg");
    assert.ok(parser instanceof BakaTsukiParser);
});

QUnit.test("getEpubMetaInfo", function (assert) {
    let parser = new BakaTsukiParser();
    let metaInfo = parser.getEpubMetaInfo(syncLoadBakaTsukiSampleDoc());
    equal(metaInfo.title, "Web to Epub");
    equal(metaInfo.author, "<Unknown>");
    equal(metaInfo.language, "en");
    propEqual(metaInfo.seriesInfo, { name: "Web to Epub", seriesIndex: "103" });
});

QUnit.test("noSeriesInfo", function (assert) {
    let parser = new BakaTsukiParser();
    let dom = syncLoadBakaTsukiSampleDoc();
    util.getElement(dom, "title").innerText = "Web to Epub";
    let metaInfo = parser.getEpubMetaInfo(dom);
    equal(metaInfo.seriesInfo, null);
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
           "<h3></h3>" +
           "<ul class=\"gallery mw-gallery-traditional\">"+
               "<li class=\"gallerybox\" style=\"width: 155px\"><div style=\"width: 155px\">" +
                   "<div class=\"thumb\">" +
                       "<a href=\"https://www.baka-tsuki.org/project/index.php?title=File:BTS_vol_01_000a.jpg\" class=\"image\">" +
                            "<img src=\"./Baka to Tesuto to Syokanju_Volume1 - Baka-Tsuki_files/120px-BTS_vol_01_000a.jpg\" >" +
                       "</a>" +
                   "</div>" +
               "</div></li>"+
               "<li class=\"comment\"></li>" +
           "</ul>" +
           "<div class=\"thumb tright\">" +
                "<a href=\"https://www.baka-tsuki.org/project/index.php?title=File:BTS_vol_01_000b.png\" class=\"image\">" +
                    "<img src=\"./Baka to Tesuto to Syokanju_Volume1 - Baka-Tsuki_files/120px-BTS_vol_01_000b.png\" >" +
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

    let imageCollector = new BakaTsukiImageCollector();
    let imagesMap = imageCollector.findImagesUsedInDocument(dom.body);

    // fake getting image size data
    let imageInfo = imagesMap.get("https://www.baka-tsuki.org/project/index.php?title=File:BTS_vol_01_000a.jpg");
    imageInfo.height = 100;
    imageInfo.width = 200;
    imageInfo = imagesMap.get("https://www.baka-tsuki.org/project/index.php?title=File:BTS_vol_01_000b.png");
    imageInfo.height = 300;
    imageInfo.width = 400;

    let parser = new BakaTsukiParser(imageCollector);
    parser.processImages(dom.documentElement, imagesMap);

    // convert to XHTML for comparison
    let doc2 = util.createEmptyXhtmlDoc();
    let body = doc2.getElementsByTagName("body")[0];
    body.appendChild(dom.getElementsByTagName("x")[0]);

    assert.equal(doc2.getElementsByTagName("x")[0].outerHTML,
        "<x xmlns=\"http://www.w3.org/1999/xhtml\">" +
           "<h3></h3>" +
           "<div>" +
             "<div class=\"svg_outer svg_inner\">"+
                "<svg xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" height=\"100%\" width=\"100%\" version=\"1.1\" preserveAspectRatio=\"xMidYMid meet\" viewBox=\"0 0 200 100\">" +
                    "<image xlink:href=\"../Images/0000_BTS_vol_01_000a.jpg\" height=\"100\" width=\"200\"/>"+
                    "<desc>https://www.baka-tsuki.org/project/index.php?title=File:BTS_vol_01_000a.jpg</desc>"+
                "</svg>"+
             "</div>"+
           "</div>"+
           "<div class=\"svg_outer svg_inner\">"+
                "<svg xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" height=\"100%\" width=\"100%\" version=\"1.1\" preserveAspectRatio=\"xMidYMid meet\" viewBox=\"0 0 400 300\">" +
                    "<image xlink:href=\"../Images/0001_BTS_vol_01_000b.png\" height=\"300\" width=\"400\"/>"+
                    "<desc>https://www.baka-tsuki.org/project/index.php?title=File:BTS_vol_01_000b.png</desc>"+
                "</svg>"+
            "</div>"+
           "<div class=\"thumbinner\">T1</div>" +
           "<div class=\"svg_outer svg_inner\">"+
                "<svg xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" height=\"100%\" width=\"100%\" version=\"1.1\" preserveAspectRatio=\"xMidYMid meet\" viewBox=\"0 0 200 100\">" +
                    "<image xlink:href=\"../Images/0000_BTS_vol_01_000a.jpg\" height=\"100\" width=\"200\"/>"+
                    "<desc>https://www.baka-tsuki.org/project/index.php?title=File:BTS_vol_01_000a.jpg</desc>"+
                "</svg>"+
            "</div>"+
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
            do {
                let node = walker.currentNode;
                if (node.id === id) {
                    return node.getElementsByTagName("a")[0].getAttribute("href");
                };
            } while(walker.nextNode());
        };
    };
}

test("fixupFootnotes", function (assert) {
    let dom = new DOMParser().parseFromString(
        "<html>" +
            "<head><title></title></head>" +
            "<body>" +
                "<h1>H1</h1>" +
                "<sup id=\"cite_ref-1\" class=\"reference\"><a href=\"http://www.baka-tsuki.org/project/index.php?title=WebtoEpub#cite_note-1\">[1]</a></sup>" +
                "<h1>H2</h1>" +
                "<ul><li id=\"cite_note-2\"><span class=\"mw-cite-backlink\"><a href=\"http://www.baka-tsuki.org/project/index.php?title=WebtoEpub#cite_ref-2\"><span class=\"cite-accessibility-label\">Jump up </span>^</a></span> <span class=\"reference-text\"></span></ul>" +
                "<h1>H3</h1>" +
                "<sup id=\"cite_ref-2\" class=\"reference\"><a href=\"http://www.baka-tsuki.org/project/index.php?title=WebtoEpub#cite_note-2\">[2]</a></sup>" +
                "<h1>H4</h1>" +
                "<ul><li id=\"cite_note-1\"><span class=\"mw-cite-backlink\"><a href=\"http://www.baka-tsuki.org/project/index.php?title=WebtoEpub#cite_ref-1\"><span class=\"cite-accessibility-label\">Jump up </span>^</a></span> <span class=\"reference-text\"></span></ul>" +
            "</body>" +
        "</html>",
        "text/html");
    let parser = new BakaTsukiParser();
    let content = dom.body.cloneNode(true);
    let epubItems = parser.splitContentIntoSections(content, null);
    parser.fixupFootnotes(epubItems);

    assert.equal(fetchHrefForId(epubItems, "cite_ref-1"), "../Text/0003_H4.xhtml#cite_note-1");
    assert.equal(fetchHrefForId(epubItems, "cite_ref-2"), "../Text/0001_H2.xhtml#cite_note-2");
    assert.equal(fetchHrefForId(epubItems, "cite_note-1"), "../Text/0000_H1.xhtml#cite_ref-1");
    assert.equal(fetchHrefForId(epubItems, "cite_note-2"), "../Text/0002_H3.xhtml#cite_ref-2");

});
