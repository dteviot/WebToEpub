
"use strict";

module("UtestUtil");

test("removeEmptyDivElements", function (assert) {
    let dom = new DOMParser().parseFromString(
        "<html>" +
            "<head><title></title></head>" +
            "<body>" +
                "<div><h1>H1</h1></div>" +
                "<div><div></div></div>" +
                "<div>    \n\n\n</div>" +
            "</body>" +
        "</html>",
        "text/html");
    let content = dom.body.cloneNode(true);
    util.removeEmptyDivElements(content);

    assert.equal(content.innerHTML, "<div><h1>H1</h1></div><div></div>");
});

test("removeScriptableElements", function (assert) {
    let dom = new DOMParser().parseFromString(
        "<html>" +
            "<head><title></title></head>" +
            "<body>" +
                "<div><h1>H1</h1></div>" +
                "<iframe title=\"VisualDNA Analytics\" width=\"0\" height=\"0\" aria-hidden=\"true\" src=\"./Wikia_files/saved_resource.html\" style=\"display: none;\"></iframe>" +
                "<script src=\"./expansion_embed.js\"></script>"+
                "<div>    \n\n\n</div>" +
            "</body>" +
        "</html>",
        "text/html");
    let content = dom.body.cloneNode(true);
    util.removeScriptableElements(content);

    assert.equal(content.innerHTML, "<div><h1>H1</h1></div><div>    \n\n\n</div>");
});
