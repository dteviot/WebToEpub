
"use strict";

module("DefaultParser");

test("removeUnwantedElementsFromContentElement", function (assert) {
    let dom = new DOMParser().parseFromString(DefaultSample1, "text/html");
    let parser = new DefaultParser();
    let body = parser.findContent(dom);
    assert.equal(body.innerHTML, dom.body.innerHTML);
    parser.removeUnwantedElementsFromContentElement(dom.body);
    assert.equal(dom.body.innerHTML.trim(), "<p>hello </p><p>world</p>");
});

let DefaultSample1 =
`<html>
<head><title></title><base href="https://dummy.com/test.html" /></head>
<body><p>hello </p><o:p></o:p><p>world</p></body>
</html>
`
