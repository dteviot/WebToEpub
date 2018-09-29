"use strict";

module("DeviantArtParser");


test("removeUnwantedImages", function (assert) {
    let dom = new DOMParser().parseFromString(DeviantArtSample1, "text/html");
    DeviantArtParser.removeUnwantedImages(dom.body);
    let images = [...dom.querySelectorAll("img")];
    assert.equal(images.length, 1);
    assert.equal(images[0].src, "https://orig00.deviantart.net/3fbe/f/2018/162/0/f/rp_00_by_tinythea-dce3ylm.png");
});



let DeviantArtSample1 =
`<!DOCTYPE html>
<html lang="en-US">
<head>
    <title>Ruined Plans by TinyThea on DeviantArt</title>
    <base href="https://www.deviantart.com/tinythea/art/Ruined-Plans-749293546" />
</head>

<body id="deviantART-v7" class="secure bubble no-apps maturefilter loggedout maturehide w960 deviantart withad">
<div class="dev-view-deviation">
<img collect_rid="1:749293546" src="https://pre00.deviantart.net/4d96/th/pre/f/2018/162/0/f/rp_00_by_tinythea-dce3ylm.png" data-embed-type="deviation" data-embed-format="thumb" data-embed-id="749293546" width="1078"
     height="741"
     alt="Ruined Plans by TinyThea" class="dev-content-normal ">
<img collect_rid="1:749293546" src="https://orig00.deviantart.net/3fbe/f/2018/162/0/f/rp_00_by_tinythea-dce3ylm.png" data-embed-type="deviation" data-embed-format="thumb" data-embed-id="749293546" width="1500"
     height="1031"
     alt="Ruined Plans by TinyThea" class="dev-content-full ">
</div>
</body>
</html>
`
