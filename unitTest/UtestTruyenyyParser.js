
"use strict";

module("TruyenyyParser");

QUnit.test("extractPartialChapterList", function (assert) {
    let dom = new DOMParser().parseFromString(
        TruyenyyToCSamplePage, "text/html");
    let chapters = TruyenyyParser.extractPartialChapterList(dom);
    assert.deepEqual(chapters, [
        {newArc: null, title: "Chương 1: Đá Vận Khí", sourceUrl: "https://truyenyy.com/truyen/sieu-cap-gien-ban-dich/chuong-1.html"},
        {newArc: null, title: "Chương 2: Thế giới thần kỳ", sourceUrl: "https://truyenyy.com/truyen/sieu-cap-gien-ban-dich/chuong-2.html"}
    ]);
});

QUnit.test("getUrlsOfTocPages", function (assert) {
    let dom = new DOMParser().parseFromString(
        TruyenyyToCSamplePage, "text/html");
    let tocUrls = TruyenyyParser.getUrlsOfTocPages(dom);
    assert.equal(tocUrls.length, 14);
    assert.equal(tocUrls[0], "https://truyenyy.com/truyen/sieu-cap-gien-ban-dich/?p=2");
    assert.equal(tocUrls[13], "https://truyenyy.com/truyen/sieu-cap-gien-ban-dich/?p=15");
});

let TruyenyyToCSamplePage =
`<!DOCTYPE html>
<html lang="en-US" class="dark-skin">
<head>
<title>Danh Sách Chương - Trang 1 - Siêu Cấp Gen (Bản Dịch)</title>
<base href="https://truyenyy.com/truyen/sieu-cap-gien-ban-dich/" />
</head>
<body>

<ul class="pagination">
<li class="page-item mt-2">
    <div class="custom-control custom-checkbox">
        <input type="checkbox" class="custom-control-input" id="reverseListCheckbox2">
        <label class="custom-control-label" for="reverseListCheckbox2">Chương mới lên trước</label>
    </div>
</li>
<li class="flex-primary"></li>
<li class="page-item disabled">
    <a class="page-link" href="#" tabindex="-1">
        <span aria-hidden="true"><i class="iconfont icon-left"></i></span>
    </a>
</li>
<li class="page-item active">
    <span class="page-link">1 <span class="sr-only">(hiện tại)</span></span>
</li>
<li class="page-item"><a class="page-link" href="?p=2">2</a></li>
<li class="page-item"><a class="page-link" href="?p=3">3</a></li>
<li class="page-item"><a class="page-link" href="?p=4">4</a></li>
<li class="page-item"><a class="page-link" href="?p=5">5</a></li>
<li class="page-item"><a class="page-link" href="?p=6">6</a></li>
<li class="page-item"><a class="page-link" href="?p=7">7</a></li>
<li class="page-item"><a class="page-link" href="?p=8">8</a></li>
<li class="page-item"><a class="page-link" href="?p=9">9</a></li>
<li class="page-item"><a class="page-link" href="?p=10">10</a></li>
<li class="page-item disabled"><a class="page-link" href="#">...</a></li>
<li class="page-item"><a class="page-link" href="?p=14">14</a></li>
<li class="page-item"><a class="page-link" href="?p=15">15</a></li>
<li class="page-item">
    <a class="page-link" href="?p=2" aria-label="Trang Sau">
        <span aria-hidden="true"><i class="iconfont icon-right"></i></span>
        <span class="sr-only">Trang Sau</span>
    </a>
</li>
</ul>


<table class="table table-dark my-0">
<tr>
<td>
    <a href="/truyen/sieu-cap-gien-ban-dich/chuong-1.html">
        Chương 1
    </a>
</td>
<td><a href="/truyen/sieu-cap-gien-ban-dich/chuong-1.html" class="table-chap-title">Đá Vận Khí</a></td>
</tr>
<tr>
<td>
    <a href="/truyen/sieu-cap-gien-ban-dich/chuong-2.html">
        Chương 2
    </a>
</td>
<td><a href="/truyen/sieu-cap-gien-ban-dich/chuong-2.html" class="table-chap-title">Thế giới thần kỳ</a></td>
</tr>
</table>
</body>
</html>
`
