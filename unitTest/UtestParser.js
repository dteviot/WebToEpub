
"use strict";

module("Parser");

QUnit.test("cleanWebPageUrls", function (assert) {
    let sample = [
        {sourceUrl: "http://dummy.com/page1.html"},
        {sourceUrl: "https://imgur.com/a123bgh1"},
        {sourceUrl: "http://dummy.com/page1.html"},
        {sourceUrl: "https://imgur.com/a123bgh1?grid"},
    ];
    let expected = [
        {sourceUrl: "http://dummy.com/page1.html"},
        {sourceUrl: "https://imgur.com/a123bgh1?grid"}
    ];
    let actual = new Parser().cleanWebPageUrls(sample);
    assert.deepEqual(actual, expected);
});

QUnit.test("setPagesToFetch", function (assert) {
    let urlsToFetch = [
        {sourceUrl: "http://dummy.com/page1.html"},
        {sourceUrl: "https://imgur.com/page2.html/"},
        {sourceUrl: "https://dummy.com/page3.html"},
    ];
    let state = new ParserState();
    state.setPagesToFetch(urlsToFetch);

    // convert next/previous links into array to make
    // verification easy
    let nextPrev = [];
    for(let page of state.webPages.values()) {
        for(let link of page.nextPrevChapters) {
            nextPrev.push(link);
        }
    }

    assert.deepEqual(nextPrev, [
        "imgur.com/page2.html",
        "dummy.com/page1.html",
        "dummy.com/page3.html",
        "imgur.com/page2.html"
    ]);
});

function makeEpubItemsToTestResolvingHyperlinks() {
    let epubItems = [];
    let dom = new DOMParser().parseFromString(
        "<head><title></title><base href=\"https://www.baka-tsuki.org/project/index.php?title=Fate/Zero:Prologue_1\" /></head> " +
        "<body>" +
        "<sup class=\"footnote\"><a href=\"#fn-3352-1\" id=\"fnref-3352-1\">2</a></sup>" +     // already OK 
        "<span class=\"mw-cite-backlink\"><a href=\"../Text/0010_Part_2.xhtml#cite_ref-2\"></a></span>" +  // already OK 
        "<span id=\"homunculus\"><a href=\"/project/index.php?title=Fate/Zero:Translator%27s_Notes#homunculus\" title=\"Fate/Zero:Translator's Notes\">homunculus</a></span>" +  // to fix 
        "<li id=\"fn-3352-1\"> I had the urge to type Truck-kun <span class=\"footnotereverse\"><a href=\"#fnref-3352-1\">↩</a></span>" + // already OK 
        "</body>",
        "text/html"
    );
    epubItems.push(new ChapterEpubItem(
        {sourceUrl: "https://www.baka-tsuki.org/project/index.php?title=Fate/Zero:Prologue_1", title: "Prolog", newArc: null },
        dom.body,
        0
    ));
    dom = new DOMParser().parseFromString(
        "<head><title></title><base href=\"https://www.baka-tsuki.org/project/index.php?title=Fate/Zero:Translator%27s_Notes\" /></head> " +
        "<body>" +
        "<span class=\"mw-headline\" id=\"homunculus\">Homunculus</span>" +
        "<a href=\"/project/index.php?title=Fate/Zero:Prologue_1#homunculus\" title=\"Fate/Zero:Prologue 1\">Return to Text</a>" +     // to fix 
        "<a href=\"/project/index.php?title=Fate/Zero:Prologue_1\" title=\"Fate/Zero:Prologue 1\">Return to Text</a>" +     // to fix 
        "<a href=\"/project/index.php?title=Fate/Zero:AuthorNotes\" title=\"Fate/Zero:Prologue 1\">Return to Text</a>" +     // can't fix
        "</body>",
        "text/html"
    );
    epubItems.push(new ChapterEpubItem(
        {sourceUrl: "https://www.baka-tsuki.org/project/index.php?title=Fate/Zero:Translator%27s_Notes", title: "Notes", newArc: null },
        dom.body,
        1
    ));
    return epubItems;
}

QUnit.test("sourceUrlToEpubItemUrl", function (assert) {
    let epubItems = makeEpubItemsToTestResolvingHyperlinks();
    let targets = new Parser().sourceUrlToEpubItemUrl(epubItems);
    assert.equal(targets.size, 2);
    assert.equal(targets.get("www.baka-tsuki.org/project/index.php?title=Fate/Zero:Prologue_1"), "../Text/0000_Prolog.xhtml");
    assert.equal(targets.get("www.baka-tsuki.org/project/index.php?title=Fate/Zero:Translator%27s_Notes"), "../Text/0001_Notes.xhtml");
});

QUnit.test("isUnresolvedHyperlink", function (assert) {
    let parser = new Parser();
    let link = document.createElement("a");
    link.href = "../Text/0010_Part_2.xhtml";
    assert.notOk(parser.isUnresolvedHyperlink(link));
    link.href = "#cite_ref-2";
    assert.notOk(parser.isUnresolvedHyperlink(link));
    link.href = "https://www.baka-tsuki.org/project/index.php?title=Fate/Zero:Translator%27s_Notes";
    assert.ok(parser.isUnresolvedHyperlink(link));
});

QUnit.test("fixupHyperlinksInEpubItems", function (assert) {
    let epubItems = makeEpubItemsToTestResolvingHyperlinks();
    new Parser().fixupHyperlinksInEpubItems(epubItems);
    let links = epubItems[1].getHyperlinks();
    assert.equal(links.length, 3);
    assert.equal(links[0].getAttribute("href"), "../Text/0000_Prolog.xhtml#homunculus");
    assert.equal(links[1].getAttribute("href"), "../Text/0000_Prolog.xhtml");
    assert.equal(links[2].getAttribute("href"), "https://www.baka-tsuki.org/project/index.php?title=Fate/Zero:AuthorNotes");
    links = epubItems[0].getHyperlinks();
    assert.equal(links.length, 4);
    assert.equal(links[0].getAttribute("href"), "#fn-3352-1");
    assert.equal(links[1].getAttribute("href"), "../Text/0010_Part_2.xhtml#cite_ref-2");
    assert.equal(links[2].getAttribute("href"), "../Text/0001_Notes.xhtml#homunculus");
    assert.equal(links[3].getAttribute("href"), "#fnref-3352-1");
});

QUnit.test("groupPagesToFetchSize1", function (assert) {
    let rawData = [1, 2, 3];
    let actual = Parser.groupPagesToFetch(rawData, 1);
    assert.deepEqual(actual, [[1], [2], [3]]);
});

QUnit.test("groupPagesToFetchSize2", function (assert) {
    let rawData = [1, 2, 3, 4, 5];
    let actual = Parser.groupPagesToFetch(rawData, 2);
    assert.deepEqual(actual, [[1,2],[3,4],[5]]);
});

QUnit.test("groupPagesToFetchSize3", function (assert) {
    let rawData = [1, 2, 3, 4, 5, 6];
    let actual = Parser.groupPagesToFetch(rawData, 3);
    assert.deepEqual(actual, [[1,2,3],[4,5,6]]);
});
