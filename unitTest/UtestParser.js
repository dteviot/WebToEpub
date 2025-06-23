
"use strict";

module("Parser");

QUnit.test("cleanWebPageUrls", function (assert) {
    let sample = [
        {sourceUrl: "http://dummy.com/page1.html"},
        {sourceUrl: "javascript:void(0)"},
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

QUnit.test("extractTitle", function (assert) {
    let doc = new DOMParser().parseFromString(
        "<html><head><title> Title 1 </title><meta property=\"og:title\" content=\" Title 3 \" /></head> " +
        "<body>" +
        "<div><span class=\"threadtitle\"> Title 2 </span></div><div></div>" +
        "</body></html>",
        "text/html"
    );
    let actual = new NrvnqsrParser().extractTitle(doc);
    assert.equal(actual, "Title 2");
    doc.querySelector("meta").remove();
    actual = new NovelUniverseParser().extractTitle(doc);
    assert.equal(actual, "Title 1");
});

QUnit.test("addTitleToContent-h1Element", function (assert) {
    let doc = document.implementation.createHTMLDocument("");
    let webPage = { rawDom: doc };
    let parser = new Parser();
    parser.findChapterTitle = function() {
        let e = webPage.rawDom.createElement("h1");
        e.textContent = "Title1";
        return e;
    }
    parser.addTitleToContent(webPage, doc.body);
    assert.equal(doc.body.innerHTML, "<h1>Title1</h1>");
});

QUnit.test("addTitleToContent-text", function (assert) {
    let doc = document.implementation.createHTMLDocument("");
    let webPage = { rawDom: doc };
    let parser = new Parser();
    parser.findChapterTitle = () => "Title2";
    parser.addTitleToContent(webPage, doc.body);
    assert.equal(doc.body.innerHTML, "<h1>Title2</h1>");
 });

 QUnit.test("extractLanguage", function (assert) {
    let dom = new DOMParser().parseFromString(
        "<html lang=\"cn\">"+
        "<head><title> Title 1 </title>"+
        "<meta property=\"og:locale\" content=\"fr\" /></head> " +
        "<body>" +
        "<h1></h1>" +
        "</body></html>",
        "text/html"
    );
    let parser = new Parser();
    assert.equal(parser.extractLanguage(dom), "fr");
    dom.querySelector("meta").remove();
    assert.equal(parser.extractLanguage(dom), "cn");
    dom.querySelector("html").removeAttribute("lang");
    assert.equal(parser.extractLanguage(dom), "en");
 });
