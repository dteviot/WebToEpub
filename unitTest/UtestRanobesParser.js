
"use strict";

module("RanobesParser");

QUnit.test("extractTocJson", function (assert) {
    let dom = new DOMParser().parseFromString(RanobesSample, "text/html");
    let json = RanobesParser.extractTocJson(dom);
    assert.equal(json.chapters.length, 2);
    assert.equal(json.pages_count, 9);
});

QUnit.test("extractTocPageUrls", function (assert) {
    let dom = new DOMParser().parseFromString(RanobesSample, "text/html");
    let urls = RanobesParser.extractTocPageUrls(dom, "https://ranobes.net/chapters/1165550/");
    assert.equal(urls.length, 8);
    assert.equal(urls[0], "https://ranobes.net/chapters/1165550/page/2/");
    assert.equal(urls[7], "https://ranobes.net/chapters/1165550/page/9/");
});


let RanobesSample =
`<!DOCTYPE html>
<html lang="en">
<head>
    <title>Divine Path System | Chapters</title>
    <base href="https://ranobes.net/chapters/1165550/" />
</head>

<body>
    <script>window.__DATA__ = {"book_title":"Divine Path System","book_link":"https://ranobes.net/novels/1165550-divine-path-system.html","book_id":1165550,
    "chapters":[{"id":"1619080","title":"Chapter 210: The First Step","date":"2021-11-25 17:54:56","showDate":"28 minutes ago"},
    {"id":"1619079","title":"Chapter 209: An Old Friend","date":"2021-11-25 17:54:55","showDate":"28 minutes ago"}],
    "pages_count":9,"count_all":211,"cstart":1,"limit":25,"search":"","default":[],"searchTimeout":null}</script>
    <script src="/templates/Dark/reader/assets/js/vue/vue.prod.js"></script>
</body>
</html>`
