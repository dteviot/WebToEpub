
"use strict";

module("JpmtlParser");

QUnit.test("removeWatermark", function (assert) {
    let dom = new DOMParser().parseFromString(
        JpmtlSample, "text/html");
    let parser = new JpmtlParser();
    let paragraphs = [...dom.querySelectorAll("p")];
    paragraphs.forEach(parser.removeWatermark);        
    assert.equal(paragraphs[0].textContent, "  But, for example");
    assert.equal(paragraphs[1].textContent, "It gets bigger");
    assert.equal(paragraphs[2].textContent, "mmIt gets bigger");
    assert.equal(paragraphs[3].textContent, "  You can drink.");
});

let JpmtlSample =
`<!DOCTYPE html>
<html lang="en-US" class="dark-skin">
<head>
    <title></title>
</head>
<body">
<div xmlns="http://www.w3.org/1999/xhtml" class="cp-content">
   <p>Tr an s l at e d b y jp mtl .c o m  But, for example</p>
</div>
<div xmlns="http://www.w3.org/1999/xhtml" class="cp-content"> 
    <p>It gets bigger</p>
</div>
<div xmlns="http://www.w3.org/1999/xhtml" class="cp-content"> 
    <p>mmIt gets bigger</p>
</div>
<div xmlns="http://www.w3.org/1999/xhtml" class="cp-content"> 
    <p>Tr ansl a ted b y ｊpmt l .ｃ o ｍ  You can drink.</p>
</div>
</body>
</html>
`
