
"use strict";

module("UtestGravityTalesParser");

test("splitAtEquals", function (assert) {
    let actual = GravityTalesParser.splitAtEquals("novelId = 7");
    assert.deepEqual(actual, ["novelId", "7"]);
});

test("getNovelId", function (assert) {
    let dom = new DOMParser().parseFromString(
        "<html><head><title></title></head><body>" +
                "<div id=\"contentElement\" ng-controller=\"Novel\" ng-init=\"novelId = 7; isFollowingNovel = false" +
                "init-hashscroll before-scroll=\"setReviewPageFromHash('/Novels/GetNovelReviewPage')\"></div>" +
        "</body></html>",
        "text/html");
    
    let actual = GravityTalesParser.getNovelId(dom);
    assert.equal(actual, 7);

    dom = new DOMParser().parseFromString(
        "<html><head><title></title></head><body>" +
        "</body></html>",
        "text/html");
    actual = GravityTalesParser.getNovelId(dom);
    assert.equal(actual, null);
});

let expectedChapterLists = [
    {
        groupTitle: "Group 1", 
        chapters: [ {Name:"ch1", Slug:"c01"}, {Name:"ch2", Slug:"c02"} ]
    },
    {
        groupTitle: "Group 2", 
        chapters: [ {Name:"ch2", Slug:"c02"}, {Name:"ch3", Slug:"c03"} ]
    }
];

let baseUri = "http://dummy.com";

let expectedFinalChapters = [
    {sourceUrl: "http://dummy.com/c01", title: "ch1", newArc: "Group 1"},
    {sourceUrl: "http://dummy.com/c02", title: "ch2", newArc: null},
    {sourceUrl: "http://dummy.com/c03", title: "ch3", newArc: "Group 2"}
];

test("mergeChapterLists", function (assert) {
    let actual = GravityTalesParser.mergeChapterLists(expectedChapterLists, baseUri);
    assert.deepEqual(actual, expectedFinalChapters);
});

function fetchJsonStub(url) {
    let lookup = new Map();
    lookup.set("https://gravitytales.com/Novels/GetChapterGroups/1", [{ChapterGroupId:1, Title:"Group 1"},{ChapterGroupId:2,Title:"Group 2"}]);
    lookup.set("https://gravitytales.com/Novels/GetNovelChapters/1?groupId=1&page=0&count=25", {Chapters: expectedChapterLists[0].chapters});
    lookup.set("https://gravitytales.com/Novels/GetNovelChapters/1?groupId=2&page=0&count=25", {Chapters: expectedChapterLists[1].chapters});
    return Promise.resolve(lookup.get(url));
}

test("fetchChapterListForGroup", function (assert) {
    let done = assert.async(); 
    let chapterGroup = {ChapterGroupId:1, Title:"Group 1"};
    GravityTalesParser.fetchChapterListForGroup(1, chapterGroup, fetchJsonStub).then(
        function(actual) {
            assert.deepEqual(actual, expectedChapterLists[0]); 
            done();
        }
    );
});

test("fetchUrlsOfChapters", function (assert) {
    let done = assert.async(); 
    GravityTalesParser.fetchUrlsOfChapters(1, baseUri, fetchJsonStub).then(
        function(actual) {
            assert.deepEqual(actual, expectedFinalChapters); 
            done();
        }
    );
});
