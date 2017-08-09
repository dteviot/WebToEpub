
"use strict";

module("HttpClient");

QUnit.test("charsetFromHeaders", function (assert) {
    let content = "text/html; charset=utf-16";
    let header = { get: () => content };

    let frh = new FetchResponseHandler();
    let actual = () => frh.charsetFromHeaders(header);
    assert.equal(actual(), "utf-16");

    content = "text/html; Charset=utf-17";
    assert.equal(actual(), "utf-17");

    content = "text/html; Charset=\"utf-18\"";
    assert.equal(actual(), "utf-18");
    
    content = "text/html;Charset=\"utf-19\";something=";
    assert.equal(actual(), "utf-19");

    content = "text/html; Charset=utf-20 ;something=";
    assert.equal(actual(), "utf-20");

    content = null;
    assert.equal(actual(), "utf-8");
    
    content = "text/html";
    assert.equal(actual(), "utf-8");
});
