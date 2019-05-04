
"use strict";

module("ShinsoriParser");

QUnit.test("findTocUrls-LastPage", function (assert) {
    let dom = new DOMParser().parseFromString(
        ShinsoriToCSampleLastPage, "text/html");
    let urls = ShinsoriParser.getUrlsOfTocPages(dom);
    assert.equal(urls.length, 1);
    assert.equal(urls[0], "https://www.shinsori.com/avoid-the-death-route/?lcp_page0=2#lcp_instance_0");
});

let ShinsoriToCSampleLastPage =
`<!DOCTYPE html>
<html lang="en-US" class="dark-skin">
<head>
    <title>Avoid the Death Route! | Shinsori Translations</title>
    <base href="https://www.shinsori.com/avoid-the-death-route/" />
</head>
<body data-rsssl=1 id="tie-body" class="page-template-default page page-id-213 boxed-layout wrapper-has-shadow block-head-1 magazine1 is-lazyload is-thumb-overlay-disabled is-desktop is-header-layout-2 has-builder">
<ul class="lcp_paginator">
<li class="lcp_currentpage">1</li>
<li><a href="https://www.shinsori.com/avoid-the-death-route/?lcp_page0=2#lcp_instance_0" title="2">2</a></li>
<li><a href="https://www.shinsori.com/avoid-the-death-route/?lcp_page0=2#lcp_instance_0" title="2" class="lcp_nextlink">&gt;&gt;</a></li>
</ul>
</body>
</html>
`
