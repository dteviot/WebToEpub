
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
