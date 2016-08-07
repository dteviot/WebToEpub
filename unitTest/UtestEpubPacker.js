
"use strict";

module( "EpubPacker");
function makeDummyXhtmlFile(title) {
    let xhtml = util.createEmptyXhtmlDoc();
    let content = xhtml.createElement("div");
    content.className = "userstuff module";
    xhtml.getElementsByTagName("body")[0].appendChild(content);
    let h1 = xhtml.createElement("h1");
    h1.InnerText = title;
    content.appendChild(h1);
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

function makeEpubItemSupplier(imageCollector) {
    imageCollector = imageCollector || ImageCollector.StubCollector();
    let chapters = [];
    for (let i = 0; i < 2; ++i) {
        let title = "Title" + i;
        chapters.push({
            sourceUrl: "http://dummy.com/" + title,
            title: title,
            isIncludeable: true,
            newArc: null,
            rawDom: makeDummyXhtmlFile(title)
        });
    }
    let parser = new ArchiveOfOurOwnParser();
    let epubItems = parser.chaptersToEpubItems(chapters);
    return new EpubItemSupplier(parser, epubItems, imageCollector);
}

test("buildContentOpf", function (assert) {
    let epubPacker = makePacker();
    epubPacker.metaInfo.seriesName = "BakaSeries";
    epubPacker.metaInfo.seriesIndex = "666";
    epubPacker.getDateForMetaData = function () { return "2015-10-17T21:04:54.061Z"; };
    let contentOpf = epubPacker.buildContentOpf(makeEpubItemSupplier());

    // firefox adds /r/n after some elements. Remove so string same for Chrome and Firefox.
    assert.equal(contentOpf.replace(/\r|\n/g, ""),
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
              "<item href=\"Text/0000_Title0.xhtml\" id=\"xhtml0000\" media-type=\"application/xhtml+xml\"/>" +
              "<item href=\"Text/0001_Title1.xhtml\" id=\"xhtml0001\" media-type=\"application/xhtml+xml\"/>" +
              "<item href=\"Styles/stylesheet.css\" id=\"stylesheet\" media-type=\"text/css\"/>" +
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
    let image = new ImageInfo("http://bp.org/thepic.jpeg", 0, "http://bp.org/thepic.jpeg");
    image.isCover = true;
    let imageCollector = {
        coverImageInfo: image,
        imagesToPackInEpub: () => [ image ]
    };
    let itemSupplier = makeEpubItemSupplier(imageCollector);
    let epubPacker = makePacker();
    epubPacker.getDateForMetaData = function () { return "2015-10-17T21:04:54.061Z"; };
    let contentOpf = epubPacker.buildContentOpf(itemSupplier);

    // firefox adds /r/n after some elements. Remove so string same for Chrome and Firefox.
    assert.equal(contentOpf.replace(/\r|\n/g, ""),
        "<?xml version='1.0' encoding='utf-8'?>" +
        "<package xmlns=\"http://www.idpf.org/2007/opf\" version=\"2.0\" unique-identifier=\"BookId\">" +
            "<metadata xmlns:dc=\"http://purl.org/dc/elements/1.1/\" xmlns:opf=\"http://www.idpf.org/2007/opf\">" +
            "<dc:title>Dummy &lt;Title&gt;</dc:title>" +
            "<dc:language>en</dc:language>" +
            "<dc:date>2015-10-17T21:04:54.061Z</dc:date>" +
            "<dc:creator opf:file-as=\"Dummy &amp; Author\" opf:role=\"aut\">Dummy &amp; Author</dc:creator>" +
            "<dc:identifier id=\"BookId\" opf:scheme=\"URI\">Dummy UUID</dc:identifier>" +
            "<meta content=\"cover-image\" name=\"cover\"/>" +
            "</metadata>" +
            "<manifest>" +
              "<item href=\"Images/0000_thepic.jpeg\" id=\"cover-image\" media-type=\"image/jpeg\"/>" +
              "<item href=\"Text/0000_Title0.xhtml\" id=\"xhtml0000\" media-type=\"application/xhtml+xml\"/>" +
              "<item href=\"Text/0001_Title1.xhtml\" id=\"xhtml0001\" media-type=\"application/xhtml+xml\"/>" +
              "<item href=\"Styles/stylesheet.css\" id=\"stylesheet\" media-type=\"text/css\"/>" +
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

test("buildContentOpfWithTranslatorAndAuthorFileAs", function (assert) {
    let epubPacker = makePacker();
    epubPacker.metaInfo.seriesName = "BakaSeries";
    epubPacker.metaInfo.seriesIndex = "666";
    epubPacker.metaInfo.fileAuthorAs = "Doe, John";
    epubPacker.metaInfo.translator = "Baka-Tsuki staff";
    epubPacker.getDateForMetaData = function () { return "2015-10-17T21:04:54.061Z"; };
    let contentOpf = epubPacker.buildContentOpf(makeEpubItemSupplier());

    // firefox adds /r/n after some elements. Remove so string same for Chrome and Firefox.
    assert.equal(contentOpf.replace(/\r|\n/g, ""),
        "<?xml version='1.0' encoding='utf-8'?>" +
        "<package xmlns=\"http://www.idpf.org/2007/opf\" version=\"2.0\" unique-identifier=\"BookId\">" +
            "<metadata xmlns:dc=\"http://purl.org/dc/elements/1.1/\" xmlns:opf=\"http://www.idpf.org/2007/opf\">" +
            "<dc:title>Dummy &lt;Title&gt;</dc:title>" +
            "<dc:language>en</dc:language>" +
            "<dc:date>2015-10-17T21:04:54.061Z</dc:date>" +
            "<dc:creator opf:file-as=\"Doe, John\" opf:role=\"aut\">Dummy &amp; Author</dc:creator>" +
            "<dc:contributor opf:file-as=\"Baka-Tsuki staff\" opf:role=\"trl\">Baka-Tsuki staff</dc:contributor>" +
            "<dc:identifier id=\"BookId\" opf:scheme=\"URI\">Dummy UUID</dc:identifier>" +
            "<meta content=\"BakaSeries\" name=\"calibre:series\"/>" +
            "<meta content=\"666\" name=\"calibre:series_index\"/>" +
            "</metadata>" +
            "<manifest>" +
              "<item href=\"Text/0000_Title0.xhtml\" id=\"xhtml0000\" media-type=\"application/xhtml+xml\"/>" +
              "<item href=\"Text/0001_Title1.xhtml\" id=\"xhtml0001\" media-type=\"application/xhtml+xml\"/>" +
              "<item href=\"Styles/stylesheet.css\" id=\"stylesheet\" media-type=\"text/css\"/>" +
              "<item href=\"toc.ncx\" id=\"ncx\" media-type=\"application/x-dtbncx+xml\"/>" +
            "</manifest>" +
            "<spine toc=\"ncx\">" +
              "<itemref idref=\"xhtml0000\"/>" +
              "<itemref idref=\"xhtml0001\"/>" +
            "</spine>" +
        "</package>"
    );
});

test("buildTableOfContents", function (assert) {
    let buildTableOfContents = makePacker().buildTableOfContents(makeEpubItemSupplier());
    // firefox adds /r/n after some elements. Remove so string same for Chrome and Firefox.
    assert.equal(buildTableOfContents.replace(/\r|\n/g, ""),
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
              "<content src=\"Text/0000_Title0.xhtml\"/>" +
            "</navPoint>" +
            "<navPoint id=\"body0002\" playOrder=\"2\">" +
              "<navLabel>" +
                "<text>Title1</text>" +
              "</navLabel>" +
              "<content src=\"Text/0001_Title1.xhtml\"/>" +
            "</navPoint>" +
          "</navMap>" +
        "</ncx>"
    );
});

test("buildNestedTableOfContents", function (assert) {
    let epubItemSupplier = makeEpubItemSupplier();
    let epubItems = [];
    epubItems.push(new ChapterEpubItem({sourceUrl: "", title: "C1", newArc: null }, null, 0));
    epubItems.push(new ChapterEpubItem({sourceUrl: "", title: "A1C1", newArc: "A1" }, null, 1));
    epubItems.push(new ChapterEpubItem({sourceUrl: "", title: "A1C2", newArc: null }, null, 2));
    epubItems.push(new ChapterEpubItem({sourceUrl: "", title: "A2C1", newArc: "A2" }, null, 3));

    epubItemSupplier.epubItems = epubItems;
    let buildTableOfContents = makePacker().buildTableOfContents(epubItemSupplier);
    // firefox adds /r/n after some elements. Remove so string same for Chrome and Firefox.
    assert.equal(buildTableOfContents.replace(/\r|\n/g, ""),
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
                "<text>C1</text>" +
              "</navLabel>" +
              "<content src=\"Text/0000_C1.xhtml\"/>" +
            "</navPoint>" +
            "<navPoint id=\"body0002\" playOrder=\"2\">" +
              "<navLabel>" +
                "<text>A1</text>" +
              "</navLabel>" +
              "<content src=\"Text/0001_A1C1.xhtml\"/>" +
                "<navPoint id=\"body0003\" playOrder=\"2\">" +
                  "<navLabel>" +
                    "<text>A1C1</text>" +
                  "</navLabel>" +
                  "<content src=\"Text/0001_A1C1.xhtml\"/>" +
                "</navPoint>" +
                "<navPoint id=\"body0004\" playOrder=\"3\">" +
                  "<navLabel>" +
                    "<text>A1C2</text>" +
                  "</navLabel>" +
                  "<content src=\"Text/0002_A1C2.xhtml\"/>" +
                "</navPoint>" +
            "</navPoint>" +
            "<navPoint id=\"body0005\" playOrder=\"4\">" +
              "<navLabel>" +
                "<text>A2</text>" +
              "</navLabel>" +
              "<content src=\"Text/0003_A2C1.xhtml\"/>" +
                "<navPoint id=\"body0006\" playOrder=\"4\">" +
                  "<navLabel>" +
                    "<text>A2C1</text>" +
                  "</navLabel>" +
                  "<content src=\"Text/0003_A2C1.xhtml\"/>" +
                "</navPoint>" +
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
    let imageInfo = new ImageInfo("http://dummy/cover.png", 0, "http://dummy/cover.png");
    imageInfo.width = 400;
    imageInfo.height = 200;
    imageInfo.isCover = true;
    let dummyImageCollector = {
        includeImageSourceUrl: true,
        coverImageInfo: imageInfo,
        imagesToPackInEpub: function () { return []; }
    };
    let itemSupplier = new EpubItemSupplier(null, [], dummyImageCollector);
    let xhtmlFile = itemSupplier.makeCoverImageXhtmlFile();
    
    // firefox adds /r/n after some elements. Remove so string same for Chrome and Firefox.
    assert.equal(xhtmlFile.replace(/\r|\n/g, ""),
        "<?xml version='1.0' encoding='utf-8'?>" +
        "<!DOCTYPE html PUBLIC \"-//W3C//DTD XHTML 1.1//EN\" \"http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd\">" +
        "<html xmlns=\"http://www.w3.org/1999/xhtml\">" +
            "<head>" +
                "<title></title>" +
                "<link href=\"../Styles/stylesheet.css\" type=\"text/css\" rel=\"stylesheet\" />" +
            "</head>" +
            "<body>" +
               "<div class=\"svg_outer svg_inner\">" +
                    "<svg xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" height=\"99%\" width=\"100%\" version=\"1.1\" preserveAspectRatio=\"xMidYMid meet\" viewBox=\"0 0 400 200\">" +
                        "<image xlink:href=\"../Images/0000_cover.png\" height=\"200\" width=\"400\"/>" +
                        "<desc>http://dummy/cover.png</desc>" + 
                    "</svg>" +
                "</div>" +
            "</body>" +
        "</html>"
    );
});

test("makeCoverImageXhtmlFileNoSourceUrl", function (assert) {
    let imageInfo = new ImageInfo("http://dummy/cover.png", 0, "http://dummy/cover.png");
    imageInfo.width = 400;
    imageInfo.height = 200;
    imageInfo.isCover = true;
    let dummyImageCollector = {
        includeImageSourceUrl: false,
        coverImageInfo: imageInfo,
        imagesToPackInEpub: function () { return []; }
    };
    let itemSupplier = new EpubItemSupplier(null, [], dummyImageCollector);
    let xhtmlFile = itemSupplier.makeCoverImageXhtmlFile();
    
    // firefox adds /r/n after some elements. Remove so string same for Chrome and Firefox.
    assert.equal(xhtmlFile.replace(/\r|\n/g, ""),
        "<?xml version='1.0' encoding='utf-8'?>" +
        "<!DOCTYPE html PUBLIC \"-//W3C//DTD XHTML 1.1//EN\" \"http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd\">" +
        "<html xmlns=\"http://www.w3.org/1999/xhtml\">" +
            "<head>" +
                "<title></title>" +
                "<link href=\"../Styles/stylesheet.css\" type=\"text/css\" rel=\"stylesheet\" />" +
            "</head>" +
            "<body>" +
               "<div class=\"svg_outer svg_inner\">" +
                    "<svg xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" height=\"99%\" width=\"100%\" version=\"1.1\" preserveAspectRatio=\"xMidYMid meet\" viewBox=\"0 0 400 200\">" +
                        "<image xlink:href=\"../Images/0000_cover.png\" height=\"200\" width=\"400\"/>" +
                        "<!--  http://dummy/cover.png  -->" +
                    "</svg>" +
                "</div>" +
            "</body>" +
        "</html>"
    );
});
