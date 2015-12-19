
"use strict";

module("BakaTsuki");

/// Load the sample file
/// As file operation is async, load the sample file into dom, and call doneCallback when file loaded
function syncLoadBakaTsukiSampleDoc() {
    let that = this;
    let xhr = new XMLHttpRequest();
    xhr.open("GET", "../testdata/Baka-Tsuki.html", false);
    xhr.send(null);
    let dom = new DOMParser().parseFromString(xhr.responseText, "text/html");
    new HttpClient().setBaseTag("http://www.baka-tsuki.org/project/index.php?title=Web_to_Epub", dom);
    return dom;
}

QUnit.test("canParse", function (assert) {
    let parser = new BakaTsukiParser();
    ok(parser.canParse("http://www.baka-tsuki.org/project/index.php?title=Web_to_Epub"));
    notOk(parser.canParse("http://archiveofourown.org/works/123456/chapters/9876543"));
});

QUnit.test("getEpubMetaInfo", function (assert) {
    let parser = new BakaTsukiParser();
    let metaInfo = parser.getEpubMetaInfo(syncLoadBakaTsukiSampleDoc());
    equal(metaInfo.title, "Web to Epub");
    equal(metaInfo.author, "<Unknown>");
    equal(metaInfo.language, "en");
});

QUnit.test("getChapterUrls", function (assert) {
    let parser = new BakaTsukiParser();
    let chapterUrls = parser.getChapterUrls(syncLoadBakaTsukiSampleDoc());
    assert.equal(chapterUrls.length, 1);
    assert.equal(chapterUrls[0].sourceUrl, "http://www.baka-tsuki.org/project/index.php?title=Web_to_Epub");
    assert.equal(chapterUrls[0].title, "Web to Epub");
});

QUnit.test("findContent", function (assert) {
    let parser = new BakaTsukiParser();
    let content = parser.findContent(syncLoadBakaTsukiSampleDoc());
    equal(content.childNodes.length, 21);
    equal(content.childNodes[3].innerText, "Novel Illustrations[edit]");
});

QUnit.test("stripUnwantedElementsFromContentElement", function (assert) {
    let parser = new BakaTsukiParser();
    let dom = new DOMParser().parseFromString("<x><h1>T1</h1><script>\"use strict\"</script><h2>T1.1</h2></x>", "text/html");
    let element = dom.body;
    parser.stripUnwantedElementsFromContentElement(element);
    assert.equal(dom.body.innerHTML, "<x><h1>T1</h1><h2>T1.1</h2></x>");
});
