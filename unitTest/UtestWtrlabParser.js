"use strict";

module("WtrlabParser");

QUnit.test("extractAuthor - standard two-link author block", function (assert) {
    let html = `
    <div>
        <div class="grid grid-cols-[108px_1fr] items-center gap-x-2.5 px-3.5 py-[9px] border-b border-border last:border-b-0 even:bg-black/[0.016] dark:even:bg-white/[0.022] max-[400px]:grid-cols-1 max-[400px]:gap-0.5 max-[400px]:px-3 max-[400px]:py-2">
            <span class="text-[10.5px] font-bold uppercase tracking-[0.07em] whitespace-nowrap pt-px leading-6 text-muted-foreground">Author</span>
            <div class="text-[13px] leading-relaxed wrap-break-word [&amp;_a]:no-underline [&amp;_a]:font-semibold [&amp;_a:hover]:text-primary flex flex-col gap-px">
                <a href="/en/author/%E9%81%93%E5%B0%8F%E6%98%93">道小易</a>
                <a class="text-xs opacity-65" href="/en/author/%E9%81%93%E5%B0%8F%E6%98%93">Dao Xiao Yi</a>
            </div>
        </div>
    </div>
    `;
    let dom = new DOMParser().parseFromString(html, "text/html");
    let parser = new WtrlabParser();
    let author = parser.extractAuthor(dom);
    assert.equal(author, "道小易 - Dao Xiao Yi");
});

QUnit.test("extractAuthor - single link author block", function (assert) {
    let html = `
    <div>
        <div>
            <span>Author</span>
            <div>
                <a href="/en/author/%E9%81%93%E5%B0%8F%E6%98%93">道小易</a>
            </div>
        </div>
    </div>
    `;
    let dom = new DOMParser().parseFromString(html, "text/html");
    let parser = new WtrlabParser();
    let author = parser.extractAuthor(dom);
    assert.equal(author, "道小易");
});

QUnit.test("extractAuthor - fallback to unknown", function (assert) {
    let html = `
    <div>
        <div>
            <span>Other Field</span>
            <div>
                <a>Someone</a>
            </div>
        </div>
    </div>
    `;
    let dom = new DOMParser().parseFromString(html, "text/html");
    let parser = new WtrlabParser();
    let author = parser.extractAuthor(dom);
    assert.equal(author, "<unknown>");
});

QUnit.test("parseNovelUrl - novel page and chapter page", function (assert) {
    let novel = "https://wtr-lab.com/en/novel/75471/dual-transmigration-cultivating-in-another-world-enjoying-life-in-america";
    let book = WtrlabParser.parseNovelUrl(novel + "?from=reader");
    assert.equal(book.id, "75471");
    assert.equal(book.language, "en");
    assert.equal(book.slug, "dual-transmigration-cultivating-in-another-world-enjoying-life-in-america");
    assert.notOk(book.chapter);

    let chapter = WtrlabParser.parseNovelUrl(
        "https://wtr-lab.com/en/novel/71157/i-have-a-cultivation-simulator/chapter-31?service=ai");
    assert.equal(chapter.slug, "i-have-a-cultivation-simulator", "slug must not become chapter-31");
    assert.equal(chapter.chapter, "31");
    assert.throws(() => WtrlabParser.parseNovelUrl("https://wtr-lab.com/en/novel/75471"),
        /Invalid WTR-Lab novel URL/);
});

QUnit.test("validateChapterContent - verification and malformed responses", function (assert) {
    let url = "https://wtr-lab.com/en/novel/71157/i-have-a-cultivation-simulator/chapter-31";
    WtrlabParser.validateChapterContent({data: {data: {body: ["Text"]}}}, url);
    assert.throws(() => WtrlabParser.validateChapterContent({requireTurnstile: true}, url),
        /complete the CAPTCHA/);
    assert.throws(() => WtrlabParser.validateChapterContent({code: 1401}, url),
        /requires verification/);
    assert.throws(() => WtrlabParser.validateChapterContent({data: {}}, url),
        /no readable chapter body/);
});

QUnit.test("getChapterUrls - chapter page uses novel slug", function (assert) {
    let done = assert.async();
    let originalWrapFetch = HttpClient.wrapFetch;
    let originalFetchJson = HttpClient.fetchJson;
    let fixture = document.getElementById("qunit-fixture");
    fixture.innerHTML = '<input type="checkbox" id="removeChapterNumberCheckbox">';
    let inputUrl = "https://wtr-lab.com/en/novel/75471/dual-transmigration-cultivating-in-another-world-enjoying-life-in-america/chapter-12";
    HttpClient.wrapFetch = () => Promise.resolve({responseXML: {
        baseURI: inputUrl,
        querySelector: () => ({textContent: '{"buildId":"test"}'})
    }});
    HttpClient.fetchJson = (url) => {
        if (url.includes("/api/chapters/")) {
            return Promise.resolve({json: {chapters: [{order: 1, title: "Beginning", serie_id: 7}]}});
        }
        if (url.includes("/user/config")) {
            return Promise.resolve({json: {config: {terms: []}}});
        }
        return Promise.resolve({json: {glossaries: []}});
    };
    let parser = new WtrlabParser();
    parser.getChapterUrls({baseURI: inputUrl}).then((chapters) => {
        assert.equal(chapters.length, 1);
        assert.equal(chapters[0].sourceUrl,
            "https://wtr-lab.com/en/novel/75471/dual-transmigration-cultivating-in-another-world-enjoying-life-in-america/chapter-1");
        assert.equal(parser.slug, "dual-transmigration-cultivating-in-another-world-enjoying-life-in-america");
    }).catch((error) => {
        assert.ok(false, error.message);
    }).then(() => {
        HttpClient.wrapFetch = originalWrapFetch;
        HttpClient.fetchJson = originalFetchJson;
        done();
    });
});
