
"use strict";

module("UtestEpubItem");

QUnit.test("tagNameToTocDepth", function (assert) {
    assert.equal(EpubItem.prototype.tagNameToTocDepth("H1"), 0);
    assert.equal(EpubItem.prototype.tagNameToTocDepth("H2"), 1);
    assert.equal(EpubItem.prototype.tagNameToTocDepth("H3"), 2);
    assert.equal(EpubItem.prototype.tagNameToTocDepth("H4"), 3);
});


test("fileContentForEpub", function (assert) {
    let dom = TestUtils.makeDomWithBody(
        "<section>"+
            "<p>SomeText</p>" +
            "<br>" +
            "<p>More</p>" +
            "<img src=\"http://dummy.com/imgage.png\">" +
        "</section>"
    );
    let item = new EpubItem("http://dummy.com/imgage.html");
    item.nodes = [ dom.getElementsByTagName("section")[0] ];
    let contentValidator = xml => util.isXhtmlInvalid(xml, EpubPacker.XHTML_MIME_TYPE);
    let xhtml = item.fileContentForEpub(util.createEmptyXhtmlDoc, contentValidator);

    // firefox adds /r/n after some elements. Remove so string same for Chrome and Firefox.
    assert.equal(xhtml.replace(/\r|\n/g, ""),
        "<?xml version=\"1.0\" encoding=\"utf-8\"?>"+
        "<!DOCTYPE html PUBLIC \"-//W3C//DTD XHTML 1.1//EN\" \"http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd\">"+
        "<html xmlns=\"http://www.w3.org/1999/xhtml\">"+
        "<head><title></title><link href=\"../Styles/stylesheet.css\" type=\"text/css\" rel=\"stylesheet\" /></head>"+
        "<body>"+
            "<section>"+
                "<p>SomeText</p>" +
                "<br />" +
                "<p>More</p>" +
                "<img src=\"http://dummy.com/imgage.png\" />" +
            "</section>" +
        "</body>" +
        "</html>"
    );
});

test("hasSvg", function (assert) {
    let image = new ImageInfo("http://bp.org/thepic.jpeg", 0, "http://bp.org/thepic.jpeg");
    assert.notOk(image.hasSvg());

    let item = new EpubItem("http://bp.org/thepic.jpeg");
    assert.notOk(item.hasSvg());
    item.nodes = [];
    item.nodes.push(document.createTextNode("Hello World"));
    item.nodes.push(document.createElement("div"));
    assert.notOk(item.hasSvg());
    let svg = util.createSvgImageElement("http://bp.org/thepic.jpeg", 10, 10, 
        "http://bp.org/thepic.jpeg", true);
    item.nodes.push(svg);
    assert.ok(item.hasSvg());

    item.nodes.pop();
    assert.notOk(item.hasSvg());
    svg = util.createSvgImageElement("http://bp.org/thepic.jpeg", 10, 10, 
        "http://bp.org/thepic.jpeg", false);
    item.nodes[1].appendChild(svg);
    assert.ok(item.hasSvg());
});

test("ChapterEpubItem_chapterInfo_noNewArc", function (assert) {
    let chapter = {
        sourceUrl: "https://dummy.com/nonsuch.html",
        title: "DummyTitle"
    };
    let content = { childNodes: [] };
    let item = new ChapterEpubItem(chapter, content, 1);
    let ci = [...item.chapterInfo()];
    assert.equal(ci.length, 1);
});
