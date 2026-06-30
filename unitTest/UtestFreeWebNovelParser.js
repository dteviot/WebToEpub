"use strict";

module("FreeWebNovelParser");

QUnit.test("extractTitleImpl", function (assert) {
    let dom = new DOMParser().parseFromString(FreeWebNovelNovelSample, "text/html");
    let parser = new FreeWebNovelParser();
    let title = parser.extractTitle(dom);
    assert.equal(title, "All Jobs and Classes! I Just Wanted One Skill, Not Them All!");
});

QUnit.test("extractAuthor", function (assert) {
    let dom = new DOMParser().parseFromString(FreeWebNovelNovelSample, "text/html");
    let parser = new FreeWebNovelParser();
    let author = parser.extractAuthor(dom);
    assert.equal(author, "Comedian0");
});

QUnit.test("extractSubject", function (assert) {
    let dom = new DOMParser().parseFromString(FreeWebNovelNovelSample, "text/html");
    let parser = new FreeWebNovelParser();
    let subject = parser.extractSubject(dom);
    assert.equal(subject, "Action, Adventure, Comedy");
});

QUnit.test("findCoverImageUrl", function (assert) {
    let dom = new DOMParser().parseFromString(FreeWebNovelNovelSample, "text/html");
    let parser = new FreeWebNovelParser();
    let cover = parser.findCoverImageUrl(dom);
    assert.equal(cover, "https://freewebnovel.com/files/article/image/14/14511/14511s.jpg");
});

QUnit.test("getChapterUrls first page", async function (assert) {
    let dom = new DOMParser().parseFromString(FreeWebNovelNovelSample, "text/html");
    let parser = new FreeWebNovelParser();
    let base = dom.createElement("base");
    base.href = "https://freewebnovel.com/novel/all-jobs-and-classes-i-just-wanted-one-skill-not-them-all";
    dom.head.appendChild(base);

    let chapterUrlsUI = {
        showTocProgress: function() {}
    };

    let chapters = await parser.getChapterUrls(dom, chapterUrlsUI);
    assert.equal(chapters.length, 2);
    assert.equal(chapters[0].newTitle, "Chapter 01");
    assert.equal(chapters[0].newUrl, "https://freewebnovel.com/novel/all-jobs-and-classes-i-just-wanted-one-skill-not-them-all/chapter-1");
});

QUnit.test("findChapterTitle", function (assert) {
    let dom = new DOMParser().parseFromString(FreeWebNovelChapterSample, "text/html");
    let parser = new FreeWebNovelParser();
    let titleEl = parser.findChapterTitle(dom);
    assert.equal(titleEl.textContent.trim(), "Chapter 01");
});

QUnit.test("findContent and clean", function (assert) {
    let dom = new DOMParser().parseFromString(FreeWebNovelChapterSample, "text/html");
    let parser = new FreeWebNovelComParser();
    let content = parser.findContent(dom);
    assert.ok(content !== null, "Content found");
    parser.removeUnwantedElementsFromContentElement(content);
    
    assert.equal(content.querySelector("div[id^='bg-ssp-']"), null, "Ads removed");
    assert.equal(content.querySelector("div[id^='pf-']"), null, "PubFuture ads removed");
    
    let paragraphs = [...content.querySelectorAll("p")];
    let watermarkFound = paragraphs.some(p => p.textContent.includes("This story originates from"));
    assert.notOk(watermarkFound, "Watermark paragraph removed");
    
    // Check that embedded watermarks (with math alphanumeric characters and standard ASCII) are removed
    assert.equal(paragraphs[0].textContent.trim(), "It started with the kind of  cold that crawls under your nails and refuses to leave.");
    assert.equal(paragraphs[1].textContent.trim(), "Screams. The thunder of  crumpling steel.");
});

QUnit.test("convert literal HTML tags", function (assert) {
    let dom = new DOMParser().parseFromString("<div><p>&lt;strong&gt;[Name: Aster Nilm&lt;/strong&gt;</p></div>", "text/html");
    let parser = new FreeWebNovelParser();
    let content = dom.querySelector("div");
    parser.removeUnwantedElementsFromContentElement(content);
    
    let strong = content.querySelector("strong");
    assert.ok(strong !== null, "Strong element parsed");
    assert.equal(strong.textContent, "[Name: Aster Nilm");
});

let FreeWebNovelNovelSample = `
<!DOCTYPE html>
<html>
<head>
    <meta property="og:url" content="https://freewebnovel.com/novel/all-jobs-and-classes-i-just-wanted-one-skill-not-them-all">
</head>
<body>
    <div class="m-imgtxt">
        <div class="pic">
            <img src="/files/article/image/14/14511/14511s.jpg">
        </div>
        <div class="txt">
            <div class="item">
                <span class="glyphicon glyphicon-user" title="Author"></span>
                <div class="right"><a href="/author/Comedian0">Comedian0</a></div>
            </div>
            <div class="item">
                <span class="glyphicon glyphicon-th-list" title="Genre"></span>
                <div class="right">
                    <a href="/genre/Action">Action</a>, <a href="/genre/Adventure">Adventure</a>, <a href="/genre/Comedy">Comedy</a>
                </div>
            </div>
        </div>
    </div>
    <div class="m-desc">
        <h1 class="tit">All Jobs and Classes! I Just Wanted One Skill, Not Them All!</h1>
    </div>
    <ul class="ul-list5" id="idData">
        <li><a href="/novel/all-jobs-and-classes-i-just-wanted-one-skill-not-them-all/chapter-1" title="Chapter 01">Chapter 01</a></li>
        <li><a href="/novel/all-jobs-and-classes-i-just-wanted-one-skill-not-them-all/chapter-2" title="Chapter 02">Chapter 02</a></li>
    </ul>
</body>
</html>
`;

let FreeWebNovelChapterSample = `
<!DOCTYPE html>
<html>
<body>
    <span class="chapter">Chapter 01</span>
    <div class="txt ">
        <div id="article">
            <div id="pf-1558-1">ad script</div>
            <p>It started with the kind of <b>𝘧𝑟𝑒𝑒𝘸𝘦𝘣𝑛𝑜𝘷𝑒𝓁.𝘤𝘰𝓂</b> cold that crawls under your nails and refuses to leave.</p>
            <div id="bg-ssp-6327">ad banner</div>
            <p>This story originates from a different website. Ensure the author gets the support they deserve by reading it there.</p>
            <p>Screams. The thunder of reewebnovel.com crumpling steel.</p>
        </div>
    </div>
</body>
</html>
`;
