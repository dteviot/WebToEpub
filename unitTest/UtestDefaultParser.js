
"use strict";

module("DefaultParser");

test("removeUnwantedElementsFromContentElement", function (assert) {
    let dom = new DOMParser().parseFromString(DefaultSample1, "text/html");
    new DefaultParser().removeUnwantedElementsFromContentElement(dom.body);
    assert.equal(dom.body.innerHTML.trim(), "<p>hello </p><p>world</p>");
});

let DefaultSample1 =
`<html>
<head><title></title></head>
<body><p>hello </p><o:p></o:p><p>world</p></body>
</html>
`
