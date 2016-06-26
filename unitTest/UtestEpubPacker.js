
"use strict";

module( "EpubPacker");
function makeDummyXhtmlFile(title) {
    let xhtml = util.createEmptyXhtmlDoc();
    let h1 = xhtml.createElement("h1");
    h1.InnerText = title;
    xhtml.getElementsByTagName("body")[0].appendChild(h1);
    return xhtml;
}

function makePacker() {
    let metaInfo = new EpubMetaInfo();
    metaInfo.uuid = "Dummy UUID";
    metaInfo.title = "Dummy <Title>";
    metaInfo.author = "Dummy & Author";
    let epubPacker = new EpubPacker(metaInfo);
    return epubPacker;
}

function makeEpubItemSupplier() {
    let chapters = [];
    for (let i = 0; i < 2; ++i) {
        let title = "Title" + i;
        chapters.push({
            title: title,
            rawContent: makeDummyXhtmlFile(title)
        });
    }
    return new ArchiveOfOurOwnParser().epubItemSupplier(chapters);
}

test("buildContentOpf", function (assert) {
    let epubPacker = makePacker();
    epubPacker.metaInfo.seriesInfo = { name: "BakaSeries", seriesIndex: "666" };
    epubPacker.getDateForMetaData = function () { return "2015-10-17T21:04:54.061Z"; };
    let contentOpf = epubPacker.buildContentOpf(makeEpubItemSupplier());

    assert.equal(contentOpf,
        "<?xml version='1.0' encoding='utf-8'?>"+
        "<package xmlns=\"http://www.idpf.org/2007/opf\" version=\"2.0\" unique-identifier=\"BookId\">"+
            "<metadata xmlns:dc=\"http://purl.org/dc/elements/1.1/\" xmlns:opf=\"http://www.idpf.org/2007/opf\">"+
            "<dc:title>Dummy &lt;Title&gt;</dc:title>" +
            "<dc:language>en</dc:language>"+
            "<dc:date>2015-10-17T21:04:54.061Z</dc:date>" +
            "<dc:creator opf:file-as=\"Dummy &amp; Author\" opf:role=\"aut\">Dummy &amp; Author</dc:creator>" +
            "<dc:identifier id=\"BookId\" opf:scheme=\"URI\">Dummy UUID</dc:identifier>"+
            "<meta content=\"BakaSeries\" name=\"calibre:series\"/>" +
            "<meta content=\"666\" name=\"calibre:series_index\"/>" +
            "</metadata>"+
            "<manifest>"+
              "<item href=\"Text/0000.xhtml\" id=\"xhtml0000\" media-type=\"application/xhtml+xml\"/>" +
              "<item href=\"Text/0001.xhtml\" id=\"xhtml0001\" media-type=\"application/xhtml+xml\"/>" +
              "<item href=\"toc.ncx\" id=\"ncx\" media-type=\"application/x-dtbncx+xml\"/>" +
            "</manifest>"+
            "<spine toc=\"ncx\">"+
              "<itemref idref=\"xhtml0000\"/>" +
              "<itemref idref=\"xhtml0001\"/>" +
            "</spine>" +
        "</package>"
    );
});

test("buildContentOpfWithCover", function (assert) {
    let itemSupplier = makeEpubItemSupplier();
    itemSupplier.coverImageId = function () { return "cover000" };
    let epubPacker = makePacker();
    epubPacker.getDateForMetaData = function () { return "2015-10-17T21:04:54.061Z"; };
    let contentOpf = epubPacker.buildContentOpf(itemSupplier);

    assert.equal(contentOpf,
        "<?xml version='1.0' encoding='utf-8'?>" +
        "<package xmlns=\"http://www.idpf.org/2007/opf\" version=\"2.0\" unique-identifier=\"BookId\">" +
            "<metadata xmlns:dc=\"http://purl.org/dc/elements/1.1/\" xmlns:opf=\"http://www.idpf.org/2007/opf\">" +
            "<dc:title>Dummy &lt;Title&gt;</dc:title>" +
            "<dc:language>en</dc:language>" +
            "<dc:date>2015-10-17T21:04:54.061Z</dc:date>" +
            "<dc:creator opf:file-as=\"Dummy &amp; Author\" opf:role=\"aut\">Dummy &amp; Author</dc:creator>" +
            "<dc:identifier id=\"BookId\" opf:scheme=\"URI\">Dummy UUID</dc:identifier>" +
            "<meta content=\"cover000\" name=\"cover\"/>" +
            "</metadata>" +
            "<manifest>" +
              "<item href=\"Text/0000.xhtml\" id=\"xhtml0000\" media-type=\"application/xhtml+xml\"/>" +
              "<item href=\"Text/0001.xhtml\" id=\"xhtml0001\" media-type=\"application/xhtml+xml\"/>" +
              "<item href=\"toc.ncx\" id=\"ncx\" media-type=\"application/x-dtbncx+xml\"/>" +
              "<item href=\"Text/Cover.xhtml\" id=\"cover\" media-type=\"application/xhtml+xml\"/>" +
            "</manifest>" +
            "<spine toc=\"ncx\">" +
              "<itemref idref=\"cover\"/>" +
              "<itemref idref=\"xhtml0000\"/>" +
              "<itemref idref=\"xhtml0001\"/>" +
            "</spine>" +
            "<guide>" +
                "<reference href=\"Text/Cover.xhtml\" title=\"Cover\" type=\"cover\"/>" +
            "</guide>" +
        "</package>"
    );
});

test("buildTableOfContents", function (assert) {
    let buildTableOfContents = makePacker().buildTableOfContents(makeEpubItemSupplier());
    assert.equal(buildTableOfContents,
        "<?xml version='1.0' encoding='utf-8'?>" +
        "<ncx xmlns=\"http://www.daisy.org/z3986/2005/ncx/\" version=\"2005-1\" xml:lang=\"en\">" +
          "<head>" +
            "<meta content=\"Dummy UUID\" name=\"dtb:uid\"/>" +
            "<meta content=\"2\" name=\"dtb:depth\"/>" +
            "<meta content=\"0\" name=\"dtb:totalPageCount\"/>" +
            "<meta content=\"0\" name=\"dtb:maxPageNumber\"/>" +
          "</head>" +
          "<docTitle>" +
            "<text>Dummy &lt;Title&gt;</text>" +
          "</docTitle>" +
          "<navMap>" +
            "<navPoint id=\"body0001\" playOrder=\"1\">" +
              "<navLabel>" +
                "<text>Title0</text>" +
              "</navLabel>" +
              "<content src=\"Text/0000.xhtml\"/>" +
            "</navPoint>" +
            "<navPoint id=\"body0002\" playOrder=\"2\">" +
              "<navLabel>" +
                "<text>Title1</text>" +
              "</navLabel>" +
              "<content src=\"Text/0001.xhtml\"/>" +
            "</navPoint>" +
          "</navMap>" +
        "</ncx>"
    );
});

test("NavPointParentElementsStackSimpleNest", function (assert) {
    let stack = new NavPointParentElementsStack("navMap");
    assert.equal(stack.maxDepth, 0);
    stack.addElement(1, "h2");
    stack.addElement(2, "h3");
    stack.addElement(3, "h4");
    assert.equal(stack.parents.length, 4);
    assert.equal(stack.maxDepth, 3);

    assert.equal(stack.findParentElement(0), "navMap");
    assert.equal(stack.findParentElement(1), "navMap");
    assert.equal(stack.findParentElement(2), "h2");
    assert.equal(stack.findParentElement(3), "h3");
});

test("UnwindNavPointParentElementsStack", function (assert) {
    // note, I should really be adding Elements to the stack
    // but for testing purposes, strings work and are easier.
    let stack = new NavPointParentElementsStack("navMap");
    assert.equal(stack.maxDepth, 0);
    stack.addElement(1, "h2");
    stack.addElement(2, "h3");
    stack.addElement(3, "h4");
    assert.equal(stack.parents.length, 4);
    assert.equal(stack.maxDepth, 3);

    stack.addElement(2, "h3.2");
    assert.equal(stack.parents.length, 3);
    assert.equal(stack.maxDepth, 3);
    assert.equal(stack.parents[2].element, "h3.2");

    stack.addElement(3, "h4.2");
    assert.equal(stack.parents.length, 4);
    assert.equal(stack.maxDepth, 3);
    assert.equal(stack.parents[2].element, "h3.2");
    assert.equal(stack.parents[3].element, "h4.2");

    stack.addElement(0, "h1.2");
    assert.equal(stack.parents.length, 2);
    assert.equal(stack.maxDepth, 3);
    assert.equal(stack.parents[1].element, "h1.2");

    stack.addElement(2, "h3.3");
    assert.equal(stack.parents.length, 3);
    assert.equal(stack.maxDepth, 3);
    assert.equal(stack.parents[1].element, "h1.2");
    assert.equal(stack.parents[2].element, "h3.3");
});

test("makeCoverImageXhtmlFile", function (assert) {
    let imageInfo = new BakaTsukiImageInfo("http://dummy/cover.png", -1, "http://dummy/cover.png");
    imageInfo.width = 400;
    imageInfo.height = 200;
    imageInfo.zipHref = "OEBPS/Images/cover.png"
    let itemSupplier = new BakaTsukiEpubItemSupplier(null, [], [], imageInfo, "OEBPS/Images/cover.png");
    let xhtmlFile = itemSupplier.makeCoverImageXhtmlFile();
    assert.equal(xhtmlFile,
        "<?xml version='1.0' encoding='utf-8'?>" +
        "<html xmlns=\"http://www.w3.org/1999/xhtml\">" +
            "<head>" +
                "<title></title>" +
                "<style type=\"text/css\">img { max-width: 100%; max-height: 100%; padding: 0; margin: 0; } " +
                "div.svg_outer { display: block; margin-bottom: 0; margin-left: 0; margin-right: 0; margin-top: 0; padding-bottom: 0; padding-left: 0; "+
                                "padding-right: 0; padding-top: 0; text-align: left } " +
                "div.svg_inner { display: block; text-align: center } " +
                "</style>" +
            "</head>" +
            "<body>" +
               "<div class=\"svg_outer svg_inner\">" +
                    "<svg xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" height=\"100%\" width=\"100%\" version=\"1.1\" preserveAspectRatio=\"xMidYMid meet\" viewBox=\"0 0 400 200\">" +
                        "<image xlink:href=\"../Images/cover.png\" height=\"200\" width=\"400\"/>" +
                        "<desc>http://dummy/cover.png</desc>" + 
                    "</svg>" +
                "</div>" +
            "</body>" +
        "</html>"
    );
});