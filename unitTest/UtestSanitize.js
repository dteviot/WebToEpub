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
        "<p>Hello</p><span id=\"second\"> world<span>" +
        "</dummy>" ,
        "text/html"
    );
    let sanitizer = new Sanitize();
    let actual = sanitizer.clean(dom.querySelector("#first"));
    assert.equal(actual.outerHTML, "<div id=\"first\" class=\"\"><p>Hello</p><span id=\"second\"> world</span></div>");
});

