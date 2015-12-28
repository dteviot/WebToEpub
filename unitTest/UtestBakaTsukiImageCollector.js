
"use strict";

module("UTestBakaTsukiImageCollector");

QUnit.test("BakaTsukiImageInfo.findImageType", function (assert) {
    let imageInfo = new BakaTsukiImageInfo("WebToEpub.jpg", 0, null);
    assert.equal(imageInfo.imagePageUrl, "WebToEpub.jpg");
    assert.equal(imageInfo.sourceImageUrl, null);
    assert.equal(imageInfo.getZipHref(), "images/image_0000.jpg");
    assert.equal(imageInfo.getId(), "image0000");
    assert.equal(imageInfo.getMediaType(), "image/jpeg");
});

QUnit.test("BakaTsukiImageInfo.findImageType", function (assert) {
    let imageInfo = new BakaTsukiImageInfo("WebToEpub.jpg", 0, null);
    let suffix = imageInfo.findImageType("http://www.baka-tsuki.org/project/index.php?title=File:WebToEpub.jpg");
    assert.equal(suffix, "jpg");
});

QUnit.test("BakaTsukiImageInfo.makeMediaType", function (assert) {
    let imageInfo = new BakaTsukiImageInfo("WebToEpub.jpg", 0, null);
    let suffix = imageInfo.makeMediaType("png");
    assert.equal(suffix, "image/png");
    assert.equal(imageInfo.makeMediaType("jpg"), "image/jpeg");
    assert.equal(imageInfo.makeMediaType("jpEg"), "image/jpeg");
});

QUnit.test("findImagesUsedInDocument", function (assert) {
    let dom = new DOMParser().parseFromString(
        "<x>" +
           "<ul class=\"gallery mw-gallery-traditional\">" +
               "<li class=\"gallerybox\">" +
                   "<a href=\"https://www.baka-tsuki.org/project/index.php?title=File:BTS_vol_01_000a.jpg\" class=\"image\">" +
                        "<img src=\"./Baka to Tesuto to Syokanju_Volume1 - Baka-Tsuki_files/120px-BTS_vol_01_000a.jpg\" >" +
                   "</a>" +
               "</li>" +
               "<li class=\"comment\"></li>" +
           "</ul>" +
           "<div class=\"thumb tright\">" +
                "<a href=\"https://www.baka-tsuki.org/project/index.php?title=File:BTS_vol_01_000b.png\" class=\"image\">" +
                    "<img src=\"./Baka to Tesuto to Syokanju_Volume1 - Baka-Tsuki_files/120px-BTS_vol_01_000b.png\" >" +
                "</a>" +
           "</div>" +
           "<div class=\"thumbinner\">T1</div>" +
           "<div class=\"floatright\">" +
                "<a href=\"https://www.baka-tsuki.org/project/index.php?title=File:BTS_vol_01_000a.jpg\" class=\"image\">" +
                    "<img src=\"./Baka to Tesuto to Syokanju_Volume1 - Baka-Tsuki_files/120px-BTS_vol_01_000a.jpg\" >" +
                "</a>" +
           "</div>" +
        "</x>",
        "text/html"
    );

    let imageCollector = new BakaTsukiImageCollector();
    let imagesMap = imageCollector.findImagesUsedInDocument(dom.body);
    assert.equal(imagesMap.size, 2);
    let imageInfo = imagesMap.get("https://www.baka-tsuki.org/project/index.php?title=File:BTS_vol_01_000a.jpg");
    assert.equal(imageInfo.getZipHref(), "images/image_0000.jpg");
});
