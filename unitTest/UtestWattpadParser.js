
"use strict";

module("UtestWattpadParser");

QUnit.test("findURIsWithRestOfChapterContent", function (assert) {
    let dom = new DOMParser().parseFromString(
        WattpadSample, "text/html");
    let parser = new WattpadParser();
    let out = parser.findURIsWithRestOfChapterContent(dom);
    assert.equal(out.length, 1);
    assert.equal(out[0], "https://s.wattpad.com/i68391941-256896823-959d99345-2?Policy=eyJTdGF0ZW&Key-Pair-Id=APKAJ54QS7Z2QYNU76UQ")
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
    new WattpadParser().fetchExtraChapterContent(watpaddExtraUris).then(function(actual) {
        assert.deepEqual(actual, watpaddExtraContent);
        done();
    });
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
