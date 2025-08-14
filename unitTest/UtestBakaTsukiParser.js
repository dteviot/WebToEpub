
"use strict";

module("BakaTsuki");

/// Load the sample file
/// As file operation is async, load the sample file into dom, and call doneCallback when file loaded
function syncLoadBakaTsukiSampleDoc() {
    let xhr = new XMLHttpRequest();
    xhr.open("GET", "../testdata/Baka-Tsuki.html", false);
    xhr.send(null);
    let dom = new DOMParser().parseFromString(xhr.responseText, "text/html");
    util.setBaseTag("http://www.baka-tsuki.org/project/index.php?title=Web_to_Epub", dom);
    return dom;
}

function getTestDom() {
    return new DOMParser().parseFromString(
        "<x>" +
           "<!-- comment 1 -->" +
           "<h1>T1</h1>" +
           "<div id=\"toc\"></div>" +
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
    equal(metaInfo.author, "<unknown>");
    equal(metaInfo.language, "en");
    equal(metaInfo.seriesName, "Web to Epub");
    equal(metaInfo.seriesIndex, "103");
});

QUnit.test("noSeriesInfo", function (assert) {
    let parser = new BakaTsukiParser();
    let dom = syncLoadBakaTsukiSampleDoc();
    dom.querySelector("title").innerText = "Web to Epub";
    let metaInfo = parser.getEpubMetaInfo(dom);
    equal(metaInfo.seriesName, null);
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
           "<table><tbody><tr><th>Table1</th></tr><tr><td><a href=\"http:\\dummy.html\">a</a></td></tr></tbody></table>" +
        "</x>",
        "text/html"
    );

    BakaTsukiParser.removeUnwantedTable(dom.documentElement);
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
               "<table><tbody><tr><th>Table5</th></tr><tr><td><a href=\"http:\\dummy.html\">a</a></td></tr></tbody></table>" +
           "</th></tr></tbody></table>" +
        "</x>",
        "text/html"
    );

    BakaTsukiParser.removeUnwantedTable(dom.documentElement);
    assert.equal(dom.body.innerHTML,
        "<x>" +
           "<table><tbody><tr><th>Table1</th></tr></tbody></table>" +
           "<table><tbody><tr><th>Table2" +
               "<table><tbody><tr><th>Table3</th></tr></tbody></table>" +
           "</th></tr></tbody></table>" +
        "</x>");
});

QUnit.test("removeTextBeforeGallery", function (assert) {
    let dom = TestUtils.makeDomWithBody(
        "<p>misc text</p>" +
        "<h2>Image Gallery</h2>" +
        "<p>misc text 2</p>" +
        "<div></div>" +
        "<ul class=\"gallery mw-gallery-traditional\"></ul>"
    );

    let gallery = dom.getElementsByTagName("ul")[0];
    BakaTsukiParser.removeTextBeforeGallery(gallery);
    assert.equal(dom.body.innerHTML,
        "<p>misc text</p>" +
        "<h2>Image Gallery</h2>" +
        "<div></div>" +
        "<ul class=\"gallery mw-gallery-traditional\"></ul>");
});
           
QUnit.test("replaceImageTags", function (assert) {
    let dom = new DOMParser().parseFromString(
        "<x>" +
           "<div></div>" +
           "<p>misc text</p>" +
           "<ul class=\"gallery mw-gallery-traditional\">"+
               "<li class=\"gallerybox\" style=\"width: 155px\"><div style=\"width: 155px\">" +
                   "<div class=\"thumb\">" +
                       "<a href=\"https://www.baka-tsuki.org/project/index.php?title=File:BTS_vol_01_000a.jpg\" class=\"image\">" +
                            "<img src=\"./Baka to Tesuto to Syokanju_Volume1 - Baka-Tsuki_files/120px-BTS_vol_01_000a.jpg\" >" +
                       "</a>" +
                       "<div class=\"thumbcaption\">" +
                           "<div class=\"magnify\">" +
                               "<a href=\"/project/index.php?title=File:Mondaiji-tachi_ga_isekai_kara_kuru_soudesu_yo_V10_Color_Pic.jpg\" class=\"internal\" title=\"Enlarge\"></a>" +
                           "</div>" +
                           "<sup id=\"cite_ref-1\" class=\"reference\"><a href=\"#cite_note-1\">[1]</a></sup>" +
                       "</div>" + 
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
                "<div class=\"thumbcaption\">comment</div>" + 
           "</div>" +
           "<div class=\"floatleft\">" +
                "<a href=\"https://www.baka-tsuki.org/project/index.php?title=File:BTS_V01_Cover.jpg\" class=\"image\">" +
                    "<img src=\"./Baka to Tesuto to Syokanju_Volume1 - Baka-Tsuki_files/120px-BTS_V01_Cover.jpg\" >" +
                "</a>" +
           "</div>" +
           "<div class=\"rating-section\">" +
                    "<img src=\"https://www.baka-tsuki.org/project/index.php?title=File:star_on.gif\" >" +
           "</div>" +
           "<p>"+
                "<img src=\"https://www.baka-tsuki.org/project/index.php?title=File:star_on.gif\" >" +
           "</p>"+
           "<p><i><b>"+
                "<img src=\"https://www.baka-tsuki.org/project/index.php?title=File:star_on.gif\" >" +
           "</b></i></p>"+
           "<p><i><b>"+
                "this image <img src=\"https://www.baka-tsuki.org/project/index.php?title=File:star_on.gif\" > should be inline" +
           "</b></i></p>"+
        "</x>",
        "text/html"
    );

    // Hack, if I don't do this, on Chrome the src value for <img> tags with relative paths is blank.
    util.setBaseTag("https://www.baka-tsuki.org/project/index.php", dom);

    let imageCollector = new ImageCollector();
    let preferences = new UserPreferences();
    preferences.includeImageSourceUrl.value = true;
    preferences.useSvgForImages.value = true;
    imageCollector.userPreferences = preferences;
    imageCollector.findImagesUsedInDocument(dom.body);

    // fake getting image size data
    let imageInfo = imageCollector.imageInfoByUrl("https://www.baka-tsuki.org/project/index.php?title=File:BTS_vol_01_000a.jpg");
    imageInfo.height = 301;
    imageInfo.width = 302;
    imageInfo = imageCollector.imageInfoByUrl("https://www.baka-tsuki.org/project/index.php?title=File:BTS_vol_01_000b.png");
    imageInfo.height = 600;
    imageInfo.width = 400;
    imageInfo.mediaType = "image/png";
    imageInfo = imageCollector.imageInfoByUrl("https://www.baka-tsuki.org/project/index.php?title=File:BTS_V01_Cover.jpg");
    imageInfo.height = 10;
    imageInfo.width = 20;
    imageInfo = imageCollector.imageInfoByUrl("https://www.baka-tsuki.org/project/index.php?title=File:star_on.gif");
    imageInfo.height = 1;
    imageInfo.width = 2;
    imageInfo.mediaType = "image/gif";
    let parser = new BakaTsukiParser(imageCollector);
    parser.replaceImageTags(dom.documentElement);

    // convert to XHTML for comparison
    let doc2 = util.createEmptyXhtmlDoc();
    let body = doc2.getElementsByTagName("body")[0];
    body.appendChild(dom.getElementsByTagName("x")[0]);

    assert.equal(doc2.getElementsByTagName("x")[0].outerHTML,
        "<x xmlns=\"http://www.w3.org/1999/xhtml\">" +
           "<div></div>" +
           "<div>" +
             "<div class=\"svg_outer svg_inner\">"+
                "<svg xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" height=\"99%\" width=\"100%\" version=\"1.1\" preserveAspectRatio=\"xMidYMid meet\" viewBox=\"0 0 302 301\">" +
                    "<image xlink:href=\"../Images/0000_BTS_vol_01_000a.jpg\" width=\"302\" height=\"301\"/>"+
                    "<desc>https://www.baka-tsuki.org/project/index.php?title=File:BTS_vol_01_000a.jpg</desc>"+
                "</svg>"+
                "<div class=\"thumbcaption\">" +
                    "<sup id=\"cite_ref-1\" class=\"reference\"><a href=\"#cite_note-1\">[1]</a></sup>" +
                "</div>" + 
             "</div>"+
           "</div>"+
           "<div class=\"svg_outer svg_inner\">"+
                "<svg xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" height=\"99%\" width=\"100%\" version=\"1.1\" preserveAspectRatio=\"xMidYMid meet\" viewBox=\"0 0 400 600\">" +
                    "<image xlink:href=\"../Images/0001_BTS_vol_01_000b.png\" width=\"400\" height=\"600\"/>"+
                    "<desc>https://www.baka-tsuki.org/project/index.php?title=File:BTS_vol_01_000b.png</desc>"+
                "</svg>"+
            "</div>"+
           "<div class=\"thumbinner\">T1</div>" +
           "<div class=\"svg_outer svg_inner\">"+
                "<svg xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" height=\"99%\" width=\"100%\" version=\"1.1\" preserveAspectRatio=\"xMidYMid meet\" viewBox=\"0 0 302 301\">" +
                    "<image xlink:href=\"../Images/0000_BTS_vol_01_000a.jpg\" width=\"302\" height=\"301\"/>"+
                    "<desc>https://www.baka-tsuki.org/project/index.php?title=File:BTS_vol_01_000a.jpg</desc>"+
                "</svg>"+
                "<div class=\"thumbcaption\">comment</div>" + 
            "</div>"+
            "<div><img src=\"../Images/0002_BTS_V01_Cover.jpg\" alt=\"\" /><!--  https://www.baka-tsuki.org/project/index.php?title=File:BTS_V01_Cover.jpg\  --></div>"+
             "<div class=\"rating-section\">" +
             "<div><img src=\"../Images/0003_star_on.gif\" alt=\"\" /><!--  https://www.baka-tsuki.org/project/index.php?title=File:star_on.gif\  --></div>"+
             "</div>" +
             "<div><img src=\"../Images/0003_star_on.gif\" alt=\"\" /><!--  https://www.baka-tsuki.org/project/index.php?title=File:star_on.gif\  --></div>"+
             "<p></p>"+
             "<div><img src=\"../Images/0003_star_on.gif\" alt=\"\" /><!--  https://www.baka-tsuki.org/project/index.php?title=File:star_on.gif\  --></div>"+
           "<p><i><b></b></i></p>"+
           "<p><i><b>"+
                "this image <span><img class=\"inline\" src=\"../Images/0003_star_on.gif\" alt=\"\" /><!--  https://www.baka-tsuki.org/project/index.php?title=File:star_on.gif\  --></span> should be inline" +
           "</b></i></p>"+
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

QUnit.test("hasNoVisibleContent", function (assert) {
    let dom = TestUtils.makeDomWithBody(
        "<body><div style=\"display:none;\"></div>"+
        "<div class=\"print-no\">\n"+
        "</div>"+
         "<svg xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" height=\"100%\" width=\"100%\" version=\"1.1\" preserveAspectRatio=\"xMidYMid meet\" viewBox=\"0 0 1500 597\">"+
         "<image xlink:href=\"../Images/[0000]Hantuki01 001.jpg\" height=\"597\" width=\"1500\" data-origin=\"http://sonako.wikia.com/wiki/File:Hantuki01 001.jpg\"/>"+
         "</svg>"+
         "<div><div id=\"mb_video_syncad_bottom\" style=\"padding: 5px 0px 0px;\"></div></div><p><br />"+
         "</p>\n"
    );

    let elements = new Array();
    for(let child of dom.body.childNodes) {
        elements.push(child);
    };

    assert.equal(BakaTsukiParser.prototype.hasVisibleContent(elements), true);

    // remove <image>, now no visible content
    let newElements = elements.filter(e => (e.tagName !== "svg"));
    assert.equal(BakaTsukiParser.prototype.hasVisibleContent(newElements), false);

    // add <img> at top level
    let img = dom.createElement("img");
    newElements.push(img);
    assert.equal(BakaTsukiParser.prototype.hasVisibleContent(newElements), true);

    // add nested <img>
    newElements.pop();
    assert.equal(BakaTsukiParser.prototype.hasVisibleContent(newElements), false);
    newElements[0].appendChild(img);
    assert.equal(BakaTsukiParser.prototype.hasVisibleContent(newElements), true);
});


QUnit.test("splitContentIntoEpubItems", function (assert) {
    let dom = new DOMParser().parseFromString(
        "<div>" +
           "\n\n"+
           "<h1>H1.1</h1>" +
           "<p>text1</p>" +
           "\n" +
           "<p><br /></p>" +
           "<br />" +
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
    let epubItems = parser.splitContentIntoEpubItems(dom.body.firstChild);
    assert.equal(epubItems.length, 3);
    assert.equal(epubItems[0].nodes.length, 2);
    assert.equal(epubItems[1].nodes.length, 4);
    assert.equal(epubItems[2].nodes.length, 3);

    let nodes = epubItems[0].nodes;
    assert.equal(nodes[0].outerHTML, "<h1>H1.1</h1>");
    assert.equal(nodes[1].outerHTML, "<p>text1</p>");

    nodes = epubItems[1].nodes;
    assert.equal(nodes[0].outerHTML, "<h1>H1.2</h1>");
    assert.equal(nodes[1].outerHTML, "<h2>H2.2</h2>");
    assert.equal(nodes[2].outerHTML, "<p>text2</p>");
    assert.equal(nodes[3].outerHTML, "<p>text3</p>");

    nodes = epubItems[2].nodes;
    assert.equal(nodes[0].outerHTML, "<h1>H1.3</h1>");
    assert.equal(nodes[1].outerHTML, "<h2>H2.3</h2>");
    assert.equal(nodes[2].outerHTML, "<h3>H2.3</h3>");
});

function fetchHrefForId(epubItems, id) {
    for(let epubItem of epubItems) {
        for(let startNode of epubItem.nodes) {
            let walker = document.createTreeWalker(startNode);
            do {
                let node = walker.currentNode;
                if (node.id === id) {
                    return node.getElementsByTagName("a")[0].getAttribute("href");
                };
            } while(walker.nextNode());
        };
    };
}

test("fixupInternalHyperLinks", function (assert) {
    let dom = TestUtils.makeDomWithBody(
        "<h1>H1</h1>" +
        "<sup id=\"cite_ref-1\" class=\"reference\"><a href=\"http://www.baka-tsuki.org/project/index.php?title=WebtoEpub#cite_note-1\">[1]</a></sup>" +
        "<h1>H2</h1>" +
        "<ul><li id=\"cite_note-2\"><span class=\"mw-cite-backlink\"><a href=\"http://www.baka-tsuki.org/project/index.php?title=WebtoEpub#cite_ref-2\"><span class=\"cite-accessibility-label\">Jump up </span>^</a></span> <span class=\"reference-text\"></span></ul>" +
        "<h1>H3</h1>" +
        "<sup id=\"cite_ref-2\" class=\"reference\"><a href=\"http://www.baka-tsuki.org/project/index.php?title=WebtoEpub#cite_note-2\">[2]</a></sup>" +
        "<h1>H4</h1>" +
        "<ul><li id=\"cite_note-1\"><span class=\"mw-cite-backlink\"><a href=\"http://www.baka-tsuki.org/project/index.php?title=WebtoEpub#cite_ref-1\"><span class=\"cite-accessibility-label\">Jump up </span>^</a></span> <span class=\"reference-text\"></span></ul>"
    );
    let parser = new BakaTsukiParser();
    let content = dom.body.cloneNode(true);
    let epubItems = parser.splitContentIntoEpubItems(content, null);
    BakaTsukiParser.fixupInternalHyperLinks(epubItems);

    assert.equal(fetchHrefForId(epubItems, "cite_ref-1"), "../Text/0003_H4.xhtml#cite_note-1");
    assert.equal(fetchHrefForId(epubItems, "cite_ref-2"), "../Text/0001_H2.xhtml#cite_note-2");
    assert.equal(fetchHrefForId(epubItems, "cite_note-1"), "../Text/0000_H1.xhtml#cite_ref-1");
    assert.equal(fetchHrefForId(epubItems, "cite_note-2"), "../Text/0002_H3.xhtml#cite_ref-2");

});

// demonstrate Chrome closing <br> tags when convert from HTML to XHTML
test("replaceInvalidElements", function (assert) {
    let dom = TestUtils.makeDomWithBody(
        "<p>SomeText</p>" +
        "<br>" +
        "<p>More</p>"
    );
    let parser = new BakaTsukiParser();
    let content = dom.body.cloneNode(true);
    assert.equal(content.outerHTML, "<body><p>SomeText</p><br><p>More</p></body>");

    let xhtml = util.createEmptyXhtmlDoc();
    let body = xhtml.getElementsByTagName("body")[0];
    body.replaceWith(content);

    assert.equal(xhtml.getElementsByTagName("body")[0].outerHTML, 
        "<body xmlns=\"http://www.w3.org/1999/xhtml\"><p>SomeText</p><br /><p>More</p></body>");
});

test("unSuperScriptAlternateTranslations", function (assert) {
    let dom = TestUtils.makeDomWithBody(
        "<h2>"+
            "<span class=\"mw-headline\" id=\"Chapter_5_.E2.80.93_ZeusLightning_Thunder_and_OdinSeverance_Spear.2C_Twisted_Dragon_of_Destiny\">Chapter 5 – "+
                "<span style=\"white-space: nowrap; position: relative;\">"+
                    "<span style=\"position: absolute; font-size: .8em; top: -11px; left: 50%; white-space: nowrap; letter-spacing: normal; color: inherit; font-weight: inherit; font-style: inherit;\">"+
                        "<span style=\"position: relative; left: -50%;\">Zeus</span>"+
                    "</span>"+
                    "<span style=\"display: inline-block; color: inherit; letter-spacing: normal; font-size: 1.0em; font-weight: inherit;\">Lightning Thunder</span>"+
                "</span> and "+
                "<span style=\"white-space: nowrap; position: relative;\">"+
                    "<span style=\"position: absolute; font-size: .8em; top: -11px; left: 50%; white-space: nowrap; letter-spacing: normal; color: inherit; font-weight: inherit; font-style: inherit;\">"+
                        "<span style=\"position: relative; left: -50%;\">Odin</span>"+
                    "</span>"+
                    "<span style=\"display: inline-block; color: inherit; letter-spacing: normal; font-size: 1.0em; font-weight: inherit;\">Severance Spear</span>"+
                "</span>, Twisted Dragon of Destiny"+
            "</span>"+
        "</h2>"
    );

    let heading = dom.querySelector("h2");
    BakaTsukiParser.unSuperScriptAlternateTranslations(heading);
    let actual = heading.textContent;
    assert.equal(actual, "Chapter 5 – Lightning Thunder (Zeus) and Severance Spear (Odin), Twisted Dragon of Destiny")
});

test("isFullTextPage", function (assert) {
    assert.ok(BakaTsukiSeriesPageParser.isFullTextPage("https://www.baka-tsuki.org/project/index.php?title=Shinmai_Maou_no_Keiyakusha:Volume_1"));
    assert.notOk(BakaTsukiSeriesPageParser.isFullTextPage("https://www.baka-tsuki.org/project/index.php?title=Shinmai_Maou_no_Keiyakusha"));
});

test("registerBakaParsers", function (assert) {
    BakaTsukiSeriesPageParser.registerBakaParsers(false);
    let seriesPageUrl = "https://www.baka-tsuki.org/project/index.php?title=Shinmai_Maou_no_Keiyakusha";
    let fullPageUrl = "https://www.baka-tsuki.org/project/index.php?title=Shinmai_Maou_no_Keiyakusha:Volume_1";

    let parser = parserFactory.fetch(seriesPageUrl);
    assert.ok(parser instanceof BakaTsukiParser );
    parser = parserFactory.fetch(fullPageUrl);
    assert.ok(parser instanceof BakaTsukiParser );
    
    BakaTsukiSeriesPageParser.registerBakaParsers(true);
    parser = parserFactory.fetch(seriesPageUrl);
    assert.ok(parser instanceof BakaTsukiSeriesPageParser );
    parser = parserFactory.fetch(fullPageUrl);
    assert.ok(parser instanceof BakaTsukiParser );
});
