
"use strict";

module("ImageCollector");

QUnit.test("ImageInfo.ctor", function (assert) {
    let imageInfo = new ImageInfo("http://www.baka-tsuki.org/WebToEpub.jpg", 0, null);
    assert.equal(imageInfo.wrappingUrl, "http://www.baka-tsuki.org/WebToEpub.jpg");
    assert.equal(imageInfo.sourceUrl, null);
    assert.equal(imageInfo.getZipHref(), "OEBPS/Images/0000_WebToEpub.jpg");
    assert.equal(imageInfo.getId(), "image0000");
});

QUnit.test("ImageInfo.findImageSuffix", function (assert) {
    let imageInfo = new ImageInfo("WebToEpub.jpg", 0, null);
    imageInfo.mediaType = "image/bmp";
    assert.equal(imageInfo.findImageSuffix("http://www.baka-tsuki.org/project/index.php?title=File:WebToEpub.jpg"), "jpg");
    assert.equal(imageInfo.findImageSuffix("https://www.baka-tsuki.org/project/thumb.php?f=WebToEpub.gif&width=427"), "gif");
    assert.equal(imageInfo.findImageSuffix("https://baka-tsuki.org/project/index.php?title=The_Unexplored_Summon_Blood_Sign:Volume1"), "bmp");
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
    imageCollector.findImagesUsedInDocument(dom.body);
    assert.equal(imageCollector.imageInfoList.length, 3);
    let imageInfo = imageCollector.imageInfoByUrl("https://www.baka-tsuki.org/project/index.php?title=File:BTS_vol_01_000a.jpg");
    assert.equal(imageInfo.getZipHref(), "OEBPS/Images/0000_BTS_vol_01_000a.jpg");

    // test adding a new cover 
    imageCollector.setCoverImageUrl("http://test.com/dummy.jpg");
    assert.equal(imageCollector.imageInfoList.length, 4);
    imageInfo = imageCollector.imagesToFetch[0];
    assert.equal(imageInfo.isCover, true);
    assert.equal(imageInfo.sourceUrl, "http://test.com/dummy.jpg");
    assert.equal(imageCollector.imagesToFetch.length, 4);

    // test making existing image the cover
    imageCollector.setCoverImageUrl("https://www.baka-tsuki.org/Baka-Tsuki_files/120px-BTS_vol_01_000b.png");
    assert.equal(imageCollector.imagesToFetch.length, 4);
    imageInfo = imageCollector.imageInfoList[1];
    assert.equal(imageInfo.sourceUrl, "https://www.baka-tsuki.org/Baka-Tsuki_files/120px-BTS_vol_01_000b.png");
    assert.equal(imageInfo.isCover, true);
});

QUnit.test("removeDuplicateImages", function (assert) {
    let imageCollector = new ImageCollector();
    // basic setup
    imageCollector.addImageInfo("http://test.com/cover.jpg", "http://test.com/cover.jpg", null, true);
    imageCollector.addImageInfo("http://test.com/bmp1.jpg", "http://test.com/bmp1.jpg", null, false);
    imageCollector.addImageInfo("http://test.com/bmp2.jpg", "http://test.com/bmp2.jpg", null, false);
    imageCollector.addImageInfo("http://test.com/cover.jpg", "http://test.com/cover.jpg", null, false);
    assert.equal(imageCollector.imagesToFetch.length, 3);
    assert.equal(imageCollector.imageInfoList.length, 3);
    assert.equal(imageCollector.imagesToPack.length, 0);
    assert.equal(imageCollector.urlIndex.get("http://test.com/bmp1.jpg"), 1);
    assert.equal(imageCollector.urlIndex.get("http://test.com/cover.jpg"), 0);
    assert.equal(imageCollector.urlIndex.get("http://test.com/bmp2.jpg"), 2);

    // now give both images same bitmap
    let imageInfoList = imageCollector.imageInfoList;
    imageInfoList[0].arraybuffer = new ArrayBuffer(4);
    imageInfoList[1].arraybuffer = new ArrayBuffer(4);
    imageCollector.addToPackList(imageInfoList[0]);
    imageCollector.addToPackList(imageInfoList[1]);

    // bmp1 URL should now point to index 0.
    assert.equal(imageCollector.urlIndex.get("http://test.com/bmp1.jpg"), 0);
    assert.equal(imageCollector.urlIndex.get("http://test.com/cover.jpg"), 0);
    assert.equal(imageCollector.urlIndex.get("http://test.com/bmp2.jpg"), 2);
    let imagesToPack = imageCollector.imagesToPack;
    assert.equal(imagesToPack.length, 1);
    assert.equal(imagesToPack[0].sourceUrl, "http://test.com/cover.jpg");

    // pack 3rd image
    imageInfoList[2].arraybuffer = new ArrayBuffer(8);
    let byteArray = new Uint8Array(imageInfoList[2].arraybuffer);
    for (let i = 0; i < byteArray.length; ++i) {
        byteArray[i] = i;
    }
    imageCollector.addToPackList(imageInfoList[2]);
    assert.equal(imagesToPack.length, 2);
    assert.equal(imagesToPack[1].sourceUrl, "http://test.com/bmp2.jpg");
    assert.equal(imageCollector.urlIndex.get("http://test.com/bmp2.jpg"), 2);
});

QUnit.test("removeSizeParamsFromSearch", function (assert) {
    let testRemoveSizeParams = function(s) {
        let searchParams = new URLSearchParams(s);
        ImageCollector.removeSizeParamsFromSearch(searchParams)
        return searchParams.toString();
    };

    assert.equal(testRemoveSizeParams(""), "");
    assert.equal(testRemoveSizeParams("a=1"), "a=1");
    assert.equal(testRemoveSizeParams("a=1&z=2"), "a=1&z=2");
    assert.equal(testRemoveSizeParams("h=1"), "");
    assert.equal(testRemoveSizeParams("a=1&h=1"), "a=1");
    assert.equal(testRemoveSizeParams("h=1&z=2"), "z=2");
    assert.equal(testRemoveSizeParams("a=1&h=1&z=2"), "a=1&z=2");
    assert.equal(testRemoveSizeParams("a=1&h=1&w=2&z=2"), "a=1&z=2");
    assert.equal(testRemoveSizeParams("a=1&h=1&z=2&w=2"), "a=1&z=2");
    assert.equal(testRemoveSizeParams("w=2&a=1&h=1&z=2"), "a=1&z=2");
    assert.equal(testRemoveSizeParams("w=2&a=1&h=1&z=2&resize=615%2C907"), "a=1&z=2");
    assert.equal(testRemoveSizeParams("resize=615%2C907&w=2&a=1&h=1&z=2"), "a=1&z=2");
});

QUnit.test("modifySeachParams", function (assert) {
    let url = new URL("http://unlimitednovelfailures.com/uploads/img004b.jpg?h=20");
    let search = url.searchParams;
    search.delete("h");
    assert.equal(url.toString(), "http://unlimitednovelfailures.com/uploads/img004b.jpg");
});

QUnit.test("removeSizeParamsFromWordPressQuery", function (assert) {
    let out = ImageCollector.removeSizeParamsFromWordPressQuery("http://unlimitednovelfailures.mangamatters.com/wp-content/uploads/2015/05/img004b.jpg?h=20");
    assert.equal(out, "http://unlimitednovelfailures.mangamatters.com/wp-content/uploads/2015/05/img004b.jpg?h=20");

    out = ImageCollector.removeSizeParamsFromWordPressQuery("https://bibliathetranslation.files.wordpress.com/2015/12/81welmj3wxl-_sl1500_.jpg?w=500&h=715");
    assert.equal(out, "https://bibliathetranslation.files.wordpress.com/2015/12/81welmj3wxl-_sl1500_.jpg");

    out = ImageCollector.removeSizeParamsFromWordPressQuery("https://bibliathetranslation.files.wordpress.com/2016/01/00001.jpg");
    assert.equal(out, "https://bibliathetranslation.files.wordpress.com/2016/01/00001.jpg");

    out = ImageCollector.removeSizeParamsFromWordPressQuery("https://bibliathetranslation.files.wordpress.com/2015/12/81welmj3wxl-_sl1500_.jpg?a=1&w=500&h=715&z=5");
    assert.equal(out, "https://bibliathetranslation.files.wordpress.com/2015/12/81welmj3wxl-_sl1500_.jpg?a=1&z=5");

    out = ImageCollector.removeSizeParamsFromWordPressQuery("https://i2.wp.com/shintranslations.com/wp-content/uploads/2015/07/blushing-tiera.png?resize=615 907&ssl=1");
    assert.equal(out, "https://i2.wp.com/shintranslations.com/wp-content/uploads/2015/07/blushing-tiera.png?ssl=1");

    out = ImageCollector.removeSizeParamsFromWordPressQuery("https://i2.wp.com/shintranslations.com/wp-content/uploads/2015/07/blushing-tiera.png?resize=615%2C907&ssl=1");
    assert.equal(out, "https://i2.wp.com/shintranslations.com/wp-content/uploads/2015/07/blushing-tiera.png?ssl=1");
    
    out = ImageCollector.removeSizeParamsFromWordPressQuery("https://i2.wp2.com/shintranslations.com/wp-content/uploads/2015/07/blushing-tiera.png?resize=615%2C907&ssl=1");
    assert.equal(out, "https://i2.wp2.com/shintranslations.com/wp-content/uploads/2015/07/blushing-tiera.png?resize=615%2C907&ssl=1");
});

QUnit.test("findImageWrappingElement", function (assert) {
    let dom = TestUtils.makeDomWithBody(
        "<div>" +
            // image with no wrapper
            "<img id=\"i001\" src=\"https://www.baka-tsuki.org/img001.jpg\" >" +

            // image with just <a> wrapper
            "<a id=\"a002\" href=\"https://www.baka-tsuki.org/project/index.php?title=File:BTS_vol_01_000a.jpg\" class=\"image\">" +
                "<img id=\"i002\" src=\"https://www.baka-tsuki.org/img002.jpg\" >" +
            "</a>" +

            // image with just thumb <div> wrapper
            "<div id=\"a003\" class=\"thumb\">" +
                "<a href=\"https://www.baka-tsuki.org/project/index.php?title=File:BTS_vol_01_000a.jpg\" class=\"image\">" +
                    "<img id=\"i003\" src=\"https://www.baka-tsuki.org/img003.jpg\" >" +
                "</a>" +
            "</div>" +

            // image with <span> before <a>
            "<a id=\"a004\" href=\"https://www.baka-tsuki.org/project/index.php?title=File:BTS_vol_01_000a.jpg\" class=\"image\">" +
                "<span>" +
                "<img id=\"i004\" src=\"https://www.baka-tsuki.org/img004.jpg\" >" +
                "</span>" +
            "</a>" +
        "</div>"
    );

    let imageCollector = new ImageCollector();
    let wrapper = imageCollector.findImageWrappingElement(dom.getElementById("i001"));
    assert.equal(wrapper.id, "i001");

    wrapper = imageCollector.findImageWrappingElement(dom.getElementById("i002"));
    assert.equal(wrapper.id, "a002");
    
    wrapper = imageCollector.findImageWrappingElement(dom.getElementById("i003"));
    assert.equal(wrapper.id, "a003");

    wrapper = imageCollector.findImageWrappingElement(dom.getElementById("i004"));
    assert.equal(wrapper.id, "a004");
});

QUnit.test("replaceHyperlinksToImagesWithImages", function (assert) {
    let done = assert.async(); 
    let dom = TestUtils.makeDomWithBody(
        "<a href=\"http://dummy.com/K4CZyyP.png\">Insert image</a>" +
        "<a href=\"http://imgur.com/K4CZyyP.jpg\">Insert image</a>" +
        "<a href=\"http://i.imgur.com/K4CZyyP.jpg\">Insert image</a>" +
        "<a href=\"http://i.imgur.com/K4CZyyP.jpg\">"+
            "Insert image<img src=\"http://i.imgur.com/K4CZyyP.jpg\">"+
        "</a>" +
        "<a href=\"http://i.imgur.com/help.html\"></a>"
    );

    ImageCollector.replaceHyperlinksToImagesWithImages(dom.body).then(function () {
        assert.equal(dom.body.innerHTML, 
            "<img src=\"http://dummy.com/K4CZyyP.png\">" +
            "<img src=\"http://imgur.com/K4CZyyP.jpg\">" +
            "<img src=\"http://i.imgur.com/K4CZyyP.jpg\">" +
            "<a href=\"http://i.imgur.com/K4CZyyP.jpg\">"+
                "Insert image<img src=\"http://i.imgur.com/K4CZyyP.jpg\">"+
            "</a>" +
            "<a href=\"http://i.imgur.com/help.html\"></a>"
        );
        done();
    });
});

QUnit.test("dontReplaceNonImageLinksWithImages", function (assert) {
    let done = assert.async(); 
    let dom = TestUtils.makeDomWithBody(
        "<a href=\"http://imgur.com/K4CZyyP.html\">Insert image</a>" +
        "<a class=\"sd-link-color\"></a>"
    );
    ImageCollector.replaceHyperlinksToImagesWithImages(dom.body).then(function () {
        assert.equal(dom.body.innerHTML, 
            "<a href=\"http://imgur.com/K4CZyyP.html\">Insert image</a>" +
            "<a class=\"sd-link-color\"></a>"
        );
        done();
    });
});

QUnit.test("getExtensionFromUrlFilename", function (assert) {
    let hyperlink = document.createElement("a");
    let actual = ImageCollector.getExtensionFromUrlFilename(hyperlink);
    assert.equal(actual, "");

    hyperlink.href = "http://dummy.com/K4CZyyP.jpg";
    actual = ImageCollector.getExtensionFromUrlFilename(hyperlink);
    assert.equal(actual, "jpg");
    
    hyperlink.href = "http://dummy.com/folder";
    actual = ImageCollector.getExtensionFromUrlFilename(hyperlink);
    assert.equal(actual, "");
});

QUnit.test("urlHasFragment", function (assert) {
    assert.ok(ImageCollector.urlHasFragment("http://dummy.com/uploads/img004b.jpg?h=20#content"));
    assert.notOk(ImageCollector.urlHasFragment("http://dummy.com/uploads/img004b.jpg?h=20"));
});

QUnit.test("findHighestResInSrcset", function (assert) {
    let srcset = "\"https://i0.wp.com/graverobbertl.site/wp-content/uploads/2019/08/d9s1e0ybizb43otviytn8jqbjw2t_15g0_1f3_1z4_che9.jpg?resize=736%2C1024&amp;ssl=1 736w, " + 
    "https://i0.wp.com/graverobbertl.site/wp-content/uploads/2019/08/d9s1e0ybizb43otviytn8jqbjw2t_15g0_1f3_1z4_che9.jpg?resize=216%2C300&amp;ssl=1 216w, "+
    "https://i0.wp.com/graverobbertl.site/wp-content/uploads/2019/08/d9s1e0ybizb43otviytn8jqbjw2t_15g0_1f3_1z4_che9.jpg?w=1839&amp;ssl=1 1839w,\""+
    "https://i0.wp.com/graverobbertl.site/wp-content/uploads/2019/08/d9s1e0ybizb43otviytn8jqbjw2t_15g0_1f3_1z4_che9.jpg?resize=768%2C1069&amp;ssl=1 768w, "+
    "https://i0.wp.com/graverobbertl.site/wp-content/uploads/2019/08/d9s1e0ybizb43otviytn8jqbjw2t_15g0_1f3_1z4_che9.jpg?resize=300%2C418&amp;ssl=1 300w, "+
    "https://i0.wp.com/graverobbertl.site/wp-content/uploads/2019/08/d9s1e0ybizb43otviytn8jqbjw2t_15g0_1f3_1z4_che9.jpg?resize=850%2C1183&amp;ssl=1 850w";

    let actual = new ImageCollector().findHighestResInSrcset(srcset);
    assert.equal(actual, "https://i0.wp.com/graverobbertl.site/wp-content/uploads/2019/08/d9s1e0ybizb43otviytn8jqbjw2t_15g0_1f3_1z4_che9.jpg?w=1839&amp;ssl=1");
});

QUnit.test("findHighestResImage", function (assert) {
    let dom = new DOMParser().parseFromString(
        "<img loading=\"lazy\" width=\"736\" height=\"1024\" "+
        "src=\"https://i0.wp.com/graverobbertl.site/wp-content/uploads/2019/08/d9s1e0ybizb43otviytn8jqbjw2t_15g0_1f3_1z4_che9.jpg?resize=736%2C1024&#038;ssl=1\" "+
        "alt class=\"wp-image-452 jetpack-lazy-image\" data-recalc-dims=\"1\" " + 
        "srcset=\"https://i0.wp.com/graverobbertl.site/wp-content/uploads/2019/08/d9s1e0ybizb43otviytn8jqbjw2t_15g0_1f3_1z4_che9.jpg?resize=736%2C1024&amp;ssl=1 736w, https://i0.wp.com/graverobbertl.site/wp-content/uploads/2019/08/d9s1e0ybizb43otviytn8jqbjw2t_15g0_1f3_1z4_che9.jpg?resize=216%2C300&amp;ssl=1 216w, https://i0.wp.com/graverobbertl.site/wp-content/uploads/2019/08/d9s1e0ybizb43otviytn8jqbjw2t_15g0_1f3_1z4_che9.jpg?resize=768%2C1069&amp;ssl=1 768w, https://i0.wp.com/graverobbertl.site/wp-content/uploads/2019/08/d9s1e0ybizb43otviytn8jqbjw2t_15g0_1f3_1z4_che9.jpg?resize=300%2C418&amp;ssl=1 300w, https://i0.wp.com/graverobbertl.site/wp-content/uploads/2019/08/d9s1e0ybizb43otviytn8jqbjw2t_15g0_1f3_1z4_che9.jpg?resize=850%2C1183&amp;ssl=1 850w, https://i0.wp.com/graverobbertl.site/wp-content/uploads/2019/08/d9s1e0ybizb43otviytn8jqbjw2t_15g0_1f3_1z4_che9.jpg?w=1839&amp;ssl=1 1839w\" "+
        "data-lazy-sizes=\"(max-width: 736px) 100vw, 736px\" data-lazy-src=\"https://i0.wp.com/graverobbertl.site/wp-content/uploads/2019/08/d9s1e0ybizb43otviytn8jqbjw2t_15g0_1f3_1z4_che9.jpg?resize=736%2C1024&amp;is-pending-load=1#038;ssl=1\" >",
        "text/html"
    );

    let img = dom.querySelector("img");
    let actual = new ImageCollector().findHighestResImage(img);
    assert.equal(actual, "https://i0.wp.com/graverobbertl.site/wp-content/uploads/2019/08/d9s1e0ybizb43otviytn8jqbjw2t_15g0_1f3_1z4_che9.jpg?w=1839&ssl=1");
});
