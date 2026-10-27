
"use strict";

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
