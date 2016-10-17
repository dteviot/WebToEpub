
"use strict";

module("UtestEpubItem");

QUnit.test("tagNameToTocDepth", function (assert) {
    assert.equal(EpubItem.prototype.tagNameToTocDepth("H1"), 0);
    assert.equal(EpubItem.prototype.tagNameToTocDepth("H2"), 1);
    assert.equal(EpubItem.prototype.tagNameToTocDepth("H3"), 2);
    assert.equal(EpubItem.prototype.tagNameToTocDepth("H4"), 3);
});


test("fileContentForEpub", function (assert) {
    let dom = new DOMParser().parseFromString(
        "<html>" +
            "<head><title></title></head>" +
            "<body>" +
                "<section>"+
                    "<p>SomeText</p>" +
                    "<br>" +
                    "<p>More</p>" +
                    "<img src=\"http://dummy.com/imgage.png\">" +
                "</section>" +
            "</body>" +
        "</html>",
        "text/html");
    let item = new EpubItem("http://dummy.com/imgage.html");
    item.nodes = [ dom.getElementsByTagName("section")[0] ];
    let xhtml = item.fileContentForEpub();

    // firefox adds /r/n after some elements. Remove so string same for Chrome and Firefox.
    assert.equal(xhtml.replace(/\r|\n/g, ""),
        "<?xml version='1.0' encoding='utf-8'?>"+
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
