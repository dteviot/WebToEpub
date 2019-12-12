"use strict";

module("BabelChainParser");

test("getStateJson", function (assert) {
    let dom = new DOMParser().parseFromString(BabelChainChapterSample, "text/html");
    let actual = BabelChainParser.getStateJson(dom);
    assert.equal(actual.chapterDetailStore.cssUrl, "/content-css?hash=5e60164cffb59e1c13967652156aa007");

    dom = new DOMParser().parseFromString("<body><script></script></body>", "text/html");
    actual = BabelChainParser.getStateJson(dom);
    assert.equal(actual, null);
});

let BabelChainChapterSample =
`<!DOCTYPE html>
<html lang="en">
<head>
    <title>Peerless Divine Emperor - C1 Return of the Great Emperor - Chinese novel - Babelnovel</title>
    <base href="https://babelnovel.com/books/peerless-divine-emperor/chapters/c1" />
</head>

<body>
<script data-cfasync="false" src="/cdn-cgi/scripts/5c5dd728/cloudflare-static/email-decode.min.js"></script>
<script>
window.__STATE__ = "%7B%22chapterDetailStore%22%3A%7B%22cssUrl%22%3A%22%2Fcontent-css%3Fhash%3D5e60164cffb59e1c13967652156aa007%22%7D%7D"
window.__PUSH_KEY__ = "BFDkNGddhFKPHg1y_ntk0VKM8nBiW_onOlxtCRboFT4r2ILV6SgyNGVNzPxrK-PUjkm1dbPqf2apb4_yWpe6Tpw"
</script>
<script type="text/javascript" src="https://d2m2s4gmrt1c0l.cloudfront.net/static/a87af7c5ed4171148aeb.js"></script>
<script async="" src="https://www.google-analytics.com/analytics.js"></script>
</body>
</html>
`
