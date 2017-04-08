
"use strict";

module("UtestGravityTalesParser");

test("splitAtEquals", function (assert) {
    let actual = GravityTalesParser.splitAtEquals("novelId = 7");
    assert.deepEqual(actual, ["novelId", "7"]);
});

test("getNovelId", function (assert) {
    let dom = TestUtils.makeDomWithBody(
        "<div id=\"contentElement\" ng-controller=\"Novel\" ng-init=\"novelId = 7; isFollowingNovel = false" +
        "init-hashscroll before-scroll=\"setReviewPageFromHash('/Novels/GetNovelReviewPage')\"></div>"
    );
    
    let actual = GravityTalesParser.getNovelId(dom);
    assert.equal(actual, 7);

    dom = TestUtils.makeDomWithBody("");
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
    lookup.set("https://gravitytales.com/api/novels/chaptergroups/1", [{ChapterGroupId:1, Title:"Group 1"},{ChapterGroupId:2,Title:"Group 2"}]);
    lookup.set("https://gravitytales.com/api/novels/chaptergroup/1", expectedChapterLists[0].chapters);
    lookup.set("https://gravitytales.com/api/novels/chaptergroup/2", expectedChapterLists[1].chapters);
    return Promise.resolve({ json: lookup.get(url) });
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

test("searchForNovelIdinString_idNotPresent", function (assert) {
    let actual = GravityTalesParser.searchForNovelIdinString("");
    assert.equal(actual, null);
});

test("searchForNovelIdinString_idPresent", function (assert) {
    let actual = GravityTalesParser.searchForNovelIdinString("{ dummy: {a: 0, novelId: 8} }");
    assert.equal(actual, 8);
});

test("searchForNovelIdinString_idPresent", function (assert) {
    let actual = GravityTalesParser.searchForNovelIdinString("{ dummy: {a: 0, novelId: 6, b:{}} }");
    assert.equal(actual, 6);
});

test("searchForNovelIdinScriptTags_idNotPresent", function (assert) {
    let dom = TestUtils.makeDomWithBody(
        "<script src=\"/Scripts/react-bootstrap.min.js\"></script>" +
        "<script>ReactDOM.render(React.createElement(Components.DonationWidget, {\"novelName\":\"I’m Really a Superstar\",\"novelAbbreviation\":\"IRAS\",\"novelId\":8,\"amountDonated\":8,\"costPerChapter\":70,\"paypalEmail\":\"mysubs2015@gmail.com\",\"novelAuthor\":\"CKtalon\",\"sponsoredQueue\":0,\"userId\":null,\"widgetTitleClass\":\"widget-title\"}), document.getElementById(\"donations_8\"));</script>"
    );
    let actual = GravityTalesParser.searchForNovelIdinScriptTags(dom);
    assert.equal(actual, null);
});

test("searchForNovelIdinScriptTags_idPresent", function (assert) {
    let dom = TestUtils.makeDomWithBody(
        "<script src=\"/Scripts/react-bootstrap.min.js\"></script>" +
        "<script>ReactDOM.render(React.createElement(Components.ChapterGroupList, { novelId: 8, novelSlug: 'im-really-a-superstar' }), document.getElementById(\"chapters\"))</script>"
    );
    let actual = GravityTalesParser.searchForNovelIdinScriptTags(dom);
    assert.equal(actual, 8);
});
