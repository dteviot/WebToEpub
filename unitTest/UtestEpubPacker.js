
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
            "</metadata>"+
            "<manifest>"+
              "<item href=\"index_split_0000.html\" id=\"html0000\" media-type=\"application/xhtml+xml\"/>" +
              "<item href=\"index_split_0001.html\" id=\"html0001\" media-type=\"application/xhtml+xml\"/>" +
              "<item href=\"toc.ncx\" id=\"ncx\" media-type=\"application/x-dtbncx+xml\"/>" +
            "</manifest>"+
            "<spine toc=\"ncx\">"+
              "<itemref idref=\"html0000\"/>" +
              "<itemref idref=\"html0001\"/>" +
            "</spine>" +
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
            "<navPoint id=\"0001\" playOrder=\"1\">" +
              "<navLabel>" +
                "<text>Title0</text>" +
              "</navLabel>" +
              "<content src=\"index_split_0000.html\"/>" +
            "</navPoint>" +
            "<navPoint id=\"0002\" playOrder=\"2\">" +
              "<navLabel>" +
                "<text>Title1</text>" +
              "</navLabel>" +
              "<content src=\"index_split_0001.html\"/>" +
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

