
"use strict";

module("BlogspotParser");

QUnit.test("convertToUrlOfOriginalSizeImage_blogspot", function (assert) {
    let ic = new BlogspotParserImageCollector();
    let url = "https://4.bp.blogspot.com/-TGXsOjoQQpQ/XGDse2CvCeI/AAAAAAAACmk/lfAGhIRbSRoTlGXlUq7oSdo4oLyQv34pgCLcBGAs/s640/ADAM_8_page_001.jpg";
    let actual = ic.convertToUrlOfOriginalSizeImage(url);
    assert.equal(actual, "https://4.bp.blogspot.com/-TGXsOjoQQpQ/XGDse2CvCeI/AAAAAAAACmk/lfAGhIRbSRoTlGXlUq7oSdo4oLyQv34pgCLcBGAs/s0/ADAM_8_page_001.jpg");

    url = "https://4.bp.blogspot.com/-TGXsOjoQQpQ/XGDse2CvCeI/AAAAAAAACmk/lfAGhIRbSRoTlGXlUq7oSdo4oLyQv34pgCLcBGAs/s0/ADAM_8_page_001.jpg";
    actual = ic.convertToUrlOfOriginalSizeImage(url);
    assert.equal(actual, "https://4.bp.blogspot.com/-TGXsOjoQQpQ/XGDse2CvCeI/AAAAAAAACmk/lfAGhIRbSRoTlGXlUq7oSdo4oLyQv34pgCLcBGAs/s0/ADAM_8_page_001.jpg");
});

QUnit.test("convertToUrlOfOriginalSizeImage_google", function (assert) {
    let ic = new BlogspotParserImageCollector();
    let url = "https://lh4.googleusercontent.com/IACIoq8JcJb5rc4qfz0WK34_X19WnCgHfTfIiSq17ocsRGhMppYrlD2YgTtHp8zlnKS7jtv-X9FttHMlafhLQUDJ9mFem6_fucgvecoC4QZnEqtqU9YC9stpKUj_9XehrxNZqCZL";
    let actual = ic.convertToUrlOfOriginalSizeImage(url);
    assert.equal(actual, "https://lh4.googleusercontent.com/IACIoq8JcJb5rc4qfz0WK34_X19WnCgHfTfIiSq17ocsRGhMppYrlD2YgTtHp8zlnKS7jtv-X9FttHMlafhLQUDJ9mFem6_fucgvecoC4QZnEqtqU9YC9stpKUj_9XehrxNZqCZL");
});

