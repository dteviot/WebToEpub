"use strict";

module("Sanitizer");

test("copyAttributes", function (assert) {
    let dom = new DOMParser().parseFromString("<dummy id='first' class='' dummy='something'></dummy>", "text/html");
    let sanitizer = new Sanitize();
    let actual = sanitizer.cloneTag(dom.querySelector("#first"));
    assert.equal(actual.outerHTML, "<div id=\"first\" class=\"\"></div>");
});

test("cloneChildren", function (assert) {
    let dom = new DOMParser().parseFromString(
        "<dummy id='first' class='' dummy='something'>" +
        "<p>Hello</p><span id=\"second\"> world</span>" +
        "</dummy>" ,
        "text/html"
    );
    let sanitizer = new Sanitize();
    let actual = sanitizer.clean(dom.querySelector("#first"));
    assert.equal(actual.outerHTML, "<div id=\"first\" class=\"\"><p>Hello</p><span id=\"second\"> world</span></div>");
});

test("svg", function (assert) {
    let dom = new DOMParser().parseFromString(
        "<h1>Titls</h1><br />" +
        "<div class=\"svg_outer svg_inner\">" +
        "<svg xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" height=\"99%\" width=\"100%\" version=\"1.1\" preserveAspectRatio=\"xMidYMid meet\" viewBox=\"0 0 541 768\">" +
        "<image xlink:href=\"../Images/0000_gDMIBD3.jpg\" width=\"541\" height=\"768\" />" +
        "<desc>http://i.imgur.com/gDMIBD3.jpg</desc>" +
        "<!-- comment -->" +
        "</svg>" +
        "</div>",
        "text/html"
    );
    let sanitizer = new Sanitize();
    let actual = sanitizer.clean(dom.body);
    assert.equal(actual.outerHTML, dom.body.outerHTML);
});
