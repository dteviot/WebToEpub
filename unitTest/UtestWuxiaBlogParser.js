
"use strict";

module("WuxiaBlogParser");

QUnit.test("getUrlsOfTocPages", function (assert) {
    let dom = new DOMParser().parseFromString(WuxiaBlogToCSamplePage, "text/html");
    let urls = WuxiaBlogParser.getUrlsOfTocPages(dom);
    assert.equal(urls.length, 10);
    assert.equal(urls[0], "https://www.wuxia.blog/novel/I-Have-a-Mansion-in-the-Postapocalyptic-World/2");
    assert.equal(urls[9], "https://www.wuxia.blog/novel/I-Have-a-Mansion-in-the-Postapocalyptic-World/11");
});

QUnit.test("getLastPaginationUrl", function (assert) {
    let dom = new DOMParser().parseFromString(WuxiaBlogToCSamplePage, "text/html");
    let url = WuxiaBlogParser.getLastPaginationUrl(dom);
    assert.equal(url, "https://www.wuxia.blog/novel/I-Have-a-Mansion-in-the-Postapocalyptic-World/11");
});

let WuxiaBlogToCSamplePage =
`<!DOCTYPE html>
<html lang="en-US" class="dark-skin">
<head>
<title>I Have a Mansion in the Post-apocalyptic World</title>
<base href="https://www.wuxia.blog/novel/I-Have-a-Mansion-in-the-Postapocalyptic-World/1" />
</head>
<body>
</body>
<ul class="pagination pull-right">
  <li class="disabled"><a href="https://www.wuxia.blog/novel/I-Have-a-Mansion-in-the-Postapocalyptic-World/1">First</a></li>
  <li class="disabled"><a href="https://www.wuxia.blog/novel/I-Have-a-Mansion-in-the-Postapocalyptic-World/1">«</a></li>
  <li class="active"><a>1</a></li><li><a href="https://www.wuxia.blog/novel/I-Have-a-Mansion-in-the-Postapocalyptic-World/2">2</a></li><li><a href="https://www.wuxia.blog/novel/I-Have-a-Mansion-in-the-Postapocalyptic-World/3">3</a></li><li><a href="https://www.wuxia.blog/novel/I-Have-a-Mansion-in-the-Postapocalyptic-World/4">4</a></li><li><a href="https://www.wuxia.blog/novel/I-Have-a-Mansion-in-the-Postapocalyptic-World/5">5</a></li>
  <li><a href="https://www.wuxia.blog/novel/I-Have-a-Mansion-in-the-Postapocalyptic-World/2">»</a></li>
  <li><a href="https://www.wuxia.blog/novel/I-Have-a-Mansion-in-the-Postapocalyptic-World/11">Last</a></li>
</ul>
</html>
`
