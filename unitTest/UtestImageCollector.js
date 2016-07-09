
"use strict";

module("UTestImageCollector");

QUnit.test("ImageInfo.ctor", function (assert) {
    let imageInfo = new ImageInfo("http://www.baka-tsuki.org/WebToEpub.jpg", 0, null);
    assert.equal(imageInfo.imagePageUrl, "http://www.baka-tsuki.org/WebToEpub.jpg");
    assert.equal(imageInfo.sourceImageUrl, null);
    assert.equal(imageInfo.getZipHref(), "OEBPS/Images/0000_WebToEpub.jpg");
    assert.equal(imageInfo.getId(), "image0000");
});

QUnit.test("ImageInfo.findImageSuffix", function (assert) {
    let imageInfo = new ImageInfo("WebToEpub.jpg", 0, null);
    assert.equal(imageInfo.findImageSuffix("http://www.baka-tsuki.org/project/index.php?title=File:WebToEpub.jpg"), "jpg");
    assert.equal(imageInfo.findImageSuffix("https://www.baka-tsuki.org/project/thumb.php?f=WebToEpub.gif&width=427"), "gif");
});

QUnit.test("ImageInfo.extractImageFileNameFromUrl", function (assert) {
    let imageInfo = new ImageInfo("WebToEpub.jpg", 0, null);
    assert.equal(imageInfo.extractImageFileNameFromUrl(""), undefined);
    assert.equal(imageInfo.extractImageFileNameFromUrl("https://www.baka-tsuki.org"), undefined);
    assert.equal(imageInfo.extractImageFileNameFromUrl("https://www.baka-tsuki.org/"), undefined);
    assert.equal(imageInfo.extractImageFileNameFromUrl("https://www.baka-tsuki.org/HSDxD_v01_cover.svg"), "HSDxD_v01_cover.svg");
    assert.equal(imageInfo.extractImageFileNameFromUrl("https://www.baka-tsuki.org/HSDxD_v01_cover.svg#hash"), "HSDxD_v01_cover.svg");
    assert.equal(imageInfo.extractImageFileNameFromUrl("https://www.baka-tsuki.org/project/index.php?HSDxD_v01_cover.jpg"), "HSDxD_v01_cover.jpg");
    assert.equal(imageInfo.extractImageFileNameFromUrl("https://www.baka-tsuki.org/project/index.php?title=File:HSDxD_v01_cover.jpg"), "HSDxD_v01_cover.jpg");
    assert.equal(imageInfo.extractImageFileNameFromUrl("https://www.baka-tsuki.org/project/thumb.php?f=HSDxD_v01_cover.gif&width=427"), "HSDxD_v01_cover.gif");
    assert.equal(imageInfo.extractImageFileNameFromUrl("https://www.baka-tsuki.org/project/images/7/76/HSDxD_v01_cover.jpg"), "HSDxD_v01_cover.jpg");
    assert.equal(imageInfo.extractImageFileNameFromUrl("http://sonako.wikia.com/wiki/File:Date4_000c.png"), "Date4_000c.png");
    assert.equal(imageInfo.extractImageFileNameFromUrl("http://vignette2.wikia.nocookie.net/sonako/images/d/db/Date4_000c.png/revision/latest?cb=20140821053052"), "Date4_000c.png");
    assert.equal(imageInfo.extractImageFileNameFromUrl("http://vignette2.wikia.nocookie.net/sonako/images/d/db/Date4_000c.png/revision/latest/scale-to-width-down/332?cb=20140821053052"), "Date4_000c.png");
});

QUnit.test("findImagesUsedInDocument", function (assert) {
    let dom = new DOMParser().parseFromString(
        "<x>" +
           "<ul class=\"gallery mw-gallery-traditional\">" +
               "<li class=\"gallerybox\">" +
                   "<div class=\"thumb\">" +
                       "<a href=\"https://www.baka-tsuki.org/project/index.php?title=File:BTS_vol_01_000a.jpg\" class=\"image\">" +
                            "<img src=\"https://www.baka-tsuki.org/Baka-Tsuki_files/120px-BTS_vol_01_000a.jpg\" >" +
                       "</a>" +
                   "</div>" +
               "</li>" +
               "<li class=\"comment\"></li>" +
           "</ul>" +
           "<div class=\"thumb tright\">" +
                "<a href=\"https://www.baka-tsuki.org/project/index.php?title=File:BTS_vol_01_000b.png\" class=\"image\">" +
                    "<img src=\"https://www.baka-tsuki.org/Baka-Tsuki_files/120px-BTS_vol_01_000b.png\" >" +
                "</a>" +
           "</div>" +
           "<div class=\"thumbinner\">T1</div>" +
           "<div class=\"floatright\">" +
                "<a href=\"https://www.baka-tsuki.org/project/index.php?title=File:BTS_vol_01_000a.jpg\" class=\"image\">" +
                    "<img src=\"https://www.baka-tsuki.org/Baka-Tsuki_files/120px-BTS_vol_01_000a.jpg\" >" +
                "</a>" +
           "</div>" +
           "<a href=\"https://www.baka-tsuki.org/project/index.php?title=File:BTS_vol_01_000c.jpg\" class=\"image\">" +
                "<img src=\"https://www.baka-tsuki.org/Baka-Tsuki_files/120px-BTS_vol_01_000c.jpg\" >" +
            "</a>" +
        "</x>",
        "text/html"
    );

    let imageCollector = new ImageCollector();
    let imagesMap = imageCollector.findImagesUsedInDocument(dom.body);
    assert.equal(imagesMap.size, 3);
    let imageInfo = imagesMap.get("https://www.baka-tsuki.org/project/index.php?title=File:BTS_vol_01_000a.jpg");
    assert.equal(imageInfo.getZipHref(), "OEBPS/Images/0000_BTS_vol_01_000a.jpg");
});
