
"use strict";

module("UtestShinsoriParser");

QUnit.test("findTocUrls-noLastPage", function (assert) {
    let dom = new DOMParser().parseFromString(
        ShinsoriToCSampleNoLastPage, "text/html");
    let urls = ShinsoriParser.listUrlsHoldingChapterLists(dom);
    assert.equal(urls.length, 3);
    assert.equal(urls[0], "https://www.shinsori.com/avoid-the-death-route/page/2/");
});

QUnit.test("findTocUrls-LastPage", function (assert) {
    let dom = new DOMParser().parseFromString(
        ShinsoriToCSampleLastPage, "text/html");
    let urls = ShinsoriParser.listUrlsHoldingChapterLists(dom);
    assert.equal(urls.length, 7);
    assert.equal(urls[6], "https://www.shinsori.com/isekai-tensei-harem/page/8/");
});

let ShinsoriToCSampleNoLastPage =
`<!DOCTYPE html>
<html lang="en-US" class="dark-skin">
<head>
    <title>Avoid the Death Route! | Shinsori Translations</title>
    <base href="https://www.shinsori.com/avoid-the-death-route/" />
</head>
<body data-rsssl=1 id="tie-body" class="page-template-default page page-id-213 boxed-layout wrapper-has-shadow block-head-1 magazine1 is-lazyload is-thumb-overlay-disabled is-desktop is-header-layout-2 has-builder">
<div class="pages-nav"><ul class="pages-numbers"> <li class="current"><span class="pages-nav-item">1</span></li><li><a class="pages-nav-item" href="page/2/" title="2">2</a></li><li><a class="pages-nav-item" href="page/3/" title="3">3</a></li><li><a class="pages-nav-item" href="page/4/" title="4">4</a></li><li class="the-next-page"><a href="page/2/">»</a></li></ul></div>
</body>
</html>
`

let ShinsoriToCSampleLastPage =
`<!DOCTYPE html>
<html lang="en-US" class="dark-skin">
<head>
    <title>Avoid the Death Route! | Shinsori Translations</title>
    <base href="https://www.shinsori.com/isekai-tensei-harem/" />
</head>
<body data-rsssl=1 id="tie-body" class="page-template-default page page-id-213 boxed-layout wrapper-has-shadow block-head-1 magazine1 is-lazyload is-thumb-overlay-disabled is-desktop is-header-layout-2 has-builder">
<div class="pages-nav"><ul class="pages-numbers"> 
<li class="current"><span class="pages-nav-item">1</span></li><li><a class="pages-nav-item" href="page/2/" title="2">2</a></li><li><a class="pages-nav-item" href="page/3/" title="3">3</a></li><li><a class="pages-nav-item" href="page/4/" title="4">4</a></li>
<li><a class="pages-nav-item" href="page/5/" title="5">5</a></li><li class="the-next-page"><a href="page/2/">&raquo;</a></li><li class="extend"><span class="pages-nav-item">...</span></li>
    <li class="last-page first-last-pages"><a class="pages-nav-item" href="page/8/" title="Last">Last<span class="fa" aria-hidden="true"></span></a></li></ul>
</div>
</body>
</html>
`
