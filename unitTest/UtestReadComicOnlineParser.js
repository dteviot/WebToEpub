
"use strict";

module("ReadComicOnlineParser");

QUnit.test("extractImageUrls", function (assert) {
  let dom = new DOMParser().parseFromString(ReadComicOnlineSamplePage, "text/html");
  let urls = ReadComicOnlineParser.extractImageUrls(dom);
  assert.equal(urls.length, 2);
  assert.equal(urls[0], "https://2.bp.blogspot.com/gWgx9isFdn=s1600");
  assert.equal(urls[1], "https://2.bp.blogspot.com/NzFWtWE1yt=s1600");
});

let ReadComicOnlineSamplePage =
`<!DOCTYPE html>
<html lang="en-US" class="dark-skin">
<head>
<title>The Boys: Dear Becky</title>
<base href="https://readcomiconline.to/Comic/The-Boys-Dear-Becky/Issue-1" />
</head>
<body>
<script type="text/javascript">
function isNumber(n) {
    return !isNaN(parseFloat(n)) && isFinite(n);
}

var lstImages = new Array();

lstImages.push("https://2.bp.blogspot.com/gWgx9isFdn=s1600");

lstImages.push("https://2.bp.blogspot.com/NzFWtWE1yt=s1600");

</script>
<script type="text/javascript" src="/Scripts/kissreader.js"></script>
</body>
</html>
`
