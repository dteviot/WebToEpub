
"use strict";

module("UtestImgur");


QUnit.test("constructStandardHtmForImgur", function (assert) {
    let imagesList = [
        { hash: "pic1", ext: ".png" },
        { hash: "pic2", ext: ".jpg" }
    ];
    let div = Imgur.constructStandardHtmForImgur(imagesList);
    let images = div.querySelectorAll("img");
    assert.equal(images.length, 2)
    assert.equal(images[0].outerHTML, "<img src=\"http://i.imgur.com/pic1.png\">");
    assert.equal(images[1].outerHTML, "<img src=\"http://i.imgur.com/pic2.jpg\">");
});

QUnit.test("findImagesListPre20170303", function (assert) {
    let dom = TestUtils.makeDomWithBody(
        "<script>" +
        "window.runSlots = {_item: {\"album_images\":{\"count\":21,\"images\":[{\"hash\":\"zNuo7hV\",\"ext\":\".png\"},{\"hash\":\"bi7LaVD\",\"ext\":\".png\"}]}}}" +
        "</script>"
    );
    let images = Imgur.findImagesList(dom);
    assert.deepEqual(images, [{hash:"zNuo7hV", ext:".png"},{hash:"bi7LaVD", ext:".png"}]);
});

QUnit.test("findImagesListPost20170605", function (assert) {
    let dom = TestUtils.makeDomWithBody(
        "<script>" +
        "window.runSlots = {item: {\"album_images\":{\"count\":21,\"images\":[{\"hash\":\"zNuo7hV\",\"ext\":\".png\"},{\"hash\":\"bi7LaVD\",\"ext\":\".png\"}]}}}" +
        "</script>"
    );
    let images = Imgur.findImagesList(dom);
    assert.deepEqual(images, [{hash:"zNuo7hV", ext:".png"},{hash:"bi7LaVD", ext:".png"}]);
});

QUnit.test("isImgurHostName", function (assert) {
    assert.equal(true, Imgur.isImgurHostName("imgur.com"));
    assert.equal(true, Imgur.isImgurHostName("m.imgur.com"));
    assert.equal(false, Imgur.isImgurHostName("rimgur.com"));
});

QUnit.test("fixupImgurGalleryUrl", function (assert) {
    assert.equal("http://imgur.com/a/f7Ezg?grid", Imgur.fixupImgurGalleryUrl("http://imgur.com/a/f7Ezg"));
    assert.equal("http://imgur.com/a/f7Ezg?grid", Imgur.fixupImgurGalleryUrl("http://imgur.com/a/f7Ezg?grid"));
    assert.equal("http://imgur.com/a/DZYuHnc.png", Imgur.fixupImgurGalleryUrl("http://imgur.com/a/DZYuHnc.png"));
});
