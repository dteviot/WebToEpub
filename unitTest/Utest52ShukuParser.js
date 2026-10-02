"use strict";

module("52ShukuParser");

test("find chapter title", function (assert) {
    const dom = new DOMParser().parseFromString(Shuku52ChapterSample, "text/html");
    const parser = new Shuku52Parser();

    const title = parser.findChapterTitle(dom);

    assert.ok(title);
    assert.equal(title.textContent.trim(), "第001章 家双儿");
});

test("find content", function (assert) {
    const dom = new DOMParser().parseFromString(Shuku52ChapterSample, "text/html");
    const parser = new Shuku52Parser();

    const content = parser.findContent(dom);

    assert.ok(content);
    assert.ok(content.textContent.includes("第001章 家双儿"));
    assert.ok(content.textContent.includes("东木皇朝，庆云城。"));
});

let Shuku52ChapterSample =
`<!DOCTYPE html>
<html>
<body>
<article id="nr1" class="article-content">
    <p>站点说明</p>
    <p>作品简介</p>
    <h1>第001章 家双儿</h1>
    <p>东木皇朝，庆云城。</p>
    <p>第一次知道这情况时风鸣可被激得起了一身鸡皮疙瘩。</p>
</article>
</body>
</html>`;
