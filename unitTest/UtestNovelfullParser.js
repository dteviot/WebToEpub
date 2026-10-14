
"use strict";

module("NovelfullNetParser");

function novelfullNetTocDom(body) {
    return new DOMParser().parseFromString(
        `<html><head><base href="https://novelfull.net/an-alchemists-path-to-eternity.html"></head><body>${body}</body></html>`,
        "text/html"
    );
}

QUnit.test("current chapter list excludes latest chapter sidebar", function(assert) {
    let dom = novelfullNetTocDom(`
        <div class="m-newest1"><ul class="ul-list5"><li><a class="con" href="/book/chapter-1194.html">Latest</a></li></ul></div>
        <div id="list-chapter"><ul class="ul-list5">
        <li><a class="con" href="/book/chapter-1.html">Chapter 1</a></li>
        <li><a class="con" href="/book/chapter-2.html">Chapter 2</a></li>
        </ul></div>`);
    let chapters = new NovelfullNetParser().extractPartialChapterList(dom);
    assert.equal(chapters.length, 2);
    assert.equal(chapters[0].title, "Chapter 1");
    assert.equal(chapters[0].sourceUrl, "https://novelfull.net/book/chapter-1.html");
    assert.equal(chapters[1].title, "Chapter 2");
});

QUnit.test("legacy chapter list remains supported", function(assert) {
    let dom = novelfullNetTocDom(`<ul id="idData" class="ul-list5"><li><a class="con" href="/book/chapter-1.html">Chapter 1</a></li></ul>`);
    assert.equal(new NovelfullNetParser().extractPartialChapterList(dom).length, 1);
});

QUnit.test("pagination resolves URLs and skips selected or unsafe options", function(assert) {
    let dom = novelfullNetTocDom(`<select id="indexselect">
        <option selected data-url="/an-alchemists-path-to-eternity.html">1</option>
        <option data-url="/an-alchemists-path-to-eternity.html?page=2">2</option>
        <option data-url="https://novelfull.net/an-alchemists-path-to-eternity.html?page=30">30</option>
        <option>Missing URL</option><option data-url="https://example.com/book">External</option>
        </select>`);
    assert.deepEqual(new NovelfullNetParser().getUrlsOfTocPages(dom), [
        "https://novelfull.net/an-alchemists-path-to-eternity.html?page=2",
        "https://novelfull.net/an-alchemists-path-to-eternity.html?page=30"
    ]);
    assert.deepEqual(new NovelfullNetParser().getUrlsOfTocPages(novelfullNetTocDom("")), []);
});

QUnit.test("metadata uses current author and summary markup", function(assert) {
    let dom = novelfullNetTocDom(`<h1 class="tit">An Alchemist's Path to Eternity</h1>
        <div class="item"><span title="Author"></span><div class="right"><a class="a1"> The Rain Keeps Falling </a><a class="a1">雨去欲续</a></div></div>
        <div class="item"><span title="Genre"></span><div class="right"><a>Fantasy</a><a>Action</a></div></div>
        <div id="novel-summary-inner" class="inner"><p> First paragraph. </p><p>Second paragraph.</p></div>`);
    let parser = new NovelfullNetParser();
    assert.equal(parser.extractTitleImpl(dom).textContent, "An Alchemist's Path to Eternity");
    assert.equal(parser.extractAuthor(dom), "The Rain Keeps Falling");
    assert.equal(parser.extractSubject(dom), "Fantasy, Action");
    assert.equal(parser.extractDescription(dom), "First paragraph.\n\nSecond paragraph.");
    assert.equal(parser.extractSubject(novelfullNetTocDom("")), "");
    assert.equal(parser.extractDescription(novelfullNetTocDom("")), "");
});

QUnit.test("all TOC pages are fetched with progress updates", async function(assert) {
    let dom = novelfullNetTocDom(`<div id="list-chapter"><ul class="ul-list5"><li><a class="con" href="/book/chapter-1.html">Chapter 1</a></li></ul></div>
        <select id="indexselect"><option selected data-url="/book.html">1</option><option data-url="/book.html?page=2">2</option></select>`);
    let parser = new NovelfullNetParser();
    let originalFetch = HttpClient.wrapFetch;
    let progress = [];
    parser.rateLimitDelay = async () => {};
    HttpClient.wrapFetch = async url => {
        assert.equal(url, "https://novelfull.net/book.html?page=2");
        return {responseXML: novelfullNetTocDom(`<div id="list-chapter"><ul class="ul-list5"><li><a class="con" href="/book/chapter-2.html">Chapter 2</a></li></ul></div>`)};
    };
    try {
        let chapters = await parser.getChapterUrls(dom, {showTocProgress: list => progress.push(list.length)});
        assert.deepEqual(chapters.map(chapter => chapter.title), ["Chapter 1", "Chapter 2"]);
        assert.deepEqual(progress, [1, 1]);
    } finally {
        HttpClient.wrapFetch = originalFetch;
    }
});

QUnit.test("information page includes author genres summary and source URL", function(assert) {
    let dom = novelfullNetTocDom(`<div class="m-book1"><div class="txt">
        <div class="item"><span title="Author"></span><a class="a1">The Rain Keeps Falling</a></div>
        <div class="item"><span title="Genre"></span><a>Fantasy</a></div></div></div>
        <div id="novel-summary-inner"><p>Book synopsis.</p></div><script>unwanted()</script>`);
    let parser = new NovelfullNetParser();
    parser.state.chapterListUrl = dom.baseURI;
    let info = parser.makeInformationEpubItem(dom);
    let text = info.nodes.map(node => node.textContent).join(" ");
    assert.ok(text.includes("The Rain Keeps Falling"));
    assert.ok(text.includes("Fantasy"));
    assert.ok(text.includes("Book synopsis."));
    assert.ok(text.includes(dom.baseURI));
    assert.ok(!text.includes("unwanted()"));
});

QUnit.test("chapter heading and story content survive EPUB conversion", function(assert) {
    let dom = novelfullNetTocDom(`<h1 class="chapter"><span class="chapter-heading-text">Chapter 1: Rogue Cultivator Luo Chen</span></h1>
        <nav>Next chapter</nav><div id="chapter-content"><p>Story paragraph.</p><script>unwanted()</script></div>`);
    let parser = new NovelfullNetParser();
    parser.onUserPreferencesUpdate(new UserPreferences());
    let page = {rawDom: dom, sourceUrl: dom.baseURI, title: "Chapter 1: Rogue Cultivator Luo Chen", nextPrevChapters: new Set()};
    let content = parser.convertRawDomToContent(page);
    assert.equal(content.querySelector("h1").textContent, page.title);
    assert.ok(content.textContent.includes("Story paragraph."));
    assert.ok(!content.textContent.includes("Next chapter"));
    assert.equal(content.querySelectorAll("script").length, 0);
});

module("NovelfullParser");

QUnit.test("findWatermark", function (assert) {
    let dom = new DOMParser().parseFromString(NovelfullSample, "text/html");
    let parser = new NovelfullParser();
    let watermark = parser.findWatermark(dom);
    assert.equal(watermark, "n/ô/vel/b//jn dot c//om");
});

QUnit.test("tagWatermark", function (assert) {
    let dom = new DOMParser().parseFromString(NovelfullSample, "text/html");
    let parser = new NovelfullParser();
    parser.tagWatermark(dom);
    let paragraph = dom.querySelector("#watermarked");
    let span = paragraph.querySelector("span");
    assert.equal(span.innerHTML, "n/ô/vel/b//jn dot c//om");
    assert.equal(paragraph.childNodes[0].nodeValue, " Yuan found their wording quite weird, but who was he to judge their world? ");
});

let NovelfullSample =
`<!DOCTYPE html>
<html lang="en">
<head>
    <title>Cultivation Online #Chapter 1596  Primal Expanse - Read Cultivation Online Chapter 1596  Primal Expanse Online - All Page - Novel Bin</title>
</head>

<body>

                        <div id="chr-content">
                            <div id="pf-10311-1">
                            <script>window.pubfuturetag = window.pubfuturetag || [];window.pubfuturetag.push({unit: "66b4e3c40939a022784366eb", id: "pf-10311-1"})</script></div>
                            <div></div>

                            <h3>Chapter 1596 &nbsp;Primal Expanse</h3>  <p> </p><p> After taking a moment to digest the possibility that they had been transported to another world outside the Nine Heavens, Yuan turned to look at the mysterious naked little girl and asked, "Do you mind telling us a little about the Primal Expanse?" </p><div id="pf-10364-1">
                            <script>window.pubfuturetag = window.pubfuturetag || [];window.pubfuturetag.push({unit: "66b9b2575d6f5a59dab6ff6d", id: "pf-10364-1"})</script></div><p id="watermarked"> Yuan found their wording quite weird, but who was he to judge their world? n/ô/vel/b//jn dot c//om</p><p> "Primal and Predators, right? I will remember that." </p>
                            <div id="pf-10366-1">
                            <script>window.pubfuturetag = window.pubfuturetag || [];window.pubfuturetag.push({unit: "66b9b27899ef0d23774745cd", id: "pf-10366-1"})</script></div>
                        </div>

                                <script>
                                setTimeout(function () {

                                    const paragraphss = $("p");

                                    paragraphss.each(function () {
                                        const original11Content = $(this).html();
                                        const updated11Content = original11Content.replace("n/ô/vel/b//jn dot c//om", \`<span id="span">n/ô/vel/b//jn dot c//om</span>\`);
                                        $(this).html(updated11Content);
                                    });
                                }, 600000);

                                </script>                        
</body>
</html>`

module("NovelpingParser");

QUnit.test("novelpingUsesNovelpingParser", function (assert) {
    let parser = parserFactory.fetch("https://novelping.com/novel/shadow-slave");
    assert.ok(parser instanceof NovelpingParser);
});

QUnit.test("novelSlug", function (assert) {
    assert.equal(NovelpingParser.novelSlug("https://novelping.com/novel/shadow-slave"), "shadow-slave");
    assert.equal(NovelpingParser.novelSlug("https://novelping.com/book/shadow-slave/"), "shadow-slave");
    assert.equal(NovelpingParser.novelSlug("https://novelping.com/book/shadow-slave/chapter-2-slave-caravan"), "shadow-slave");
});

QUnit.test("extractPartialChapterList", function (assert) {
    let dom = new DOMParser().parseFromString(NovelpingChapterArchiveSample, "text/html");
    let chapters = new NovelpingParser().extractPartialChapterList(dom);
    assert.deepEqual(chapters, [
        {
            sourceUrl: "https://novelping.com/book/shadow-slave/chapter-1-nightmare-begins",
            title: "Chapter 1 Nightmare Begins",
            newArc: null
        },
        {
            sourceUrl: "https://novelping.com/book/shadow-slave/chapter-4-mountain-king",
            title: "Chapter 4 Mountain King",
            newArc: null
        }
    ]);
});

QUnit.test("removeAdSlots", function (assert) {
    let dom = new DOMParser().parseFromString(NovelpingChapterSample, "text/html");
    let parser = new NovelpingParser();
    let content = parser.findContent(dom);
    parser.removeUnwantedElementsFromContentElement(content);
    assert.equal(content.querySelectorAll(".js-ad-slot").length, 0);
    assert.equal(content.querySelectorAll("p").length, 2);
});

let NovelpingChapterArchiveSample =
`<html>
<head></head>
<body>
    <div class="panel panel-default chapter-archive-panel">
        <div class="panel-collapse collapse in">
            <div class="panel-body">
                <div class="chapter-archive-grid" data-chapter-archive-grid></div>
                <template data-chapter-item-template>
                    <li data-chapter-item class="chapter-list-item">
                        <span class="glyphicon glyphicon-certificate chapter-list-bullet"></span>
                        <a href="https://novelping.com/book/shadow-slave/chapter-1-nightmare-begins" title="Chapter 1 Nightmare Begins">
                            <span class="nchr-text chapter-title">Chapter 1 Nightmare Begins</span>
                            <span class="chapter-comment-count" title="17 comments">
                                <span class="glyphicon glyphicon-comment"></span>
                                17
                            </span>
                        </a>
                    </li>                    <li data-chapter-item class="chapter-list-item">
                        <span class="glyphicon glyphicon-certificate chapter-list-bullet"></span>
                        <a href="https://novelping.com/book/shadow-slave/chapter-4-mountain-king" title="Chapter 4 Mountain King">
                            <span class="nchr-text chapter-title">Chapter 4 Mountain King</span>
                        </a>
                    </li>
                </template>
            </div>
        </div>
    </div>
</body>
</html>`;

let NovelpingChapterSample =
`<!DOCTYPE html>
<html lang="en">
<head>
    <title>Shadow Slave - Chapter 1 Nightmare Begins</title>
</head>
<body>
    <h2><a class="chr-title" href="https://novelping.com/book/shadow-slave/chapter-1-nightmare-begins" title="Chapter 1 Nightmare Begins"><span class="chr-text"> Chapter 1 Nightmare Begins</span></a></h2>
    <div id="chr-content" class="chr-c" data-chapter-id="chapter-1-nightmare-begins">
        <div class="js-ad-slot" data-ad-slot="chapter-top">
        </div>
        <p> A frail-looking young man with pale skin and dark circles under his eyes was sitting on a rusty bench across from the police station. </p><p> After all, his life was coming to an end. </p>
        <div class="js-ad-slot" data-ad-slot="chapter-bottom">
        </div>
    </div>
</body>
</html>`;
