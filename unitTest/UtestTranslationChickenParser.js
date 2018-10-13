"use strict";

module("TranslationChicken");


test("findContent", function (assert) {
    let dom = new DOMParser().parseFromString(TranslationChickenSample1, "text/html");
    let parser = new TranslationChickenParser();
    let actual = parser.findContent(dom);
    assert.equal(actual.children[0].className, "featured-media");

    // check sill OK if called second time
    actual = parser.findContent(dom);
    assert.equal(actual.children[0].className, "featured-media");
});

let TranslationChickenSample1 =
`<!DOCTYPE html>
<head>
    <title>Re:Zero Arc 3 Interlude II [Let’s Eat] (1/2) – START READING HERE – TranslationChicken</title>
    <base href="https://translationchicken.com/2016/09/12/rezero-arc-3-interlude-ii-lets-eat-12/" />
</head>
<body>
<div class="featured-media">
    <img width="1024" height="576" src="https://translationchicken.files.wordpress.com/2016/09/arc3interludeii.jpg?w=1024" class="attachment-baskerville-2-post-image size-baskerville-2-post-image wp-post-image">
</div>
<div class="post-content clear">
    <p style="text-align:center;"><em><strong>**********Note from Translation Chicken**********</strong></em></p>
</div>
</body>
</html>
`
