
"use strict";

module("WattpadParser");

QUnit.test("findURIsWithRestOfChapterContent", function (assert) {
    let dom = new DOMParser().parseFromString(
        WattpadSample, "text/html");
    let parser = new WattpadParser();
    let out = parser.findURIsWithRestOfChapterContent(dom);
    assert.equal(out.pages, 2);
    assert.equal(out.uriStart, "https://s.wattpad.com/i68391941-256896823-959d99345");
    assert.equal(out.uriEnd, "?Policy=eyJTdGF0ZW&Key-Pair-Id=APKAJ54QS7Z2QYNU76UQ");
    assert.equal(out.refreshToken, "https://api.wattpad.com/v4/parts/256896823/token");
});

let watpaddExtraContent = [
    "<p>I know</p><p>It was</p>",
    "<p><b>please</b></p><p>Thanks</p>"
];

QUnit.test("addExtraContent", function (assert) {
    let dom = new DOMParser().parseFromString(
        WattpadSample, "text/html");
    let parser = new WattpadParser();
    let newDom = parser.addExtraContent(dom, watpaddExtraContent);
    let content = parser.findContent(dom)
    parser.removeUnwantedElementsFromContentElement(content);
    assert.equal(content.textContent.replace(/\s/g, ""), "sidenote:Ella'spovIknowItwaspleaseThanks");
});

let watpaddExtraUris = [
    "https://s.wattpad.com/i-2",
    "https://s.wattpad.com/i-3"
];

HttpClient.simulateFetch = function (url, handler) {
    let dataLookup = new Map();
    for (let i = 0; i < watpaddExtraUris.length; ++i) {
        dataLookup.set(watpaddExtraUris[i], watpaddExtraContent[i]);
    }

    let buffer = new TextEncoder("utf-8").encode(dataLookup.get(url));
    let response = {
        ok: true,
        headers: {
            get: () => "text/html; charset=utf-8"
        },
        arrayBuffer: () => Promise.resolve(buffer)
    }
    return Promise.resolve(response);
}

HttpClient.wrapFetchImpl = function (url, wrapOptions) {
    return HttpClient.simulateFetch(url, HttpClient.makeOptions()).then(function (response) {
        return HttpClient.checkResponseAndGetData(url, wrapOptions, response);
    });
}

QUnit.test("fetchExtraChapterContent", function (assert) {
    let done = assert.async();

    let extraUris = {
        "pages": 3,
        "uriStart": "https://s.wattpad.com/i",
        "uriEnd": ""
    };
    new WattpadParser().fetchExtraChapterContent(extraUris).then(function(actual) {
        assert.deepEqual(actual, watpaddExtraContent);
        done();
    });
});

QUnit.test("buildStoryTextPageUrl apiv2", function (assert) {
    let extraUris = {
        apiStyle: "apiv2",
        textUrlBase: "https://www.wattpad.com/apiv2/?m=storytext&id=1284690197&page="
    };
    assert.equal(
        WattpadParser.buildStoryTextPageUrl(extraUris, 2),
        "https://www.wattpad.com/apiv2/?m=storytext&id=1284690197&page=2"
    );
});

QUnit.test("buildStoryTextPageUrl legacy", function (assert) {
    let extraUris = {
        uriStart: "https://s.wattpad.com/i68391941-256896823-959d99345",
        uriEnd: "?Policy=abc"
    };
    assert.equal(
        WattpadParser.buildStoryTextPageUrl(extraUris, 2),
        "https://s.wattpad.com/i68391941-256896823-959d99345-2?Policy=abc"
    );
});

QUnit.test("normalizeStoryTextPayload joins arrays", function (assert) {
    assert.equal(WattpadParser.normalizeStoryTextPayload(["<p>a</p>", "<p>b</p>"]), "<p>a</p><p>b</p>");
});

QUnit.test("extractIdFromUrl story slug", function (assert) {
    let url = "https://www.wattpad.com/story/408807838-%F0%9D%90%83%F0%9D%90%88%F0%9D%90%95%F0%9D%90%88%F0%9D%90%8D%F0%9D%90%84-%F0%9D%90%83%F0%9D%90%88%F0%9D%90%92%F0%9D%90%92%F0%9D%90%8E%F0%9D%90%8D%F0%9D%90%80%F0%9D%90%8D%F0%9D%90%82%F0%9D%90%84-%E2%9C%A6-%F0%9D%90%93%F0%9D%90%96%F0%9D%90%92%F0%9D%90%93";
    assert.equal(WattpadParser.extractIdFromUrl(url), "408807838");
    assert.ok(WattpadParser.isWattpadStoryUrl(url));
    assert.equal(
        WattpadParser.buildWpdMyDownloadUrl("408807838"),
        "https://wpd.my/download/408807838?om=1&mode=story&format=epub"
    );
});

QUnit.test("isWpdMyStoryNotFoundText detects wpd.my error page", function (assert) {
    let msg = "This story does not exist, or has been deleted. Support is available on the Discord";
    assert.ok(WattpadParser.isWpdMyStoryNotFoundText(msg));
    assert.notOk(WattpadParser.isWpdMyStoryNotFoundText("Chapter 1"));
});

QUnit.test("inspectWpdMyResponse ignores wpd.my error HTML", function (assert) {
    let text = "This story does not exist, or has been deleted. Support is available on the Discord";
    let buffer = new TextEncoder().encode(text).buffer;
    assert.strictEqual(WattpadParser.inspectWpdMyResponse(buffer), null);
});

QUnit.test("getLiveReaderUrl encodes story url", function (assert) {
    let storyUrl = "https://www.wattpad.com/story/408807838-test";
    assert.ok(WattpadParser.getLiveReaderUrl(storyUrl).includes("url=" + encodeURIComponent(storyUrl)));
});

QUnit.test("WattpadDownloader API urls", function (assert) {
    assert.equal(
        WattpadParser.buildStoryApiUrl("408807838"),
        "https://www.wattpad.com/api/v3/stories/408807838?fields=" + WattpadParser.STORY_API_FIELDS
    );
    assert.equal(
        WattpadParser.buildStoryContentZipUrl("408807838"),
        "https://www.wattpad.com/apiv2/?m=storytext&group_id=408807838&output=zip"
    );
    assert.equal(
        WattpadParser.buildPartUrl("https://www.wattpad.com/story/408807838-test", 123),
        "https://www.wattpad.com/story/408807838-test/part/123"
    );
    assert.equal(
        WattpadParser.extractPartIdFromUrl("https://www.wattpad.com/story/408807838-test/part/123-slug"),
        "123"
    );
});

QUnit.test("cleanTree keeps paragraphs and images", function (assert) {
    let body = "<body><p><b>Hello</b></p><p><img src=\"https://img.wattpad.com/a.jpg\" data-original-height=\"100\" data-original-width=\"200\"></p></body>";
    let section = WattpadParser.cleanTree("Chapter 1", 99, body);
    assert.equal(section.querySelector("h2").textContent, "Chapter 1");
    assert.equal(section.querySelectorAll("p").length, 1);
    assert.equal(section.querySelectorAll("img").length, 1);
    assert.equal(section.querySelector("img").getAttribute("src"), "https://img.wattpad.com/a.jpg");
});

QUnit.test("removeDuplicateParagraphs", function (assert) {
    let dom = new DOMParser().parseFromString(
        "<body>" +
        "<p data-p-id=\"ef11\">1</p>" +
        "<p data-p-id=\"ef12\">2</p>" +
        "<p data-p-id=\"ef11\">1</p>" +
        "<p data-p-id=\"ef12\">2</p>" +
        "<p data-p-id=\"ef13\">3</p>" +
        "<p>4</p>" +
        "<p>5</p>" +
        "</body>",
        "text/html");
    let cleanDom = WattpadParser.removeDuplicateParagraphs(dom);
    let actual = cleanDom.body.textContent;
    assert.equal(actual, "12345");
});

let WattpadSample =
`<!DOCTYPE html>
<head prefix="og: http://ogp.me/ns# fb: http://ogp.me/ns/fb#">
    <title>forcefully arranged - surprise &amp; end  - Wattpad</title>
</head>
<body class="js-app-off" dir="ltr">
    <script type='text/javascript' src='//js-sec.indexww.com/ht/htw-wattpad.js' async></script>
    <script type="text/javascript">window.dataLayer=[];</script>
                            <div id="sp256896823-pg1" data-page-number="1" class="page highlighter first-page">
                                <div class="col-xs-10 panel panel-reading" dir="ltr">
<pre><p data-p-id="d41d8cd98f00b204e9800998ecf8427e"><br></p>
                                    <p data-p-id="3cbd12eeb8e3cb0b86d05cc77432c06b">side note :</p>
                                    <p data-p-id="61729b377770dac5aea3ba54953965b2"<u><b>Ella&apos;s pov</b></u></p></pre>
                                </div>
                            </div>
    <script type="text/javascript">
        window.prefetched = {"part.256896823.metadata":{"data":{"id":256896823,"title":"surprise & end ","pages":2,"wordCount":1832,"text_url":{"text":"https://s.wattpad.com/i68391941-256896823-959d99345?Policy=eyJTdGF0ZW&Key-Pair-Id=APKAJ54QS7Z2QYNU76UQ","refresh_token":"https://api.wattpad.com/v4/parts/256896823/token"}}}}
    </script>

</body>
</html>`
