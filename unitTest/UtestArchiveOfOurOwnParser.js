
"use strict";

module("ArchiveOfOurOwnParser");

/// Load the sample file
/// As file operation is async, load the sample file into dom, and call doneCallback when file loaded
function asyncLoadArchiveOfOurOwnSampleDoc(doneCallback) {
    let xhr = new XMLHttpRequest();
    xhr.open("GET", "../testdata/DredC1.html");
    xhr.responseType = "document";
    xhr.onload = function () {
        let dom = this.responseXML;
        util.setBaseTag("http://archiveofourown.org/works/123456/chapters/9876543", dom);
        doneCallback(dom);
    }
    xhr.send();
}

function syncLoadArchiveOfOurOwnSampleDoc() {
    let xhr = new XMLHttpRequest();
    xhr.open("GET", "../testdata/DredC1.html", false);
    xhr.send(null);
    let dom = new DOMParser().parseFromString(xhr.responseText, "text/html");
    util.setBaseTag("http://archiveofourown.org/works/123456/chapters/9876543", dom);
    return dom;
}

QUnit.test("findContent", function (assert) {
    let parser = new ArchiveOfOurOwnParser();
    let content = parser.findContent(syncLoadArchiveOfOurOwnSampleDoc());
    equal(content.firstElementChild.className, "chapter");
});

QUnit.test("getEpubMetaInfo", function (assert) {
    let parser = new ArchiveOfOurOwnParser();
    let metaInfo = parser.getEpubMetaInfo(syncLoadArchiveOfOurOwnSampleDoc());
    equal(metaInfo.title, "Web *to EPUB: Extension \\for Chrome?");
    equal(metaInfo.author, "David & Teviotdale");
    equal(metaInfo.language, "en-US");
    equal(metaInfo.fileName, "Web_to_E...r_Chrome");
    equal(metaInfo.seriesName, null);
});

QUnit.test("parserFactory", function (assert) {
    let parser = parserFactory.fetch("http://archiveofourown.org/works/123456/chapters/9876543");
    assert.ok(parser instanceof ArchiveOfOurOwnParser );
});

// Regression tests for AO3's "Entire Work" display mode.
// These tests replace chapter fetching locally; they never contact AO3.
function makeArchiveOfOurOwnWorkTestDom(url, hasChapters, hasChapterIndex) {
    let html = "<html><head></head><body>" +
        (hasChapters ? "<ol><li class='chapter'>Chapter 1</li></ol>" : "") +
        (hasChapterIndex ?
            "<ul id='chapter_index'><li><a href='/works/123456/navigate'>Contents</a></li></ul>" : "") +
        "</body></html>";
    let dom = new DOMParser().parseFromString(html, "text/html");
    util.setBaseTag(url, dom);
    return dom;
}

QUnit.test("getChapterUrls: Entire Work selected with URL parameter", async function (assert) {
    let parser = new ArchiveOfOurOwnParser();
    let requestedUrl = null;
    parser.fetchChapterUrls = async function (url) {
        requestedUrl = url;
        return [{sourceUrl: "https://archiveofourown.org/works/123456/chapters/1", title: "Chapter 1"}];
    };
    let dom = makeArchiveOfOurOwnWorkTestDom(
        "https://archiveofourown.org/works/123456?view_full_work=true", true, false);
    let chapters = await parser.getChapterUrls(dom, {});
    assert.strictEqual(requestedUrl, "https://archiveofourown.org/works/123456/navigate");
    assert.strictEqual(chapters.length, 1);
});

QUnit.test("getChapterUrls: Entire Work via account preference", async function (assert) {
    let parser = new ArchiveOfOurOwnParser();
    let requestedUrl = null;
    parser.fetchChapterUrls = async function (url) {
        requestedUrl = url;
        return [{sourceUrl: "https://archiveofourown.org/works/123456/chapters/1", title: "Chapter 1"}];
    };
    let dom = makeArchiveOfOurOwnWorkTestDom(
        "https://archiveofourown.org/works/123456", true, false);
    let chapters = await parser.getChapterUrls(dom, {});
    assert.strictEqual(requestedUrl, "https://archiveofourown.org/works/123456/navigate");
    assert.strictEqual(chapters.length, 1);
});

QUnit.test("getChapterUrls: normal chapter index remains supported", async function (assert) {
    let parser = new ArchiveOfOurOwnParser();
    let requestedUrl = null;
    parser.fetchChapterUrls = async function (url) {
        requestedUrl = url;
        return [{sourceUrl: "https://archiveofourown.org/works/123456/chapters/1", title: "Chapter 1"}];
    };
    let dom = makeArchiveOfOurOwnWorkTestDom(
        "https://archiveofourown.org/works/123456/chapters/1", true, true);
    let chapters = await parser.getChapterUrls(dom, {});
    assert.strictEqual(requestedUrl.href, "https://archiveofourown.org/works/123456/navigate");
    assert.strictEqual(chapters.length, 1);
});

QUnit.test("getChapterUrls: single-chapter works remain supported", async function (assert) {
    let parser = new ArchiveOfOurOwnParser();
    parser.fetchChapterUrls = function () {
        throw new Error("A one-shot should not request a chapter index");
    };
    parser.singleChapterStory = function () {
        return [{sourceUrl: "https://archiveofourown.org/works/123456", title: "One-shot"}];
    };
    let dom = makeArchiveOfOurOwnWorkTestDom(
        "https://archiveofourown.org/works/123456", false, false);
    let chapters = await parser.getChapterUrls(dom, {});
    assert.strictEqual(chapters.length, 1);
    assert.strictEqual(chapters[0].title, "One-shot");
});

QUnit.test("chapter URLs override full-work preference", function (assert) {
    let parser = new ArchiveOfOurOwnParser();
    let chapterUrl = parser.setViewAdultFlag(
        "https://archiveofourown.org/works/123456/chapters/1?view_full_work=true&foo=bar");
    let params = new URL(chapterUrl).searchParams;
    assert.strictEqual(params.get("view_full_work"), "false");
    assert.strictEqual(params.get("view_adult"), "true");
    assert.strictEqual(params.get("foo"), "bar");
});
