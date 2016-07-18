
"use strict";

module("RoyalRoadParser");

QUnit.test("removeTrailingWhiteSpace", function (assert) {
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

    let parser = new RoyalRoadParser();
    let content = dom.getElementById("content");
    parser.removeTrailingWhiteSpace(content);
    assert.equal(content.innerHTML, "Some text ");
});

