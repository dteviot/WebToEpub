
"use strict";

module("UtestZirusMusingsParser");

QUnit.test("findImages", function (assert) {
    let dom = new DOMParser().parseFromString(
        ZirusMusingsSample, "text/html");
    let parser = new ZirusMusingsParser();
    let content = parser.findContent(dom);
    parser.imageCollector.findImagesUsedInDocument(content);
    let actual = parser.imageCollector.imageInfoList;
    assert.equal(actual.length, 5);
    assert.equal(actual[0].wrappingUrl, "https://i1.wp.com/zirusmusings.com/wp-content/uploads/2017/12/TL_cover-1.jpg?ssl=1");
    assert.equal(actual[1].wrappingUrl, "https://i0.wp.com/zirusmusings.com/wp-content/uploads/2017/12/TL_Colored_1.jpg?ssl=1");
    assert.equal(actual[2].wrappingUrl, "https://i2.wp.com/zirusmusings.com/wp-content/uploads/2017/12/TL_Colored_2.jpg?ssl=1");
    assert.equal(actual[3].wrappingUrl, "https://i2.wp.com/zirusmusings.com/wp-content/uploads/2018/01/Colored_3.png?ssl=1");
    assert.equal(actual[4].wrappingUrl, "https://i0.wp.com/zirusmusings.com/wp-content/uploads/2017/12/INPAGE1.jpg?resize=841%2C1200&ssl=1");
});

let ZirusMusingsSample =
`<!DOCTYPE html>
<html lang="en-US">
<head>
    <title>The Forsaken Hero &#8212; Illustrations &#8211; Ziru&#039;s Musings</title>
    <base>https://zirusmusings.com/fh-illustrations/</base>
</head>

<body itemtype='https://schema.org/WebPage' itemscope='itemscope' class="page-template-default page page-id-14865 ast-page-builder-template ast-no-sidebar astra-1.3.3 ast-header-custom-item-inside group-blog ast-single-post elementor-page-16310 ast-normal-title-enabled elementor-default">
    <div data-id="7ba99198" class="elementor-element elementor-element-7ba99198 elementor-widget elementor-widget-theme-post-content" id="resizeable-text" data-element_type="theme-post-content.default">
        <div class="elementor-widget-container">
        <p><a href="https://i1.wp.com/zirusmusings.com/wp-content/uploads/2017/12/TL_cover-1.jpg?ssl=1"><img data-attachment-id="14862" data-permalink="https://zirusmusings.com/fh-toc/tl_cover-2/" data-orig-file="https://i1.wp.com/zirusmusings.com/wp-content/uploads/2017/12/TL_cover-1.jpg?fit=840%2C1200&amp;ssl=1" data-orig-size="840,1200" data-comments-opened="1"  data-image-title="FH_Cover" data-image-description data-medium-file="https://i1.wp.com/zirusmusings.com/wp-content/uploads/2017/12/TL_cover-1.jpg?fit=210%2C300&amp;ssl=1" data-large-file="https://i1.wp.com/zirusmusings.com/wp-content/uploads/2017/12/TL_cover-1.jpg?fit=717%2C1024&amp;ssl=1" src="https://zirusmusings.com/wp-content/plugins/jetpack/modules/lazy-images/images/1x1.trans.gif" alt width="840" height="1200" class="aligncenter size-full wp-image-14862" data-recalc-dims="1" data-lazy-src="https://i1.wp.com/zirusmusings.com/wp-content/uploads/2017/12/TL_cover-1.jpg?resize=840%2C1200&#038;ssl=1"></a></p>
        <p><a href="https://i0.wp.com/zirusmusings.com/wp-content/uploads/2017/12/TL_Colored_1.jpg?ssl=1"><img data-attachment-id="14859" data-permalink="https://zirusmusings.com/fh-toc/tl_colored_1/" data-orig-file="https://i0.wp.com/zirusmusings.com/wp-content/uploads/2017/12/TL_Colored_1.jpg?fit=1679%2C1200&amp;ssl=1" data-orig-size="1679,1200" data-comments-opened="1"  data-image-title="TL_Colored_1" data-image-description data-medium-file="https://i0.wp.com/zirusmusings.com/wp-content/uploads/2017/12/TL_Colored_1.jpg?fit=300%2C214&amp;ssl=1" data-large-file="https://i0.wp.com/zirusmusings.com/wp-content/uploads/2017/12/TL_Colored_1.jpg?fit=1024%2C732&amp;ssl=1" src="https://zirusmusings.com/wp-content/plugins/jetpack/modules/lazy-images/images/1x1.trans.gif" alt width="1679" height="1200" class="aligncenter size-full wp-image-14859" data-recalc-dims="1" data-lazy-src="https://i0.wp.com/zirusmusings.com/wp-content/uploads/2017/12/TL_Colored_1.jpg?resize=1679%2C1200&#038;ssl=1" ></a></p>
        <p><a href="https://i2.wp.com/zirusmusings.com/wp-content/uploads/2017/12/TL_Colored_2.jpg?ssl=1"><img data-attachment-id="14860" data-permalink="https://zirusmusings.com/fh-toc/tl_colored_2/" data-orig-file="https://i2.wp.com/zirusmusings.com/wp-content/uploads/2017/12/TL_Colored_2.jpg?fit=1679%2C1200&amp;ssl=1" data-orig-size="1679,1200" data-comments-opened="1" data-image-title="TL_Colored_2" data-image-description data-medium-file="https://i2.wp.com/zirusmusings.com/wp-content/uploads/2017/12/TL_Colored_2.jpg?fit=300%2C214&amp;ssl=1" data-large-file="https://i2.wp.com/zirusmusings.com/wp-content/uploads/2017/12/TL_Colored_2.jpg?fit=1024%2C732&amp;ssl=1" src="https://zirusmusings.com/wp-content/plugins/jetpack/modules/lazy-images/images/1x1.trans.gif" alt width="1679" height="1200" class="aligncenter size-full wp-image-14860" data-recalc-dims="1" data-lazy-src="https://i2.wp.com/zirusmusings.com/wp-content/uploads/2017/12/TL_Colored_2.jpg?resize=1679%2C1200&#038;ssl=1" "></a></p>
        <p><a href="https://i2.wp.com/zirusmusings.com/wp-content/uploads/2018/01/Colored_3.png?ssl=1"><img data-attachment-id="15334" data-permalink="https://zirusmusings.com/fh-ch6/colored_3/" data-orig-file="https://i2.wp.com/zirusmusings.com/wp-content/uploads/2018/01/Colored_3.png?fit=1679%2C1200&amp;ssl=1" data-orig-size="1679,1200" data-comments-opened="1"  data-image-title="Colored_3" data-image-description data-medium-file="https://i2.wp.com/zirusmusings.com/wp-content/uploads/2018/01/Colored_3.png?fit=300%2C214&amp;ssl=1" data-large-file="https://i2.wp.com/zirusmusings.com/wp-content/uploads/2018/01/Colored_3.png?fit=1024%2C732&amp;ssl=1" src="https://zirusmusings.com/wp-content/plugins/jetpack/modules/lazy-images/images/1x1.trans.gif" alt width="1679" height="1200" class="aligncenter size-full wp-image-15334" data-recalc-dims="1" data-lazy-src="https://i2.wp.com/zirusmusings.com/wp-content/uploads/2018/01/Colored_3.png?resize=1679%2C1200&#038;ssl=1" ></a></p>
        <img data-attachment-id="14980" data-permalink="https://zirusmusings.com/fh-ch4/inpage1-2/" data-orig-file="https://i0.wp.com/zirusmusings.com/wp-content/uploads/2017/12/INPAGE1.jpg?fit=841%2C1200&amp;ssl=1" data-orig-size="841,1200" data-comments-opened="1" data-image-title="INPAGE1" data-image-description data-medium-file="https://i0.wp.com/zirusmusings.com/wp-content/uploads/2017/12/INPAGE1.jpg?fit=210%2C300&amp;ssl=1" data-large-file="https://i0.wp.com/zirusmusings.com/wp-content/uploads/2017/12/INPAGE1.jpg?fit=718%2C1024&amp;ssl=1" src="https://zirusmusings.com/wp-content/plugins/jetpack/modules/lazy-images/images/1x1.trans.gif" alt width="841" height="1200" class="aligncenter size-full wp-image-14980" data-recalc-dims="1" data-lazy-src="https://i0.wp.com/zirusmusings.com/wp-content/uploads/2017/12/INPAGE1.jpg?resize=841%2C1200&#038;ssl=1" >
        </div>
    </div>
</body>
</html>`
