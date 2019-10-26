
"use strict";

module("ShmtranslationsParser");

QUnit.test("findContent", function (assert) {
    let dom = new DOMParser().parseFromString(
        ShmtranslationsSampleChapter228, "text/html");
    let parser = new ShmtranslationsParser();
    let content = parser.findContent(dom);
    assert.equal(content.textContent.trim(), "Capitation tax, land tax, and port tax.");
});

let ShmtranslationsSampleChapter228 =
`<!DOCTYPE html>
<html lang="en-US">
<head>
    <title>Chapter 228 – Tax and Trouble &#8211; SHMTranslations</title>
    <base href="https://shmtranslations.com/2019/10/22/chapter-228-tax-and-trouble/" />
</head>

<body>
    <article>
        <footer>
            <a href="https://shmtranslations.com/category/isekai-nonbiri-nouka/"><li class="cat mr-2 mb-4"> Isekai Nonbiri Nouka</li></a>
        </footer>
        <p><span style="color: #ffffff;">Please show your support to the translator by reading at SHMTranslations dot com</span></p>
        <p><span style="color: #ffffff;">Read at SHMTranslations(dot)com</span></p>
        <p>Capitation tax, land tax, and port tax.</p>
        <div class="awac-wrapper">Loading</div>
    </article>
</body>
</html>`
