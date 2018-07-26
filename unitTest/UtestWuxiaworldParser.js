
"use strict";

module("UtestWuxiaworldParser");

QUnit.test("elementWithMostParagraphs-emptyReturnsNull", function (assert) {
    let actual = WuxiaworldParser.elementWithMostParagraphs([]);
    assert.equal(actual, null);
});

QUnit.test("elementWithMostParagraphs-singleReturnsSelf", function (assert) {
    let dom = new DOMParser().parseFromString(
        WuxiaworldiSamplePage, "text/html");
    let actual = WuxiaworldParser.elementWithMostParagraphs([dom.head]);
    assert.equal(actual.tagName, "HEAD");
});

QUnit.test("elementWithMostParagraphs-returnBiggest", function (assert) {
    let dom = new DOMParser().parseFromString(
        WuxiaworldiSamplePage, "text/html");
    let candidates = [...dom.querySelectorAll("div.fr-view")];
    let actual = WuxiaworldParser.elementWithMostParagraphs(candidates);
    assert.equal(actual.id, "four");
});

QUnit.test("elementWithMostParagraphs-returnBiggestLast", function (assert) {
    let dom = new DOMParser().parseFromString(
        WuxiaworldiSamplePage, "text/html");
    dom.getElementById("four").remove();
    let candidates = [...dom.querySelectorAll("div.fr-view")];
    let actual = WuxiaworldParser.elementWithMostParagraphs(candidates);
    assert.equal(actual.id, "three");
});

let WuxiaworldiSamplePage =
`<!DOCTYPE html>
<html lang="en-US" class="dark-skin">
<head>
    <title>Avoid the Death Route! | Wuxiaworldi Translations</title>
    <base href="https://www.wuxiaworld.com/novel/i-shall-seal-the-heavens/issth-book-1-chapter-1" />
</head>
<body>
    <div class="section">
        <div class="fr-view panel-body"><p></p><p></p></div>
        <div id="announcement-body-60359" class="fr-view panel-body hidden"><p></p><p></p></div>
        <div id="four" class="fr-view"><p></p><p></p><p></p><p></p></div>
        <div id="three" class="fr-view"><p></p><p></p><p></p></div>
    </div>
</body>
</html>
`
