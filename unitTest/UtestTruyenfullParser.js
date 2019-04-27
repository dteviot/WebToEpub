
"use strict";

module("TruyenfullParser");

QUnit.test("getUrlsOfTocPages", function (assert) {
    let dom = new DOMParser().parseFromString(TruyenfullToCSamplePage, "text/html");
    let urls = TruyenfullParser.getUrlsOfTocPages(dom);
    assert.equal(urls.length, 17);
    assert.equal(urls[0], "https://truyenfull.vn/he-thong-di-lac-tu-tien-ki/trang-2/");
    assert.equal(urls[16], "https://truyenfull.vn/he-thong-di-lac-tu-tien-ki/trang-18/");
});

let TruyenfullToCSamplePage =
`<!DOCTYPE html>
<html lang="en-US" class="dark-skin">
<head>
<title>Truyện Hệ Thống Đi Lạc Tu Tiên Kí</title>
<base href="https://truyenfull.vn/he-thong-di-lac-tu-tien-ki/" />
</head>
<body>
<input id='truyen-id' type='hidden' value='17372'><input id='total-page' type='hidden' value='18'>
</body>
</html>
`
