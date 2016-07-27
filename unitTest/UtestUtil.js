
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

test("prepForConvertToXhtml", function (assert) {
    let dom = new DOMParser().parseFromString(
        "<html>" +
            "<head><title></title></head>" +
            "<body>" +
            "<p>Normal <u id=\"test1\">underline <i>italic</i></u></p>" +
            "<center>X			X</center>"+
            "</body>" +
        "</html>",
        "text/html");
    let content = dom.body.cloneNode(true);
    util.prepForConvertToXhtml(content);

    // Firefox and Chrome put span's id attribute in different positions.
    assert.equal(content.innerHTML.replace(" id=\"test1\"", ""),
        "<p>Normal <span style=\"text-decoration: underline;\">underline <i>italic</i></span></p>" +
        "<p style=\"text-align: center;\">X			X</p>"
    );
    let span = util.getElement(content, "span");
    assert.equal(span.id, "test1");
});

test("removeUnneededIds", function (assert) {
    let dom = new DOMParser().parseFromString(
        "<html>" +
            "<head><title></title></head>" +
            "<body>" +
            "<h2><span id=\"Life.0\">Life.0</span></h2>" +
            "<sup id=\"cite_ref-1\" class=\"reference\">"+
                "<a href=\"https://www.baka-tsuki.org/project/index.php?title=High_School_DxD:Volume_1#cite_note-1\">[1]</a>" +
            "</sup>" +
            "<sup id=\"cite_ref-2\" class=\"reference\">" +
                "<a href=\"https://www.baka-tsuki.org/project/index.php?title=High_School_DxD:Volume_1#cite_note-2\">[1]</a>" +
            "</sup>" +
            "<ol>" +
            "<li id=\"cite_note-1\">" +
                "<a href=\"https://www.baka-tsuki.org/project/index.php?title=test:Volume_1#cite_ref-1\"></a>" +
            "</li>"+
            "<li id=\"cite_note-3\">" +
                "<a href=\"https://www.baka-tsuki.org/project/index.php?title=test:Volume_1#cite_ref-3\"></a>" +
            "</li>" +
            "</ol>" +
            "</body>" +
        "</html>",
        "text/html");
    let content = dom.body.cloneNode(true);
    util.removeUnneededIds(content);

    assert.equal(content.innerHTML,
        "<h2><span>Life.0</span></h2>" +
        "<sup id=\"cite_ref-1\" class=\"reference\">"+
            "<a href=\"https://www.baka-tsuki.org/project/index.php?title=High_School_DxD:Volume_1#cite_note-1\">[1]</a>" +
        "</sup>" +
        "<sup class=\"reference\">" +
            "<a href=\"https://www.baka-tsuki.org/project/index.php?title=High_School_DxD:Volume_1#cite_note-2\">[1]</a>" +
        "</sup>" +
        "<ol>" +
        "<li id=\"cite_note-1\">" +
            "<a href=\"https://www.baka-tsuki.org/project/index.php?title=test:Volume_1#cite_ref-1\"></a>" +
        "</li>"+
        "<li>" +
            "<a href=\"https://www.baka-tsuki.org/project/index.php?title=test:Volume_1#cite_ref-3\"></a>" +
        "</li>" +
        "</ol>"
    );
});

