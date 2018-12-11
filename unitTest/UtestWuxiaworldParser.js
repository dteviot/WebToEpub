
"use strict";

module("WuxiaworldParser");

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

QUnit.test("getChapterArc", function (assert) {
    let dom = new DOMParser().parseFromString(WuxiaworldiSamplePage2, "text/html");
    let links = [...dom.querySelectorAll("li a")];
    let actual = WuxiaworldParser.getChapterArc(links[0]);
    assert.equal(actual, "The name is Resident Evil");
    actual = WuxiaworldParser.getChapterArc(links[2]);
    assert.equal(actual, "Alien Massacre");
});

QUnit.test("getChapterUrls-withArcTitles", function (assert) {
    let done = assert.async(); 
    let dom = new DOMParser().parseFromString(WuxiaworldiSamplePage2, "text/html");
    new WuxiaworldParser().getChapterUrls(dom).then(function(actual) {
        assert.deepEqual(actual, 
            [
                {title: "Vol 1 Chapter 1-1", sourceUrl: "https://www.wuxiaworld.com/novel/terror-infinity/ti-vol-1-chapter-1-1", newArc: "The name is Resident Evil"},
                {title: "Vol 1 Chapter 1-2", sourceUrl: "https://www.wuxiaworld.com/novel/terror-infinity/ti-vol-1-chapter-1-2", newArc: null},
                {title: "Vol 2 Chapter 1-1", sourceUrl: "https://www.wuxiaworld.com/novel/terror-infinity/ti-vol-2-chapter-1-1", newArc: "Alien Massacre"}
            ]
        );
        done();
    });
});

QUnit.test("removeArcsWhenOnlyOne-singleArc", function (assert) {
    let chapters = [{newArc: "V1"}, {newArc: null}, {newArc: null}];
    WuxiaworldParser.removeArcsWhenOnlyOne(chapters);
    assert.equal(chapters[0].newArc, null);
});

QUnit.test("removeArcsWhenOnlyOne-multipleArcs", function (assert) {
    let chapters = [{newArc: "V1"}, {newArc: null}, {newArc: "V2"}];
    WuxiaworldParser.removeArcsWhenOnlyOne(chapters);
    assert.deepEqual(chapters, [{newArc: "V1"}, {newArc: null}, {newArc: "V2"}]);
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

let WuxiaworldiSamplePage2 =
`<!DOCTYPE html>
<html lang="en">
<head>
    <title>Terror Infinity - WuxiaWorld</title>
    <base href="https://www.wuxiaworld.com/novel/terror-infinity" />
</head>
<body>
    <div class="content space-0">
        <div class="panel-group" id="accordion" role="tablist" aria-multiselectable="true">
            <div class="panel panel-default">
                <div class="panel-heading" role="tab" id="heading-0">
                    <h4 class="panel-title">
                        <span class="book">1</span>
                        <span class="title">
                            <a class="collapsed" role="button" data-toggle="collapse" href="#collapse-0" aria-expanded="false" aria-controls="collapse-0">
                                The name is Resident Evil
                            </a>
                        </span>
                        <a class="collapsed pull-right arrow" role="button" data-toggle="collapse" href="#collapse-0" aria-expanded="false" aria-controls="collapse-0"></a>
                    </h4>
                </div>
                <div id="collapse-0" class="panel-collapse collapse in" role="tabpanel" aria-labelledby="heading-0">
                    <div class="panel-body">
                        <div class="row">
                            <div class="col-sm-6">
                                <ul class="list-unstyled list-chapters">
                                    <li class="chapter-item">
                                        <a href="/novel/terror-infinity/ti-vol-1-chapter-1-1">
                                            <span>Vol 1 Chapter 1-1</span>
                                        </a>
                                    </li>
                                    <li class="chapter-item">
                                        <a href="/novel/terror-infinity/ti-vol-1-chapter-1-2">
                                            <span>Vol 1 Chapter 1-2</span>
                                        </a>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="panel panel-default">
                <div class="panel-heading" role="tab" id="heading-1">
                    <h4 class="panel-title">
                        <span class="book">2</span>
                        <span class="title">
                            <a class="collapsed" role="button" data-toggle="collapse" href="#collapse-1" aria-expanded="false" aria-controls="collapse-1">
                                Alien Massacre
                            </a>
                        </span>
                        <a class="collapsed pull-right arrow" role="button" data-toggle="collapse" href="#collapse-1" aria-expanded="false" aria-controls="collapse-1"></a>
                    </h4>
                </div>
                <div id="collapse-1" class="panel-collapse collapse " role="tabpanel" aria-labelledby="heading-1">
                    <div class="panel-body">
                        <div class="row">
                            <div class="col-sm-6">
                                <ul class="list-unstyled list-chapters">
                                    <li class="chapter-item">
                                        <a href="/novel/terror-infinity/ti-vol-2-chapter-1-1">
                                            <span>Vol 2 Chapter 1-1</span>
                                        </a>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</body>
</html>`
